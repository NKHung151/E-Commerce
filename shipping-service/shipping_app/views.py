import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Shipment
from .serializers import ShipmentSerializer
from .permissions import JWTAuthentication, IsStaffOrAdmin, IsCustomerOrAbove
from .utils import error_response

from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "shipping-service"})


class ShipmentViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['update_status']:
            return [IsStaffOrAdmin()]
        return [IsCustomerOrAbove()]

    def create(self, request):
        """Create shipment for an order"""
        order_id = request.data.get('order_id')
        address = request.data.get('address')

        if not order_id or not address:
            return error_response('order_id and address are required', 400)

        logger.info(f'[shipping-service] Creating shipment for Order {order_id}')

        try:
            # Check if shipment already exists
            existing_shipment = Shipment.objects.filter(order_id=order_id).first()
            if existing_shipment:
                logger.warning(f'[shipping-service] Shipment already exists for Order {order_id}')
                serializer = ShipmentSerializer(existing_shipment)
                return Response(serializer.data)

            # Create new shipment
            shipment = Shipment.objects.create(
                order_id=order_id,
                address=address,
                status='processing'
            )

            logger.info(f'[shipping-service] Shipment {shipment.id} created for Order {order_id}')
            serializer = ShipmentSerializer(shipment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f'[shipping-service] Failed to create shipment for Order {order_id}: {e}')
            return error_response(str(e), 500)

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get shipment status for an order"""
        order_id = request.query_params.get('order_id')

        if not order_id:
            return error_response('order_id query parameter is required', 400)

        logger.info(f'[shipping-service] Checking shipment status for Order {order_id}')

        try:
            shipment = Shipment.objects.get(order_id=order_id)
            serializer = ShipmentSerializer(shipment)
            return Response(serializer.data)
        except Shipment.DoesNotExist:
            return error_response(f'No shipment found for Order {order_id}', 404)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update shipment status (staff/admin only)"""
        new_status = request.data.get('status')

        if not new_status:
            return error_response('status is required', 400)

        logger.info(f'[shipping-service] Updating Shipment {pk} status to {new_status}')

        try:
            shipment = Shipment.objects.get(pk=pk)
            if new_status not in dict(Shipment.STATUS_CHOICES):
                return error_response(f'Invalid status: {new_status}', 400)

            shipment.status = new_status
            shipment.save()

            serializer = ShipmentSerializer(shipment)
            return Response(serializer.data)
        except Shipment.DoesNotExist:
            return error_response('Shipment not found', 404)
