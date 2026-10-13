import json
import logging
import os
import queue
import threading

import pika
import requests
from django.conf import settings
from django.db import transaction
from rest_framework.response import Response

logger = logging.getLogger(__name__)


def error_response(message: str, status: int) -> Response:
    logger.warning(f'Error {status}: {message}')
    return Response({'error': message, 'code': status}, status=status)


# ── Behaviour events for ai-service ────────────────────────────────────────
# One background thread owns one RabbitMQ connection and publishes queued events;
# a request only enqueues. (One thread + one AMQP connection per event made every
# product view open a TCP connection and a handshake.)
BEHAVIOR_QUEUE = 'user-behavior-queue'
_events = queue.Queue(maxsize=10_000)
_worker_lock = threading.Lock()
_worker = None


def track_behavior(user_id, product_id, action):
    """Report a user action to ai-service (non-blocking, best effort)."""
    global _worker
    try:
        _events.put_nowait({'user_id': user_id, 'product_id': product_id, 'action': action})
    except queue.Full:
        logger.warning('[behavior] Event buffer full, dropping event')
        return
    with _worker_lock:
        if _worker is None or not _worker.is_alive():
            _worker = threading.Thread(target=_publish_loop, name='behavior-publisher', daemon=True)
            _worker.start()


def _connect():
    connection = pika.BlockingConnection(pika.ConnectionParameters(
        host=os.getenv('RABBITMQ_HOST', 'rabbitmq'), port=5672, connection_attempts=2, retry_delay=1))
    channel = connection.channel()
    channel.queue_declare(queue=BEHAVIOR_QUEUE, durable=True)
    return connection, channel


def _publish_loop():
    connection = channel = None
    while True:
        event = _events.get()
        body = json.dumps(event)
        # Two attempts: an idle connection may have been closed by the broker meanwhile.
        for _ in range(2):
            try:
                if connection is None or connection.is_closed:
                    connection, channel = _connect()
                channel.basic_publish(exchange='', routing_key=BEHAVIOR_QUEUE, body=body,
                                      properties=pika.BasicProperties(delivery_mode=2))
                break
            except Exception as e:
                logger.warning(f'[behavior] RabbitMQ publish failed: {e}')
                connection = channel = None
        else:
            _post_to_ai_service(event)


def _post_to_ai_service(event):
    """Fallback when RabbitMQ is unreachable. ai-service only accepts events for
    arbitrary users from services, hence the internal token."""
    try:
        requests.post(f'{settings.AI_SERVICE_URL}/behavior/track', json=event, timeout=2,
                      headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN})
    except requests.RequestException as e:
        logger.warning(f'[behavior] HTTP fallback failed, event lost: {e}')


def notify_catalog_changed():
    """Ask ai-service to re-embed the catalogue after a product was created, edited or deleted.

    Without this, new products stay invisible to semantic search and the chatbot until
    someone rebuilds the index by hand. Sent after the transaction commits (so ai-service
    reads the new data) from a background thread (so the admin request never waits);
    ai-service coalesces bursts of changes into one rebuild.
    """
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
