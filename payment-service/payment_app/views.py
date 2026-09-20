import logging
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer
from .permissions import JWTAuthentication, IsCustomerOrAbove
from .utils import error_response

from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "payment-service"})


class PaymentViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsCustomerOrAbove]

    @action(detail=False, methods=['post'])
    def pay(self, request):
        """Process payment for an order"""
        order_id = request.data.get('order_id')
        amount = request.data.get('amount')

        if not order_id or not amount:
            return error_response('order_id and amount are required', 400)

        logger.info(f'[payment-service] Processing payment for Order {order_id}: ${amount}')

        try:
            # Check if payment already exists
            existing_payment = Payment.objects.filter(order_id=order_id).first()
            if existing_payment and existing_payment.status == 'success':
                logger.warning(f'[payment-service] Payment already processed for Order {order_id}')
                return Response(PaymentSerializer(existing_payment).data)

            # Simulate payment processing - always succeeds in this demo
            payment, created = Payment.objects.get_or_create(
                order_id=order_id,
                defaults={
                    'amount': amount,
                    'status': 'success',
                    'paid_at': timezone.now()
                }
            )

            if not created and payment.status != 'success':
                payment.status = 'success'
                payment.paid_at = timezone.now()
                payment.save()

            logger.info(f'[payment-service] Payment successful for Order {order_id}')
            serializer = PaymentSerializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f'[payment-service] Payment processing error for Order {order_id}: {e}')
            return error_response(str(e), 500)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get payment status for an order"""
        order_id = request.query_params.get('order_id')

        if not order_id:
            return error_response('order_id query parameter is required', 400)

        logger.info(f'[payment-service] Checking payment status for Order {order_id}')

        try:
            payment = Payment.objects.get(order_id=order_id)
            serializer = PaymentSerializer(payment)
            return Response(serializer.data)
        except Payment.DoesNotExist:
            return error_response(f'No payment found for Order {order_id}', 404)

    @action(detail=False, methods=['post'])
    def refund(self, request):
        """Refund payment for an order (Saga compensation step)"""
        order_id = request.data.get('order_id')
        if not order_id:
            return error_response('order_id is required', 400)

        logger.info(f'[payment-service] Refunding/cancelling payment for Order {order_id}')

        try:
            payment = Payment.objects.filter(order_id=order_id).first()
            if payment:
                payment.status = 'failed'
                payment.save()
                return Response(PaymentSerializer(payment).data)
            return error_response(f'No payment found for Order {order_id}', 404)
        except Exception as e:
            logger.error(f'[payment-service] Refund failed for Order {order_id}: {e}')
            return error_response(str(e), 500)

    @action(detail=False, methods=['post'], url_path='(?P<order_id>[0-9]+)/confirm')
    def confirm(self, request, order_id=None):
        """Confirm a pending payment manually (staff/admin only)"""
        role = request.auth_payload.get('role')
        if role not in ('admin', 'staff'):
            return error_response('Permission denied. Only staff/admin can confirm payments.', 403)

        logger.info(f'[payment-service] Staff/Admin {request.auth_payload.get("user_id")} confirming payment for Order {order_id}')

        try:
            payment = Payment.objects.filter(order_id=order_id).first()
            if not payment:
                return error_response(f'No payment found for Order {order_id}', 404)

            if payment.status == 'success':
                return Response({'message': 'Payment already confirmed', 'data': PaymentSerializer(payment).data})

            payment.status = 'success'
            payment.paid_at = timezone.now()
            payment.save()

            # Publish payment.success to resume the Saga!
            from .rabbitmq_saga import publish_event
            import json
            items = []
            if payment.items_json:
                try:
                    items = json.loads(payment.items_json)
                except Exception:
                    pass

            publish_event('saga-payment-confirmed', {
                "order_id": int(order_id),
                "items": items,
                "address": payment.address,
                "payment_method": payment.payment_method
            })
            logger.info(f'[payment-service] Payment for Order {order_id} manually confirmed, saga-payment-confirmed published')
            return Response(PaymentSerializer(payment).data)

        except Exception as e:
            logger.error(f'[payment-service] Confirm payment failed for Order {order_id}: {e}')
            return error_response(str(e), 500)
