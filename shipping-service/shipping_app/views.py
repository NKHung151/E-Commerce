import logging
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Shipment
from .serializers import ShipmentSerializer
from .permissions import JWTAuthentication, IsStaffOrAdmin
from .utils import error_response

from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "shipping-service"})


def _parse_id(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


class ShipmentViewSet(viewsets.ViewSet):
    """Back-office view of shipments (staff/admin).

    Shipments are created and moved forward only by the saga (rabbitmq_saga): the order
    status is the single source of truth, so there is no manual create / status endpoint
    that could leave a shipment "delivered" for an order still "processing", or cancelled
    without the order being cancelled and its stock restored.
    """
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsStaffOrAdmin]

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Shipment of an order."""
        order_id = _parse_id(request.query_params.get('order_id'))
        if order_id is None:
            return error_response('order_id query parameter is required', 400)

        shipment = Shipment.objects.filter(order_id=order_id).first()
        if shipment is None:
            return error_response(f'No shipment found for Order {order_id}', 404)
        return Response(ShipmentSerializer(shipment).data)
