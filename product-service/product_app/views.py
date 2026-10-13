import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db.models import Q, F, Case, When
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from .models import (
    Product, Book, Electronics, Fashion,
    HomeLiving, SportsOutdoors, BeautyHealth, ToysGames,
    Automotive, FoodGrocery, OfficeSupplies
)
from .serializers import (
    DETAIL_RELATIONS, ProductSerializer, BookSerializer,
    ElectronicsSerializer, FashionSerializer,
    HomeLivingSerializer, SportsOutdoorsSerializer, BeautyHealthSerializer,
    ToysGamesSerializer, AutomotiveSerializer, FoodGrocerySerializer,
    OfficeSuppliesSerializer
)
from .permissions import JWTAuthentication, IsStaffOrAdmin, IsAdminRole, IsInternalService
from .utils import error_response, notify_catalog_changed, track_behavior
from django.http import JsonResponse

logger = logging.getLogger(__name__)

# ai-service caps top_n at 50 (see ai-service/routers/recommend.py)
AI_RECOMMEND_TOP_N = 50


def health_check(request):
    return JsonResponse({"status": "ok", "service": "product-service"})


class CatalogChangeNotifyMixin:
    """Tell ai-service when products change through the API (create / edit / delete).

    Done here rather than with model signals: the order saga saves products to adjust
    stock, and stock does not affect what the AI indexes.
    """
    def perform_create(self, serializer):
        super().perform_create(serializer)
        notify_catalog_changed()

    def perform_update(self, serializer):
        super().perform_update(serializer)
        notify_catalog_changed()

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
        notify_catalog_changed()


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


def _parse_positive_int(value):
    try:
        value = int(value)
    except (TypeError, ValueError):
        return None
    return value if value > 0 else None


def _parse_decimal(value):
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


class ProductViewSet(CatalogChangeNotifyMixin, viewsets.ModelViewSet):
    serializer_class = ProductSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        if self.action in ['update_rating', 'reduce_stock', 'rollback_stock']:
            # Internal mutations: only other services (shared token) or staff/admin.
            return [(IsInternalService | IsStaffOrAdmin)()]
        return [AllowAny()]

    def _personalized_ids(self, user_id):
        try:
            resp = requests.get(
                f"{settings.AI_SERVICE_URL}/recommend",
                params={'user_id': user_id, 'top_n': AI_RECOMMEND_TOP_N},
                # Recommendations for an arbitrary user_id are only served to services.
                headers={'X-Internal-Token': settings.INTERNAL_SERVICE_TOKEN},
                timeout=3,
            )
            if resp.status_code == 200:
                return [p['id'] for p in resp.json().get('products', [])]
            logger.warning(f"[product-service] ai-service returned {resp.status_code} for user {user_id}")
        except (requests.RequestException, ValueError, KeyError) as e:
            logger.error(f"[product-service] Error fetching AI recommendations for user {user_id}: {e}")
        return []

    def get_queryset(self):
        """
        Support search by:
        - search: Search in name and description (case-insensitive)
        - category_id: Filter by category
        - min_price: Minimum price
        - max_price: Maximum price
        - personalized=1: AI-personalised ordering for the logged-in user (from the JWT)
        """
        # Prefetch detail relations in the same query to avoid N+1 lookups in the serializer.
        queryset = Product.objects.select_related(*DETAIL_RELATIONS)

        # Only listing needs filters / personalized ordering.
        if self.action != 'list':
            return queryset

        params = self.request.query_params

        # The user comes from the token, never from a query parameter: the ordering
        # reveals what that user has been browsing.
        user_id = getattr(self.request, 'auth_payload', {}).get('user_id')
        if user_id and params.get('personalized') in ('1', 'true'):
            ordered_ids = self._personalized_ids(user_id)
            if ordered_ids:
                # Order by AI score first, then by the default `-views`
                preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(ordered_ids)],
                                 default=len(ordered_ids))
                queryset = queryset.order_by(preserved, '-views', '-id')

        search_query = params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
            logger.info(f'[product-service] Searching products with query: {search_query}')

        category_id = _parse_positive_int(params.get('category_id'))
        if category_id:
            queryset = queryset.filter(category=category_id)

        min_price = params.get('min_price')
        if min_price:
            value = _parse_decimal(min_price)
            if value is not None:
                queryset = queryset.filter(price__gte=value)
            else:
                logger.warning(f'[product-service] Invalid min_price value: {min_price}')

        max_price = params.get('max_price')
        if max_price:
            value = _parse_decimal(max_price)
            if value is not None:
                queryset = queryset.filter(price__lte=value)
            else:
                logger.warning(f'[product-service] Invalid max_price value: {max_price}')

        return queryset

    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        logger.info(f'[product-service] Retrieved product {product.id}')

        if request.query_params.get('increment_view') == 'true':
            user = getattr(request, 'user', None)
            user_id = user.get('user_id') if isinstance(user, dict) else None
            if user_id:
                track_behavior(user_id=user_id, product_id=product.id, action='view')

            # Atomic increment without an extra SELECT round-trip.
            Product.objects.filter(pk=product.pk).update(views=F('views') + 1)
            product.views += 1

        return Response(self.get_serializer(product).data)

    @action(detail=True, methods=['post'])
    def update_rating(self, request, pk=None):
        """Update product rating (called internally by comment-rate-service)"""
        rating = _parse_decimal(request.data.get('rating', 0))
        if rating is None or not (0 <= rating <= 5):
            return error_response('Rating must be a number between 0 and 5', 400)

        updated = Product.objects.filter(pk=pk).update(rating=rating)
        if not updated:
            return error_response('Product not found', 404)

        logger.info(f'[product-service] Updated rating for product {pk} to {rating}')
        return Response({'status': 'rating updated', 'new_rating': float(rating)})

    @action(detail=True, methods=['post'])
    def reduce_stock(self, request, pk=None):
        """Reduce product stock (called by order-service)"""
        quantity = _parse_positive_int(request.data.get('quantity'))
        if quantity is None:
            return error_response('Invalid quantity', 400)

        # Conditional UPDATE is atomic in the DB, so concurrent orders cannot oversell.
        updated = Product.objects.filter(pk=pk, stock__gte=quantity).update(stock=F('stock') - quantity)
        if not updated:
            if not Product.objects.filter(pk=pk).exists():
                return error_response('Product not found', 404)
            return error_response(f'Insufficient stock for product {pk}', 400)

        new_stock = Product.objects.values_list('stock', flat=True).get(pk=pk)
        logger.info(f'[product-service] Reduced stock for product {pk} by {quantity}. New stock: {new_stock}')
        return Response({'status': 'stock reduced', 'new_stock': new_stock})

    @action(detail=True, methods=['post'])
    def rollback_stock(self, request, pk=None):
        """Restore product stock (compensation in Saga)"""
        quantity = _parse_positive_int(request.data.get('quantity'))
        if quantity is None:
            return error_response('Invalid quantity', 400)

        updated = Product.objects.filter(pk=pk).update(stock=F('stock') + quantity)
        if not updated:
            return error_response('Product not found', 404)

        new_stock = Product.objects.values_list('stock', flat=True).get(pk=pk)
        logger.info(f'[product-service] Restored stock for product {pk} by {quantity}. New stock: {new_stock}')
        return Response({'status': 'stock restored', 'new_stock': new_stock})


