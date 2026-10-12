import asyncio
import json
import logging
import os
import threading
import time

import pika

from schemas.behavior_schema import BehaviorEvent
from services.behavior_service import process_event, track_behavior

logger = logging.getLogger(__name__)

QUEUE = 'user-behavior-queue'
EVENT_TIMEOUT = 30  # seconds to wait for the graph write of one event


def start_consumer(loop: asyncio.AbstractEventLoop = None):
    """Consume behaviour events published by the Django services.

    `loop` is the FastAPI event loop. Events are processed on it with
    run_coroutine_threadsafe so they also reach Neo4j (the async driver is bound to
    that loop). Previously this path only appended to the CSV, so the graph was
    only updated by the rarely used HTTP fallback.
    """
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'rabbitmq')

    def _handle(event: dict):
        evt = BehaviorEvent(
            user_id=int(event.get('user_id')),
            product_id=int(event['product_id']) if event.get('product_id') is not None else None,
            action=event.get('action'),
        )
        if loop is not None and loop.is_running():
            asyncio.run_coroutine_threadsafe(process_event(evt), loop).result(timeout=EVENT_TIMEOUT)
        else:
            track_behavior(evt.user_id, evt.product_id, evt.action)

    def _consume_once():
        try:
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=rabbitmq_host, port=5672, connection_attempts=3, retry_delay=2)
            )
        except Exception as e:
            logger.warning(f"[RabbitMQ Consumer] Connection to {rabbitmq_host} failed: {e}")
            return

        try:
            channel = connection.channel()
            channel.queue_declare(queue=QUEUE, durable=True)

            def callback(ch, method, properties, body):
                try:
                    _handle(json.loads(body.decode()))
                except Exception as e:
                    logger.error(f"Error processing behaviour message: {e}")
                # Acknowledge anyway to avoid poison pills
                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=QUEUE, on_message_callback=callback)
            logger.info("[RabbitMQ Consumer] Waiting for behaviour events...")
            channel.start_consuming()
        except Exception as e:
            logger.error(f"[RabbitMQ Consumer] Consuming error: {e}")
        finally:
            try:
                connection.close()
            except Exception:
                pass

    def _run():
        # Reconnect forever instead of recursing (the old self-call grew the stack on every failure).
        while True:
            _consume_once()
            time.sleep(5)

    # Run blocking consumer in a daemon background thread
    threading.Thread(target=_run, daemon=True).start()
