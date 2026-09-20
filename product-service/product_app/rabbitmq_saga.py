import pika
import json
import logging
import os
import threading
import time
from django.db import transaction, close_old_connections

logger = logging.getLogger(__name__)

def get_rabbitmq_connection():
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
    return pika.BlockingConnection(
        pika.ConnectionParameters(host=rabbitmq_host, port=5672, connection_attempts=3, retry_delay=2)
    )

def publish_event(queue_name, payload):
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange='',
            routing_key=queue_name,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,
            )
        )
        connection.close()
        logger.info(f"[RabbitMQ] Published to {queue_name}: {payload}")
    except Exception as e:
        logger.error(f"[RabbitMQ] Failed to publish to {queue_name}: {e}")

def start_saga_consumer():
    def _run():
        rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
        max_retries = 10
        retry_delay = 5
        
        connection = None
        for attempt in range(max_retries):
            try:
                logger.info(f"[RabbitMQ Consumer] Connecting to {rabbitmq_host} (Attempt {attempt+1}/{max_retries})...")
                connection = get_rabbitmq_connection()
                break
            except Exception as e:
                logger.warning(f"[RabbitMQ Consumer] Connection failed: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
        
        if not connection:
            logger.error("❌ [RabbitMQ Consumer] RabbitMQ connection failed. Consumer aborted.")
            return

        try:
            channel = connection.channel()
            queues = [
                'saga-payment-success',
                'saga-payment-pending',
                'saga-payment-refunded',
                'saga-order-cancelled'
            ]
            for queue in queues:
                channel.queue_declare(queue=queue, durable=True)
            
            def callback(ch, method, properties, body):
                close_old_connections()
                try:
                    event = json.loads(body.decode())
                    order_id = event.get('order_id')
                    routing_key = method.routing_key
                    logger.info(f"[RabbitMQ Consumer] Received event {routing_key} for Order {order_id}")
                    
                    from product_app.models import Product, StockReservation
                    
                    if routing_key in ('saga-payment-success', 'saga-payment-pending'):
                        items = event.get('items', [])
                        address = event.get('address', '')
                        payment_method = event.get('payment_method', 'card')
                        
                        # Idempotency check
                        if StockReservation.objects.filter(order_id=order_id).exists():
                            logger.info(f"Stock already reduced for Order {order_id}. Skipping and republishing success.")
                            publish_event('saga-stock-reduced', {
                                "order_id": order_id,
                                "items": items,
                                "address": address,
                                "payment_method": payment_method
                            })
                            ch.basic_ack(delivery_tag=method.delivery_tag)
                            return
                        
                        # Atomic check & reduce
                        try:
                            with transaction.atomic():
                                products_to_update = []
                                for item in items:
                                    p = Product.objects.select_for_update().filter(id=item['product_id']).first()
                                    if not p or p.stock < item['quantity']:
                                        raise ValueError(f"Insufficient stock for product {item['product_id']}")
                                    products_to_update.append((p, item['quantity']))
                                
                                # Deduct
                                for p, qty in products_to_update:
                                    p.stock -= qty
                                    p.save()
                                
                                # Record reservation
                                StockReservation.objects.create(
                                    order_id=order_id,
                                    items_json=json.dumps(items)
                                )
                                logger.info(f"Stock successfully reduced for Order {order_id}")
                            
                            # Publish stock.reduced
                            publish_event('saga-stock-reduced', {
                                "order_id": order_id,
                                "items": items,
                                "address": address,
                                "payment_method": payment_method
                            })
                            
                        except Exception as e:
                            logger.warning(f"Failed to reduce stock for Order {order_id}: {e}")
                            # Publish stock.failed
                            publish_event('saga-stock-failed', {"order_id": order_id, "reason": str(e)})
                            
                    elif routing_key in ('saga-payment-refunded', 'saga-order-cancelled'):
                        # Compensation: Rollback stock
                        reservation = StockReservation.objects.filter(order_id=order_id).first()
                        if reservation:
                            try:
                                items = json.loads(reservation.items_json)
                                with transaction.atomic():
                                    for item in items:
                                        p = Product.objects.select_for_update().filter(id=item['product_id']).first()
                                        if p:
                                            p.stock += item['quantity']
                                            p.save()
                                    reservation.delete()
                                    logger.info(f"Stock successfully rolled back/restored for Order {order_id}")
                            except Exception as e:
                                logger.error(f"Failed to rollback stock for Order {order_id}: {e}")
                    
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logger.error(f"Error processing RabbitMQ message: {e}")
                    ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1)
            for queue in queues:
                channel.basic_consume(queue=queue, on_message_callback=callback)
            
            logger.info("🚀 [RabbitMQ Consumer] Waiting for Saga events...")
            channel.start_consuming()
        except Exception as e:
            logger.error(f"[RabbitMQ Consumer] Consuming error: {e}")
            try:
                connection.close()
            except Exception:
                pass
            time.sleep(5)
            _run()

    if os.environ.get('RUN_MAIN') == 'true' or not os.environ.get('RUN_MAIN'):
        threading.Thread(target=_run, daemon=True).start()
