import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Cart, CartItem
from .serializers import CartSerializer, CartItemSerializer
from .permissions import JWTAuthentication, IsCustomerOrAbove
from .utils import error_response, track_behavior
from django.http import JsonResponse

logger = logging.getLogger(__name__)

MAX_ITEM_QUANTITY = 999


def health_check(request):
    return JsonResponse({"status": "ok", "service": "cart-service"})


def _parse_quantity(value, allow_zero=False):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    lower = 0 if allow_zero else 1
    return value if lower <= value <= MAX_ITEM_QUANTITY else None


class ProductLookupError(Exception):
    pass


def fetch_product(product_id):
    """Fetch the authoritative product record from product-service.

    Returns the product dict, None if product-service is unreachable,
    and raises ProductLookupError if the product does not exist.
    """
    try:
        resp = requests.get(f'{settings.PRODUCT_SERVICE_URL}/api/v1/products/{product_id}/', timeout=3)
    except requests.RequestException as e:
        logger.warning(f'[cart-service] product-service unreachable: {e}')
        return None
    if resp.status_code == 404:
        raise ProductLookupError('Product not found')
    if resp.status_code != 200:
        logger.warning(f'[cart-service] product-service returned {resp.status_code} for product {product_id}')
        return None
    return resp.json()


class CartViewSet(viewsets.ViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsCustomerOrAbove]

    def get_or_create_cart(self, user_id):
        try:
            cart, _ = Cart.objects.get_or_create(user_id=user_id)
        except IntegrityError:
            # Another request created the cart concurrently.
            cart = Cart.objects.get(user_id=user_id)
        return cart

    @action(detail=False, methods=['get'])
    def list_cart(self, request):
        user_id = request.auth_payload['user_id']
        logger.info(f'[cart-service] Fetching cart for user {user_id}')

        cart = self.get_or_create_cart(user_id)
        cart = Cart.objects.prefetch_related('items').get(pk=cart.pk)
        return Response(CartSerializer(cart).data)

    @action(detail=False, methods=['post'])
    def add_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')
        quantity = _parse_quantity(request.data.get('quantity', 1))

        if not product_id:
            return error_response('product_id is required', 400)
        if quantity is None:
            return error_response(f'quantity must be an integer between 1 and {MAX_ITEM_QUANTITY}', 400)

        # Price comes from product-service, never from the client. The client value is
        # only used as a fallback when product-service is temporarily unreachable
        # (order-service re-prices every item at checkout anyway).
        try:
            product = fetch_product(product_id)
        except ProductLookupError as e:
            return error_response(str(e), 404)

        if product is not None:
            if not product.get('is_available', True):
                return error_response('Product is not available', 400)
            unit_price = product.get('price')
        else:
            unit_price = request.data.get('unit_price')

        try:
            unit_price = Decimal(str(unit_price))
        except (InvalidOperation, ValueError):
            return error_response('Could not determine product price', 400)

        logger.info(f'[cart-service] Adding {quantity}x product {product_id} to cart for user {user_id}')

        cart = self.get_or_create_cart(user_id)
        with transaction.atomic():
            cart_item, created = CartItem.objects.select_for_update().get_or_create(
                cart=cart,
                product_id=product_id,
                defaults={'quantity': quantity, 'unit_price': unit_price}
            )
            if not created:
                cart_item.quantity = F('quantity') + quantity
                cart_item.unit_price = unit_price
                cart_item.save(update_fields=['quantity', 'unit_price', 'updated_at'])
                cart_item.refresh_from_db()

        track_behavior(user_id=user_id, product_id=product_id, action='add_to_cart')

        return Response(CartItemSerializer(cart_item).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['put'])
    def update_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')
        quantity = _parse_quantity(request.data.get('quantity'), allow_zero=True)

        if not product_id or quantity is None:
            return error_response(
                f'product_id and quantity (0-{MAX_ITEM_QUANTITY}) are required', 400)

        logger.info(f'[cart-service] Updating product {product_id} quantity to {quantity} for user {user_id}')

        cart = self.get_or_create_cart(user_id)
        try:
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
        except CartItem.DoesNotExist:
            return error_response('Item not found in cart', 404)

        if quantity == 0:
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        cart_item.quantity = quantity
        cart_item.save(update_fields=['quantity', 'updated_at'])
        return Response(CartItemSerializer(cart_item).data)

    @action(detail=False, methods=['delete'])
    def remove_item(self, request):
        user_id = request.auth_payload['user_id']
        product_id = request.data.get('product_id')

        if not product_id:
            return error_response('product_id is required', 400)

        logger.info(f'[cart-service] Removing product {product_id} from cart for user {user_id}')

        deleted, _ = CartItem.objects.filter(cart__user_id=user_id, product_id=product_id).delete()
        if not deleted:
            return error_response('Item not found in cart', 404)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'])
    def clear_cart(self, request):
        user_id = request.auth_payload['user_id']
        logger.info(f'[cart-service] Clearing cart for user {user_id}')

        CartItem.objects.filter(cart__user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
