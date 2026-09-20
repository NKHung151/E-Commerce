import logging
from decimal import Decimal
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import Order, OrderItem
from .serializers import OrderSerializer
from .permissions import JWTAuthentication, IsStaffOrAdmin, IsCustomerOrAbove
from .utils import error_response, track_behavior
from . import services
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "order-service"})


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class OrderViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['update_status', 'partial_update']:
            return [IsStaffOrAdmin()]
        return [IsCustomerOrAbove()]

    def create(self, request):
        """
        Create an order with Saga orchestration.
        
        Saga flow:
        1. Validate products exist and have sufficient stock
        2. Resolve prices from product-service (NEVER from client body)
        3. Create Order with status='pending_payment'
        4. Call payment-service
           - success: set Order.status='paid'
           - failure: set Order.status='cancelled', return 402
        5. If paid: call shipping-service
           - if fails: log error, keep order as 'paid'
        """
        user_id = request.auth_payload['user_id']
        items_data = request.data.get('items', [])
        address = request.data.get('address', '')
        token = request.auth_header if hasattr(request, 'auth_header') else None

        if not items_data:
            return error_response('items list is required', 400)

        logger.info(f'[order-service] Creating order for user {user_id}')

        # Step 1 & 2: Validate products and resolve prices
        total_price = Decimal('0')
        order_items_data = []

        for item in items_data:
            product_id = item.get('product_id')
            quantity = item.get('quantity', 1)

            if not product_id:
                return error_response('product_id required for each item', 400)

            # Get product from product-service
            try:
                product = services.get_product(product_id)
            except Exception as e:
                logger.error(f'[order-service] Failed to fetch product {product_id}: {e}')
                return error_response(f'Failed to fetch product {product_id}', 500)

            if product is None:
                return error_response(f'Product {product_id} not found', 400)

            # Check stock
            if product['stock'] < quantity:
                return error_response(
                    f'Insufficient stock for product {product_id}: available {product["stock"]}, requested {quantity}',
                    400
                )

            # Use price from product-service (NEVER from client body)
            unit_price = Decimal(str(product['price']))
            order_items_data.append({
                'product_id': product_id,
                'quantity': quantity,
                'unit_price': unit_price
            })
            total_price += unit_price * quantity

        logger.info(f'[order-service] Validated all products for order total: ${total_price}')

        # Step 3: Create Order
        try:
            payment_method = request.data.get('payment_method', 'card')
            order = Order.objects.create(
                user_id=user_id,
                total_price=total_price,
                status='pending',
                address=address,
                payment_method=payment_method
            )

            # Create OrderItems
            for item_data in order_items_data:
                OrderItem.objects.create(order=order, **item_data)

            logger.info(f'[order-service] Created Order {order.id} with status=pending, payment_method={payment_method}')
        except Exception as e:
            logger.error(f'[order-service] Failed to create order: {e}')
            return error_response(f'Failed to create order: {str(e)}', 500)

        # Step 4: Publish Saga Event (RabbitMQ)
        try:
            from order_app.rabbitmq_saga import publish_event
            payload = {
                "order_id": order.id,
                "total_price": str(order.total_price),
                "address": order.address,
                "payment_method": order.payment_method,
                "items": [
                    {
                        "product_id": item.product_id,
                        "quantity": item.quantity,
                        "unit_price": str(item.unit_price)
                    }
                    for item in order.items.all()
                ]
            }
            publish_event('saga-order-created', payload)
            logger.info(f'[order-service] Published saga-order-created for Order {order.id}')
        except Exception as e:
            logger.error(f'[order-service] Failed to publish saga-order-created: {e}')

        # Track behavior
        for item_data in order_items_data:
            try:
                track_behavior(user_id=user_id, product_id=item_data['product_id'], action='purchase')
            except Exception:
                pass

        serializer = OrderSerializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def list(self, request):
        user_id = request.auth_payload['user_id']
        role = request.auth_payload.get('role')

        logger.info(f'[order-service] Listing orders for user {user_id} (role: {role})')

        if role in ('admin', 'staff'):
            orders = Order.objects.all().order_by('-id')
        else:
            orders = Order.objects.filter(user_id=user_id).order_by('-id')

        search_query = request.query_params.get('search', None)
        if search_query:
            from django.db.models import Q
            q_clean = search_query.strip()
            if q_clean.startswith('#'):
                q_clean = q_clean[1:]
            
            if q_clean.isdigit():
                orders = orders.filter(Q(id=int(q_clean)) | Q(user_id=int(q_clean)))
            else:
                orders = orders.filter(Q(status__icontains=q_clean) | Q(address__icontains=q_clean))

        # Apply pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 10)
        
        paginator = self.pagination_class()
        paginated_orders = paginator.paginate_queryset(orders, request)
        serializer = OrderSerializer(paginated_orders, many=True)
        return paginator.get_paginated_response(serializer.data)

    def retrieve(self, request, pk=None):
        user_id = request.auth_payload['user_id']
        role = request.auth_payload.get('role')

        logger.info(f'[order-service] Retrieving Order {pk} for user {user_id}')

        try:
            order = Order.objects.get(pk=pk)
            
            # Enforce ownership
            if role not in ('admin', 'staff') and order.user_id != user_id:
                return error_response('Permission denied', 403)

            serializer = OrderSerializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return error_response('Order not found', 404)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update order status (staff/admin only)"""
        new_status = request.data.get('status')

        if not new_status:
            return error_response('status is required', 400)

        logger.info(f'[order-service] Updating Order {pk} status to {new_status}')

        try:
            order = Order.objects.get(pk=pk)
            if new_status not in dict(Order.STATUS_CHOICES):
                return error_response(f'Invalid status: {new_status}', 400)
            
            old_status = order.status
            
            # State Machine Validation
            VALID_TRANSITIONS = {
                'pending': ['pending', 'processing', 'cancelled'],
                'processing': ['processing', 'shipped', 'cancelled'],
                'shipped': ['shipped', 'delivered'],
                'delivered': ['delivered'],
                'cancelled': ['cancelled']
            }
            if new_status not in VALID_TRANSITIONS.get(old_status, []):
                return error_response(f'Invalid state transition from {old_status} to {new_status}', 400)

            order.status = new_status
            order.save()

            if old_status != new_status:
                try:
                    from order_app.rabbitmq_saga import publish_event
                    if new_status == 'cancelled':
                        publish_event('saga-order-cancelled', {"order_id": order.id})
                        logger.info(f"[order-service] Published saga-order-cancelled for Order {order.id} due to manual cancel")
                    elif new_status == 'shipped':
                        publish_event('saga-order-shipped', {"order_id": order.id})
                        logger.info(f"[order-service] Published saga-order-shipped for Order {order.id}")
                    elif new_status == 'delivered':
                        publish_event('saga-order-delivered', {"order_id": order.id})
                        logger.info(f"[order-service] Published saga-order-delivered for Order {order.id}")
                except Exception as e:
                    logger.error(f"Failed to publish saga event for status {new_status}: {e}")

            serializer = OrderSerializer(order)
            return Response(serializer.data)
        except Order.DoesNotExist:
            return error_response('Order not found', 404)