class AdminProductViewSet(ProductViewSet):
    """Admin-specific product viewset. All write operations are admin-only here
    so admin clients can manage products via endpoints under an `admin/` URL.
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return super().get_permissions()


class ProductCategoryViewSet(CatalogChangeNotifyMixin, viewsets.ModelViewSet):
    """Base viewset for category-specific product models (Book, Electronics, ...).

    Subclasses set `model`, `serializer_class` and `search_fields`
    (extra model fields searched in addition to product name/description).
    """
    model = None
    search_fields = ()
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        if self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = self.model.objects.select_related('product').order_by('-product__views', '-id')
        search_query = self.request.query_params.get('search')
        if search_query:
            condition = Q(product__name__icontains=search_query) | Q(product__description__icontains=search_query)
            for field in self.search_fields:
                condition |= Q(**{f'{field}__icontains': search_query})
            queryset = queryset.filter(condition)
            logger.info(f'[product-service] Searching {self.model._meta.verbose_name_plural} with query: {search_query}')
        return queryset


class BookViewSet(ProductCategoryViewSet):
    model = Book
    serializer_class = BookSerializer
    search_fields = ('author',)

    def get_queryset(self):
        queryset = super().get_queryset()
        isbn = self.request.query_params.get('isbn')
        if isbn:
            queryset = queryset.filter(isbn__icontains=isbn)
        return queryset


class ElectronicsViewSet(ProductCategoryViewSet):
    model = Electronics
    serializer_class = ElectronicsSerializer
    search_fields = ('brand',)


class FashionViewSet(ProductCategoryViewSet):
    model = Fashion
    serializer_class = FashionSerializer
    search_fields = ('color', 'size')


class HomeLivingViewSet(ProductCategoryViewSet):
    model = HomeLiving
    serializer_class = HomeLivingSerializer
    search_fields = ('material',)


class SportsOutdoorsViewSet(ProductCategoryViewSet):
    model = SportsOutdoors
    serializer_class = SportsOutdoorsSerializer
    search_fields = ('sport_type',)


class BeautyHealthViewSet(ProductCategoryViewSet):
    model = BeautyHealth
    serializer_class = BeautyHealthSerializer
    search_fields = ('ingredient',)


class ToysGamesViewSet(ProductCategoryViewSet):
    model = ToysGames
    serializer_class = ToysGamesSerializer
    search_fields = ('age_range',)


class AutomotiveViewSet(ProductCategoryViewSet):
    model = Automotive
    serializer_class = AutomotiveSerializer
    search_fields = ('vehicle_type',)


class FoodGroceryViewSet(ProductCategoryViewSet):
    model = FoodGrocery
    serializer_class = FoodGrocerySerializer
    search_fields = ()


class OfficeSuppliesViewSet(ProductCategoryViewSet):
    model = OfficeSupplies
    serializer_class = OfficeSuppliesSerializer
    search_fields = ('material',)
