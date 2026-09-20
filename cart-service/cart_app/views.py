import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from .permissions import JWTAuthentication, IsCustomerOrAbove
from .utils import error_response, track_behavior
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "cart-service"})


class CartViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsCustomerOrAbove]

    def get_or_create_cart(self, user_id):
        cart, _ = Cart.objects.get_or_create(user_id=user_id)
        return cart

    @action(detail=False, methods=['get'])
    def list_cart(self, request):
        user_id = request.auth_payload['user_id']
        logger.info(f'[cart-service] Fetching cart for user {user_id}')
        
        cart = self.get_or_create_cart(user_id)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        unit_price = request.data.get('unit_price')

        if not product_id or not unit_price:
            return error_response('product_id and unit_price are required', 400)

        logger.info(f'[cart-service] Adding {quantity}x product {product_id} to cart for user {user_id}')
        
        try:
            cart = self.get_or_create_cart(user_id)
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product_id=product_id,
                defaults={'quantity': quantity, 'unit_price': unit_price}
            )
            if not created:
                cart_item.quantity += quantity
                cart_item.save()
            
            serializer = CartItemSerializer(cart_item)
            
            # Track behavior
            track_behavior(user_id=user_id, product_id=product_id, action='add_to_cart')
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return error_response(str(e), 400)

    @action(detail=False, methods=['put'])
    def update_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity')

        if not product_id or quantity is None:
            return error_response('product_id and quantity are required', 400)

        logger.info(f'[cart-service] Updating product {product_id} quantity to {quantity} for user {user_id}')
        
        try:
            cart = self.get_or_create_cart(user_id)
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
            cart_item.quantity = quantity
            cart_item.save()
            
            serializer = CartItemSerializer(cart_item)
            return Response(serializer.data)
        except CartItem.DoesNotExist:
            return error_response('Item not found in cart', 404)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')

        if not product_id:
            return error_response('product_id is required', 400)

        logger.info(f'[cart-service] Removing product {product_id} from cart for user {user_id}')
        
        try:
            cart = self.get_or_create_cart(user_id)
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
            cart_item.delete()
            return Response({'message': 'Item removed from cart'}, status=status.HTTP_204_NO_CONTENT)
        except CartItem.DoesNotExist:
            return error_response('Item not found in cart', 404)

    @action(detail=False, methods=['delete'])
    def clear_cart(self, request):
        user_id = request.auth_payload['user_id']
        logger.info(f'[cart-service] Clearing cart for user {user_id}')
        
        try:
            cart = self.get_or_create_cart(user_id)
            CartItem.objects.filter(cart=cart).delete()
            return Response({'message': 'Cart cleared'}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return error_response(str(e), 400)
