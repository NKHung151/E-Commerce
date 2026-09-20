import logging
from django.db.models import Q
from rest_framework import viewsets, status
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
    ProductSerializer, BookSerializer,
    ElectronicsSerializer, FashionSerializer,
    HomeLivingSerializer, SportsOutdoorsSerializer, BeautyHealthSerializer,
    ToysGamesSerializer, AutomotiveSerializer, FoodGrocerySerializer,
    OfficeSuppliesSerializer
)
from .permissions import JWTAuthentication, IsStaffOrAdmin, IsAdminRole, IsCustomerOrAbove
from .utils import error_response, track_behavior
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "product-service"})


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        """
        Support search by:
        - search: Search in name and description (case-insensitive)
        - category_id: Filter by category
        - min_price: Minimum price
        - max_price: Maximum price
        - user_id: Personalized recommendation sorting
        """
        queryset = Product.objects.all()
        
        # Personalized sorting using AI-Service
        user_id = self.request.query_params.get('user_id', None)
        if user_id:
            import requests
            from django.db.models import Case, When
            try:
                # Fetch personalized product IDs
                resp = requests.get(f"http://ai-service:8007/api/v1/recommend?user_id={user_id}&top_n=500", timeout=3)
                if resp.status_code == 200:
                    data = resp.json()
                    ordered_ids = [p['id'] for p in data.get('products', [])]
                    if ordered_ids:
                        # Order by AI score first, then by the default `-views`
                        preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(ordered_ids)])
                        queryset = queryset.order_by(preserved, '-views')
            except Exception as e:
                logger.error(f"[product-service] Error fetching AI recommendations for user {user_id}: {e}")

        # Search by name and description
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) | 
                Q(description__icontains=search_query)
            )
            logger.info(f'[product-service] Searching products with query: {search_query}')
        
        # Filter by category
        category_id = self.request.query_params.get('category_id', None)
        if category_id:
            queryset = queryset.filter(category=category_id)
            logger.info(f'[product-service] Filtering products by category: {category_id}')
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price', None)
        max_price = self.request.query_params.get('max_price', None)
        
        if min_price:
            try:
                queryset = queryset.filter(price__gte=float(min_price))
                logger.info(f'[product-service] Filtering by min_price: {min_price}')
            except ValueError:
                logger.warning(f'[product-service] Invalid min_price value: {min_price}')
        
        if max_price:
            try:
                queryset = queryset.filter(price__lte=float(max_price))
                logger.info(f'[product-service] Filtering by max_price: {max_price}')
            except ValueError:
                logger.warning(f'[product-service] Invalid max_price value: {max_price}')
        
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all products')
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        product_id = kwargs.get("pk")
        logger.info(f'[product-service] Retrieved product {product_id}')
        
        if request.query_params.get('increment_view') == 'true':
            # Track view behavior if user is authenticated
            user = getattr(request, 'user', None)
            user_id = None
            if isinstance(user, dict):
                user_id = user.get('user_id')
            elif user and hasattr(user, 'id') and getattr(user, 'is_authenticated', False):
                user_id = user.id

            if user_id:
                track_behavior(user_id=user_id, product_id=product_id, action='view')
                
            # Increment views
            from django.db.models import F
            product = self.get_object()
            product.views = F('views') + 1
            product.save(update_fields=['views'])
            product.refresh_from_db()
            
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def update_rating(self, request, pk=None):
        """Update product rating (called internally by comment-rate-service)"""
        try:
            rating = float(request.data.get('rating', 0))
        except ValueError:
            return error_response('Invalid rating format', 400)
            
        product = self.get_object()
        product.rating = rating
        product.save(update_fields=['rating'])
        
        logger.info(f'[product-service] Updated rating for product {product.id} to {rating}')
        return Response({'status': 'rating updated', 'new_rating': rating})

    @action(detail=True, methods=['post'])
    def reduce_stock(self, request, pk=None):
        """Reduce product stock (called by order-service)"""
        quantity = int(request.data.get('quantity', 0))
        if quantity <= 0:
            return error_response('Invalid quantity', 400)

        product = self.get_object()
        if product.stock < quantity:
            return error_response(f'Insufficient stock for product {product.id}', 400)

        product.stock -= quantity
        product.save()
        
        logger.info(f'[product-service] Reduced stock for product {product.id} by {quantity}. New stock: {product.stock}')
        return Response({'status': 'stock reduced', 'new_stock': product.stock})

    @action(detail=True, methods=['post'])
    def rollback_stock(self, request, pk=None):
        """Restore product stock (compensation in Saga)"""
        quantity = int(request.data.get('quantity', 0))
        if quantity <= 0:
            return error_response('Invalid quantity', 400)

        product = self.get_object()
        product.stock += quantity
        product.save()
        
        logger.info(f'[product-service] Restored stock for product {product.id} by {quantity}. New stock: {product.stock}')
        return Response({'status': 'stock restored', 'new_stock': product.stock})


