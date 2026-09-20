from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, health_check

# Public router (customers)
router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')

# Staff router (staff and admin shared endpoints)
staff_router = DefaultRouter()
staff_router.register(r'orders', OrderViewSet, basename='staff-order')

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
]
