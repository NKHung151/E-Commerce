from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    ProductViewSet, BookViewSet, ElectronicsViewSet, FashionViewSet,
    HomeLivingViewSet, SportsOutdoorsViewSet, BeautyHealthViewSet, ToysGamesViewSet,
    AutomotiveViewSet, FoodGroceryViewSet, OfficeSuppliesViewSet
)

# Storefront and other services: browse products; internal actions
# (update_rating, reduce_stock, rollback_stock) for services.
router = SimpleRouter()
router.register(r'products', ProductViewSet, basename='product')

# Back office (staff and admin; deleting a product is admin-only). The typed endpoints
# create a product together with its category-specific details in one request.
staff_router = SimpleRouter()
staff_router.register(r'products', ProductViewSet, basename='staff-product')
staff_router.register(r'books', BookViewSet, basename='staff-book')
staff_router.register(r'electronics', ElectronicsViewSet, basename='staff-electronics')
staff_router.register(r'fashion', FashionViewSet, basename='staff-fashion')
staff_router.register(r'home-living', HomeLivingViewSet, basename='staff-home-living')
staff_router.register(r'sports-outdoors', SportsOutdoorsViewSet, basename='staff-sports-outdoors')
staff_router.register(r'beauty-health', BeautyHealthViewSet, basename='staff-beauty-health')
staff_router.register(r'toys-games', ToysGamesViewSet, basename='staff-toys-games')
staff_router.register(r'automotive', AutomotiveViewSet, basename='staff-automotive')
staff_router.register(r'food-grocery', FoodGroceryViewSet, basename='staff-food-grocery')
staff_router.register(r'office-supplies', OfficeSuppliesViewSet, basename='staff-office-supplies')

urlpatterns = [
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
]
