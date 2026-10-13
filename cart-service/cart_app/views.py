import logging
from decimal import Decimal

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
    def __init__(self, message, status):
        super().__init__(message)
        self.status = status


def fetch_product(product_id):
    """The authoritative product record from product-service (price, stock, availability).

    Raises ProductLookupError (404 unknown product, 503 product-service unreachable).
    The cart never trusts a price or stock sent by the client.
    """
    try:
        resp = requests.get(f'{settings.PRODUCT_SERVICE_URL}/api/v1/products/{int(product_id)}/', timeout=3)
    except (TypeError, ValueError):
        raise ProductLookupError('Sản phẩm không tồn tại', 404)
    except requests.RequestException as e:
        logger.warning(f'[cart-service] product-service unreachable: {e}')
        raise ProductLookupError('Không lấy được thông tin sản phẩm, vui lòng thử lại sau', 503)
    if resp.status_code == 404:
        raise ProductLookupError('Sản phẩm không tồn tại', 404)
    if resp.status_code != 200:
        logger.warning(f'[cart-service] product-service returned {resp.status_code} for product {product_id}')
        raise ProductLookupError('Không lấy được thông tin sản phẩm, vui lòng thử lại sau', 503)
    return resp.json()


def check_stock(product, quantity):
    """Error response if `quantity` units of the product cannot be ordered, else None."""
    if not product.get('is_available', True) or product.get('stock', 0) <= 0:
        return error_response('Sản phẩm đã hết hàng', 400)
    if quantity > product['stock']:
        return error_response(f'Chỉ còn {product["stock"]} sản phẩm trong kho', 400)
    return None


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
            return error_response(f'Số lượng phải từ 1 đến {MAX_ITEM_QUANTITY}', 400)

        try:
            product = fetch_product(product_id)
        except ProductLookupError as e:
            return error_response(str(e), e.status)
        unit_price = Decimal(str(product['price']))

        cart = self.get_or_create_cart(user_id)
        in_cart = CartItem.objects.filter(cart=cart, product_id=product_id).values_list('quantity', flat=True).first() or 0
        stock_error = check_stock(product, in_cart + quantity)
        if stock_error:
            return stock_error

        logger.info(f'[cart-service] Adding {quantity}x product {product_id} to cart for user {user_id}')
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
            return error_response(f'product_id và số lượng (0-{MAX_ITEM_QUANTITY}) là bắt buộc', 400)

        logger.info(f'[cart-service] Updating product {product_id} quantity to {quantity} for user {user_id}')

        cart = self.get_or_create_cart(user_id)
        try:
            cart_item = CartItem.objects.get(cart=cart, product_id=product_id)
        except CartItem.DoesNotExist:
            return error_response('Sản phẩm không có trong giỏ hàng', 404)

        if quantity == 0:
            cart_item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        try:
            product = fetch_product(product_id)
        except ProductLookupError as e:
            return error_response(str(e), e.status)
        stock_error = check_stock(product, quantity)
        if stock_error:
            return stock_error

        # Refresh the price too, so the cart shows what checkout will charge.
        cart_item.quantity = quantity
        cart_item.unit_price = Decimal(str(product['price']))
        cart_item.save(update_fields=['quantity', 'unit_price', 'updated_at'])
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
            return error_response('Sản phẩm không có trong giỏ hàng', 404)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'])
    def clear_cart(self, request):
        user_id = request.auth_payload['user_id']
        logger.info(f'[cart-service] Clearing cart for user {user_id}')

        CartItem.objects.filter(cart__user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
