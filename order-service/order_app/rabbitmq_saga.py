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
                'saga-payment-failed',
                'saga-payment-refunded',
                'saga-stock-failed',
                'saga-shipping-created'
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
                    
                    from order_app.models import Order
                    order = Order.objects.filter(pk=order_id).first()
                    
                    if not order:
                        logger.warning(f"Order {order_id} not found. Acknowledging message.")
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                        return
                    
                    if routing_key in ('saga-payment-failed', 'saga-payment-refunded', 'saga-stock-failed'):
                        order.status = 'cancelled'
                        order.save()
                        logger.info(f"Order {order_id} cancelled due to event: {routing_key}")
                    elif routing_key == 'saga-shipping-created':
                        order.status = 'processing'
                        order.save()
                        logger.info(f"Order {order_id} set to processing (Saga completed successfully)")
                    
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
        # In Docker runserver or celery, RUN_MAIN is set. If not, start anyway (for other runtime environments)
        threading.Thread(target=_run, daemon=True).start()
