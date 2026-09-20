from django.apps import AppConfig

class PaymentAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'payment_app'

    def ready(self):
        from .rabbitmq_saga import start_saga_consumer
        start_saga_consumer()
