import pika
import json
import logging
import os
import threading
import time
from django.db import close_old_connections

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
                'saga-stock-reduced',
                'saga-payment-confirmed',
                'saga-order-shipped',
                'saga-order-delivered'
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
                    
                    from shipping_app.models import Shipment
                    
                    if routing_key == 'saga-stock-reduced':
                        address = event.get('address', '')
                        payment_method = event.get('payment_method', 'card')
                        
                        shipment = Shipment.objects.filter(order_id=order_id).first()
                        if payment_method == 'bank':
                            if not shipment:
                                shipment = Shipment.objects.create(
                                    order_id=order_id,
                                    address=address,
                                    status='pending_payment'
                                )
                                logger.info(f"Shipment created for Order {order_id} (pending_payment for bank transfer)")
                            else:
                                logger.info(f"Shipment already exists for Order {order_id}")
                        else:
                            if not shipment:
                                shipment = Shipment.objects.create(
                                    order_id=order_id,
                                    address=address,
                                    status='processing'
                                )
                                logger.info(f"Shipment created for Order {order_id} (processing)")
                            else:
                                shipment.status = 'processing'
                                shipment.save()
                                logger.info(f"Shipment updated to processing for Order {order_id}")
                            
                            # Publish shipping.created
                            publish_event('saga-shipping-created', {"order_id": order_id})
                            
                    elif routing_key == 'saga-payment-confirmed':
                        shipment = Shipment.objects.filter(order_id=order_id).first()
                        address = event.get('address', '')
                        if not shipment:
                            shipment = Shipment.objects.create(
                                order_id=order_id,
                                address=address,
                                status='processing'
                            )
                            logger.info(f"Shipment created on payment confirmed for Order {order_id} (processing)")
                        else:
                            if shipment.status == 'pending_payment':
                                shipment.status = 'processing'
                                shipment.save()
                                logger.info(f"Shipment for Order {order_id} transitioned to processing")
                            
                        # Publish shipping.created
                        publish_event('saga-shipping-created', {"order_id": order_id})
                        
                    elif routing_key == 'saga-order-shipped':
                        shipment = Shipment.objects.filter(order_id=order_id).first()
                        if shipment and shipment.status != 'shipping':
                            shipment.status = 'shipping'
                            shipment.save()
                            logger.info(f"Shipment for Order {order_id} synced to shipping")
                            
                    elif routing_key == 'saga-order-delivered':
                        shipment = Shipment.objects.filter(order_id=order_id).first()
                        if shipment and shipment.status != 'delivered':
                            shipment.status = 'delivered'
                            shipment.save()
                            logger.info(f"Shipment for Order {order_id} synced to delivered")
                    
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