class AdminProductViewSet(ProductViewSet):
    """Admin-specific product viewset. All write operations are admin-only here
    so admin clients can manage products via endpoints under an `admin/` URL.
    """
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [AllowAny()]


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        """
        Support search by:
        - search: Search in product name, description, author
        - isbn: Filter by ISBN
        """
        queryset = Book.objects.all()
        
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(author__icontains=search_query)
            )
            logger.info(f'[product-service] Searching books with query: {search_query}')
        
        isbn = self.request.query_params.get('isbn', None)
        if isbn:
            queryset = queryset.filter(isbn__icontains=isbn)
            logger.info(f'[product-service] Filtering books by ISBN: {isbn}')
        
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all books')
        return super().list(request, *args, **kwargs)


class ElectronicsViewSet(viewsets.ModelViewSet):
    queryset = Electronics.objects.all()
    serializer_class = ElectronicsSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Electronics.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(brand__icontains=search_query)
            )
            logger.info(f'[product-service] Searching electronics with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all electronics')
        return super().list(request, *args, **kwargs)


class FashionViewSet(viewsets.ModelViewSet):
    queryset = Fashion.objects.all()
    serializer_class = FashionSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Fashion.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(color__icontains=search_query) |
                Q(size__icontains=search_query)
            )
            logger.info(f'[product-service] Searching fashion items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all fashion items')
        return super().list(request, *args, **kwargs)


class HomeLivingViewSet(viewsets.ModelViewSet):
    queryset = HomeLiving.objects.all()
    serializer_class = HomeLivingSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = HomeLiving.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(material__icontains=search_query)
            )
            logger.info(f'[product-service] Searching home & living items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all home & living items')
        return super().list(request, *args, **kwargs)


class SportsOutdoorsViewSet(viewsets.ModelViewSet):
    queryset = SportsOutdoors.objects.all()
    serializer_class = SportsOutdoorsSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = SportsOutdoors.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(sport_type__icontains=search_query)
            )
            logger.info(f'[product-service] Searching sports & outdoors items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all sports & outdoors items')
        return super().list(request, *args, **kwargs)


class BeautyHealthViewSet(viewsets.ModelViewSet):
    queryset = BeautyHealth.objects.all()
    serializer_class = BeautyHealthSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = BeautyHealth.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(ingredient__icontains=search_query)
            )
            logger.info(f'[product-service] Searching beauty & health items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all beauty & health items')
        return super().list(request, *args, **kwargs)


class ToysGamesViewSet(viewsets.ModelViewSet):
    queryset = ToysGames.objects.all()
    serializer_class = ToysGamesSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = ToysGames.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(age_range__icontains=search_query)
            )
            logger.info(f'[product-service] Searching toys & games items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all toys & games items')
        return super().list(request, *args, **kwargs)


class AutomotiveViewSet(viewsets.ModelViewSet):
    queryset = Automotive.objects.all()
    serializer_class = AutomotiveSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Automotive.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(vehicle_type__icontains=search_query)
            )
            logger.info(f'[product-service] Searching automotive items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all automotive items')
        return super().list(request, *args, **kwargs)


class FoodGroceryViewSet(viewsets.ModelViewSet):
    queryset = FoodGrocery.objects.all()
    serializer_class = FoodGrocerySerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = FoodGrocery.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query)
            )
            logger.info(f'[product-service] Searching food & grocery items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all food & grocery items')
        return super().list(request, *args, **kwargs)


class OfficeSuppliesViewSet(viewsets.ModelViewSet):
    queryset = OfficeSupplies.objects.all()
    serializer_class = OfficeSuppliesSerializer
    authentication_classes = [JWTAuthentication]
    pagination_class = StandardResultsSetPagination

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            return [IsStaffOrAdmin()]
        elif self.action == 'destroy':
            return [IsAdminRole()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = OfficeSupplies.objects.all()
        search_query = self.request.query_params.get('search', None)
        if search_query:
            queryset = queryset.filter(
                Q(product__name__icontains=search_query) |
                Q(product__description__icontains=search_query) |
                Q(material__icontains=search_query)
            )
            logger.info(f'[product-service] Searching office supplies items with query: {search_query}')
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[product-service] Listing all office supplies items')
        return super().list(request, *args, **kwargs)
