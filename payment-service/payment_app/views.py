import json
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Payment
from .serializers import PaymentSerializer
from .permissions import JWTAuthentication, IsCustomerOrAbove, IsStaffOrAdmin
from .rabbitmq_saga import publish_event
from .utils import error_response

from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "payment-service"})


def _parse_order_id(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


class PaymentViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        # Payments are driven by the saga. Staff confirm bank / cash payments; refunds happen
        # by cancelling the order (saga-order-cancelled), which also restores the stock.
        if self.action == 'confirm':
            return [IsStaffOrAdmin()]
        return [IsCustomerOrAbove()]

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get payment status for an order"""
        order_id = _parse_order_id(request.query_params.get('order_id'))
        if order_id is None:
            return error_response('order_id query parameter is required', 400)

        logger.info(f'[payment-service] Checking payment status for Order {order_id}')

        payment = Payment.objects.filter(order_id=order_id).first()
        if payment is None:
            return error_response(f'No payment found for Order {order_id}', 404)

        # Customers may only see payments of their own orders.
        auth = request.auth_payload
        if auth.get('role') not in ('admin', 'staff') and payment.user_id is not None \
                and payment.user_id != auth.get('user_id'):
            return error_response('Permission denied', 403)

        return Response(PaymentSerializer(payment).data)

    @action(detail=False, methods=['post'], url_path='(?P<order_id>[0-9]+)/confirm')
    def confirm(self, request, order_id=None):
        """Confirm a pending payment manually (staff/admin only)"""
        logger.info(f'[payment-service] Staff/Admin {request.auth_payload.get("user_id")} confirming payment for Order {order_id}')

        with transaction.atomic():
            payment = Payment.objects.select_for_update().filter(order_id=order_id).first()
            if not payment:
                return error_response(f'No payment found for Order {order_id}', 404)

            if payment.status == 'success':
                return Response({'message': 'Payment already confirmed', 'data': PaymentSerializer(payment).data})

            if payment.status != 'pending':
                # A failed payment belongs to a cancelled order; confirming it would ship a cancelled order.
                return error_response(f'Cannot confirm a payment in status {payment.status}', 409)

            payment.status = 'success'
            payment.paid_at = timezone.now()
            payment.save(update_fields=['status', 'paid_at', 'updated_at'])

        items = []
        if payment.items_json:
            try:
                items = json.loads(payment.items_json)
            except ValueError:
                logger.warning(f'[payment-service] Invalid items_json for Order {order_id}')

        # Publish payment.confirmed to resume the Saga
        publish_event('saga-payment-confirmed', {
            "order_id": int(order_id),
            "items": items,
            "address": payment.address,
            "payment_method": payment.payment_method
        })
        logger.info(f'[payment-service] Payment for Order {order_id} manually confirmed, saga-payment-confirmed published')
        return Response(PaymentSerializer(payment).data)
