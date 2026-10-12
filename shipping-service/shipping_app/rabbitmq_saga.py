import pika
import json
import logging
import os
import sys
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
                'saga-stock-reduced',
                'saga-payment-confirmed',
                'saga-order-shipped',
                'saga-order-delivered',
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
                            elif shipment.status == 'pending_payment':
                                shipment.status = 'processing'
                                shipment.save(update_fields=['status', 'updated_at'])
                                logger.info(f"Shipment updated to processing for Order {order_id}")
                            elif shipment.status == 'cancelled':
                                logger.info(f"Shipment for Order {order_id} is cancelled; not reopening")
                                ch.basic_ack(delivery_tag=method.delivery_tag)
                                return

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
                        elif shipment.status == 'cancelled':
                            logger.info(f"Shipment for Order {order_id} is cancelled; ignoring payment confirmation")
                            ch.basic_ack(delivery_tag=method.delivery_tag)
                            return
                        elif shipment.status == 'pending_payment':
                            shipment.status = 'processing'
                            shipment.save(update_fields=['status', 'updated_at'])
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

                    elif routing_key == 'saga-order-cancelled':
                        # Previously shipments of cancelled orders stayed 'processing' forever.
                        updated = Shipment.objects.filter(
                            order_id=order_id, status__in=('pending_payment', 'processing')
                        ).update(status='cancelled')
                        if updated:
                            logger.info(f"Shipment for Order {order_id} cancelled")

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

    def _run():
        # Reconnect forever instead of recursing (the old self-call grew the stack on every failure).
        while True:
            _consume_once()
            time.sleep(5)

    if _should_start_consumer():
        threading.Thread(target=_run, daemon=True).start()
