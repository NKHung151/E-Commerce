import pika
import json
import logging
import os
import sys
import threading
import time
from django.db import close_old_connections

logger = logging.getLogger(__name__)

# Saga events are published to a direct exchange and every service binds its own
# queue ("<service>.<event>") to it, so an event consumed by several services
# (e.g. saga-order-cancelled: product + payment) reaches each of them.
SAGA_EXCHANGE = 'saga-events'
SERVICE_NAME = 'order-service'


def _declare_exchange(channel):
    channel.exchange_declare(exchange=SAGA_EXCHANGE, exchange_type='direct', durable=True)

def get_rabbitmq_connection():
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
    return pika.BlockingConnection(
        pika.ConnectionParameters(host=rabbitmq_host, port=5672, connection_attempts=3, retry_delay=2)
    )

def publish_event(queue_name, payload):
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()
        _declare_exchange(channel)
        channel.basic_publish(
            exchange=SAGA_EXCHANGE,
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

def _should_start_consumer():
    """Start the consumer only in the process that actually serves requests.

    - `manage.py runserver` with autoreload: only the child process (RUN_MAIN=true),
      not the file-watcher parent, otherwise two consumers run.
    - Other management commands (migrate, shell, test, ...): never.
    - WSGI servers (gunicorn, uwsgi): always.
    """
    argv = sys.argv
    if argv and argv[0].endswith('manage.py'):
        if len(argv) > 1 and argv[1] == 'runserver':
            return os.environ.get('RUN_MAIN') == 'true' or '--noreload' in argv
        return False
    return True


def start_saga_consumer():
    def _consume_once():
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
            _declare_exchange(channel)
            for queue in queues:
                own_queue = f'{SERVICE_NAME}.{queue}'
                channel.queue_declare(queue=own_queue, durable=True)
                channel.queue_bind(queue=own_queue, exchange=SAGA_EXCHANGE, routing_key=queue)
            
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
                    
                    # Only move forward from states where the event makes sense, so a late
                    # or redelivered event cannot resurrect a cancelled order or cancel a delivered one.
                    if routing_key in ('saga-payment-failed', 'saga-payment-refunded', 'saga-stock-failed'):
                        if order.status in ('pending', 'processing'):
                            order.status = 'cancelled'
                            order.save(update_fields=['status', 'updated_at'])
                            logger.info(f"Order {order_id} cancelled due to event: {routing_key}")
                        else:
                            logger.info(f"Ignoring {routing_key} for Order {order_id} in status {order.status}")
                    elif routing_key == 'saga-shipping-created':
                        if order.status == 'pending':
                            order.status = 'processing'
                            order.save(update_fields=['status', 'updated_at'])
                            logger.info(f"Order {order_id} set to processing (Saga completed successfully)")
                            # Paid (or COD accepted) and stock reserved: now it is a purchase.
                            from order_app.utils import track_behavior
                            for item in order.items.all():
                                track_behavior(user_id=order.user_id, product_id=item.product_id, action='purchase')
                        else:
                            logger.info(f"Ignoring {routing_key} for Order {order_id} in status {order.status}")
                    
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    logger.error(f"Error processing RabbitMQ message: {e}")
                    ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1)
            for queue in queues:
                channel.basic_consume(queue=f'{SERVICE_NAME}.{queue}', on_message_callback=callback)
            
            logger.info("🚀 [RabbitMQ Consumer] Waiting for Saga events...")
            channel.start_consuming()
        except Exception as e:
            logger.error(f"[RabbitMQ Consumer] Consuming error: {e}")
            try:
                connection.close()
            except Exception:
                pass

    def _run():
        # Reconnect forever (a loop, not recursion, so failures do not grow the stack).
        while True:
            _consume_once()
            time.sleep(5)

    if _should_start_consumer():
        threading.Thread(target=_run, daemon=True).start()
