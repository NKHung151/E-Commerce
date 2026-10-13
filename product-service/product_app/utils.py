from rest_framework.response import Response
import logging

logger = logging.getLogger(__name__)


def error_response(message: str, status: int) -> Response:
    logger.warning(f'Error {status}: {message}')
    return Response({'error': message, 'code': status}, status=status)


def track_behavior(user_id, product_id, action, timestamp=None):
    """
    Asynchronously send behavior event to AI Service via RabbitMQ (with HTTP fallback).
    """
    import threading
    import json
    import pika
    import os
    import requests
    from django.conf import settings
    from datetime import datetime

    def _send():
        # Try publishing via RabbitMQ
        try:
            rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=rabbitmq_host, port=5672, connection_attempts=3, retry_delay=2)
            )
            channel = connection.channel()
            channel.queue_declare(queue='user-behavior-queue', durable=True)
            
            payload = {
                "user_id": user_id,
                "product_id": product_id,
                "action": action,
                "timestamp": timestamp or datetime.utcnow().isoformat()
            }
            
            channel.basic_publish(
                exchange='',
                routing_key='user-behavior-queue',
                body=json.dumps(payload),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                )
            )
            connection.close()
            logger.info(f'[RabbitMQ] Published behavior event ({action}) for user {user_id} on product {product_id}')
            return
        except Exception as mq_err:
            logger.warning(f'[RabbitMQ] Failed to publish via RabbitMQ: {mq_err}. Falling back to HTTP.')

        # Fallback to HTTP call
        try:
            url = f"{settings.AI_SERVICE_URL}/behavior/track"
            payload = {
                "user_id": user_id,
                "product_id": product_id,
                "action": action,
                "timestamp": timestamp or datetime.utcnow().isoformat()
            }
            # ai-service only accepts events for arbitrary users from services.
            requests.post(url, json=payload, timeout=2.0,
                          headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN})
            logger.info(f'[AI-Tracker-HTTP-Fallback] Tracked {action} for user {user_id} on product {product_id}')
        except Exception as http_err:
            logger.warning(f'[AI-Tracker-HTTP-Fallback] Failed to track behavior via HTTP: {http_err}')

    threading.Thread(target=_send, daemon=True).start()


def notify_catalog_changed():
    """Ask ai-service to re-embed the catalogue after a product was created, edited or deleted.

    Without this, new products stay invisible to semantic search and the chatbot until
    someone rebuilds the index by hand. Sent after the transaction commits (so ai-service
    reads the new data) from a background thread (so the admin request never waits);
    ai-service coalesces bursts of changes into one rebuild.
    """
    import threading
    import requests
    from django.conf import settings
    from django.db import transaction

    def _send():
        try:
            requests.post(
                f"{settings.AI_SERVICE_URL}/admin/rebuild-index",
                headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
                timeout=3,
            )
        except requests.RequestException as e:
            logger.warning(f'[product-service] Could not notify ai-service of a catalogue change: {e}')

    transaction.on_commit(lambda: threading.Thread(target=_send, daemon=True).start())
