from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, AdminProductViewSet, BookViewSet, ElectronicsViewSet, FashionViewSet,
    HomeLivingViewSet, SportsOutdoorsViewSet, BeautyHealthViewSet, ToysGamesViewSet,
    AutomotiveViewSet, FoodGroceryViewSet, OfficeSuppliesViewSet
)

# Public/customer router (list/retrieve)
router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'books', BookViewSet, basename='book')
router.register(r'electronics', ElectronicsViewSet, basename='electronics')
router.register(r'fashion', FashionViewSet, basename='fashion')
router.register(r'home-living', HomeLivingViewSet, basename='home-living')
router.register(r'sports-outdoors', SportsOutdoorsViewSet, basename='sports-outdoors')
router.register(r'beauty-health', BeautyHealthViewSet, basename='beauty-health')
router.register(r'toys-games', ToysGamesViewSet, basename='toys-games')
router.register(r'automotive', AutomotiveViewSet, basename='automotive')
router.register(r'food-grocery', FoodGroceryViewSet, basename='food-grocery')
router.register(r'office-supplies', OfficeSuppliesViewSet, basename='office-supplies')

# Staff router: endpoints intended for staff (and admin when permitted)
staff_router = DefaultRouter()
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

# Admin router: admin management endpoints (admin-only write operations)
admin_router = DefaultRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'books', BookViewSet, basename='admin-book')
admin_router.register(r'electronics', ElectronicsViewSet, basename='admin-electronics')
admin_router.register(r'fashion', FashionViewSet, basename='admin-fashion')
admin_router.register(r'home-living', HomeLivingViewSet, basename='admin-home-living')
admin_router.register(r'sports-outdoors', SportsOutdoorsViewSet, basename='admin-sports-outdoors')
admin_router.register(r'beauty-health', BeautyHealthViewSet, basename='admin-beauty-health')
admin_router.register(r'toys-games', ToysGamesViewSet, basename='admin-toys-games')
admin_router.register(r'automotive', AutomotiveViewSet, basename='admin-automotive')
admin_router.register(r'food-grocery', FoodGroceryViewSet, basename='admin-food-grocery')
admin_router.register(r'office-supplies', OfficeSuppliesViewSet, basename='admin-office-supplies')

urlpatterns = [
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
    path('admin/', include(admin_router.urls)),
]
