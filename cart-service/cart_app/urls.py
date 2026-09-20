from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet, health_check

# Public router (customers)
router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')

# Staff router (staff/admin shared)
staff_router = DefaultRouter()
staff_router.register(r'cart', CartViewSet, basename='staff-cart')

# Admin router (admin management)
admin_router = DefaultRouter()
admin_router.register(r'cart', CartViewSet, basename='admin-cart')

urlpatterns = [
	path('health/', health_check, name='health_check'),
	path('', include(router.urls)),
	path('staff/', include(staff_router.urls)),
	path('admin/', include(admin_router.urls)),
]
