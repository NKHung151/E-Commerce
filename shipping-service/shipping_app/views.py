import logging
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Shipment
from .serializers import ShipmentSerializer
from .permissions import JWTAuthentication, IsStaffOrAdmin
from .utils import error_response

from django.http import JsonResponse

logger = logging.getLogger(__name__)

# Shipments only move forward; cancelled/delivered are terminal.
VALID_TRANSITIONS = {
    'pending_payment': ['pending_payment', 'processing', 'cancelled'],
    'processing': ['processing', 'shipping', 'cancelled'],
    'shipping': ['shipping', 'delivered'],
    'delivered': ['delivered'],
    'cancelled': ['cancelled'],
}


def health_check(request):
    return JsonResponse({"status": "ok", "service": "shipping-service"})


def _parse_id(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


class ShipmentViewSet(viewsets.ViewSet):
    """Back-office shipment endpoints. Shipments are created by the saga; the
    customer UI never calls this service directly, so every action is staff/admin.
    (Previously any customer could create shipments or read any order's address.)
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsStaffOrAdmin]

    def create(self, request):
        """Create shipment for an order"""
        order_id = _parse_id(request.data.get('order_id'))
        address = request.data.get('address')

        if order_id is None or not address:
            return error_response('order_id and address are required', 400)

        logger.info(f'[shipping-service] Creating shipment for Order {order_id}')

        try:
            shipment, created = Shipment.objects.get_or_create(
                order_id=order_id,
                defaults={'address': address, 'status': 'processing'}
            )
        except IntegrityError:
            shipment, created = Shipment.objects.get(order_id=order_id), False

        if not created:
            logger.warning(f'[shipping-service] Shipment already exists for Order {order_id}')
            return Response(ShipmentSerializer(shipment).data)

        logger.info(f'[shipping-service] Shipment {shipment.id} created for Order {order_id}')
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get shipment status for an order"""
        order_id = _parse_id(request.query_params.get('order_id'))
        if order_id is None:
            return error_response('order_id query parameter is required', 400)

        logger.info(f'[shipping-service] Checking shipment status for Order {order_id}')

        shipment = Shipment.objects.filter(order_id=order_id).first()
        if shipment is None:
            return error_response(f'No shipment found for Order {order_id}', 404)
        return Response(ShipmentSerializer(shipment).data)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update shipment status (staff/admin only)"""
        new_status = request.data.get('status')

        if not new_status:
            return error_response('status is required', 400)
        if new_status not in dict(Shipment.STATUS_CHOICES):
            return error_response(f'Invalid status: {new_status}', 400)

        logger.info(f'[shipping-service] Updating Shipment {pk} status to {new_status}')

        shipment = Shipment.objects.filter(pk=_parse_id(pk)).first() if _parse_id(pk) else None
        if shipment is None:
            return error_response('Shipment not found', 404)

        if new_status not in VALID_TRANSITIONS.get(shipment.status, []):
            return error_response(f'Invalid state transition from {shipment.status} to {new_status}', 400)

        shipment.status = new_status
        shipment.save(update_fields=['status', 'updated_at'])
        return Response(ShipmentSerializer(shipment).data)
