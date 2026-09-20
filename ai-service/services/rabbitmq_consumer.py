import pika
import json
import threading
import time
from services.behavior_service import track_behavior

def start_consumer():
    def _run():
        rabbitmq_host = 'rabbitmq'
        max_retries = 10
        retry_delay = 5
        
        connection = None
        for attempt in range(max_retries):
            try:
                print(f"[RabbitMQ Consumer] Connecting to {rabbitmq_host} (Attempt {attempt+1}/{max_retries})...")
                connection = pika.BlockingConnection(
                    pika.ConnectionParameters(host=rabbitmq_host, port=5672, connection_attempts=3, retry_delay=2)
                )
                break
            except Exception as e:
                print(f"[RabbitMQ Consumer] Connection to RabbitMQ failed: {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
        
        if not connection:
            print("❌ [RabbitMQ Consumer] RabbitMQ connection failed after maximum retries. Background consumer aborted.")
            return

        try:
            channel = connection.channel()
            channel.queue_declare(queue='user-behavior-queue', durable=True)
            
            def callback(ch, method, properties, body):
                try:
                    event = json.loads(body.decode())
                    print(f"[RabbitMQ Consumer] Received behavior event: {event}")
                    user_id = int(event.get('user_id'))
                    product_id = int(event.get('product_id'))
                    action = event.get('action')
                    track_behavior(user_id, product_id, action)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception as e:
                    print(f"Error processing RabbitMQ message: {e}")
                    # Acknowledge anyway to avoid poison pills
                    ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue='user-behavior-queue', on_message_callback=callback)
            print("🚀 [RabbitMQ Consumer] Waiting for behavior events...")
            channel.start_consuming()
        except KeyboardInterrupt:
            print("[RabbitMQ Consumer] Thread stopped by user.")
            try:
                connection.close()
            except Exception:
                pass
        except Exception as e:
            print(f"[RabbitMQ Consumer] Consuming error: {e}")
            try:
                connection.close()
            except Exception:
                pass
            time.sleep(5)
            _run()  # Reconnect and run again

    # Run blocking consumer in a daemon background thread
    threading.Thread(target=_run, daemon=True).start()
