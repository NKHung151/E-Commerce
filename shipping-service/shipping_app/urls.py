from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShipmentViewSet, health_check

# Public router (customers)
router = DefaultRouter()
router.register(r'shipping', ShipmentViewSet, basename='shipment')

# Staff router for staff/admin shared endpoints
staff_router = DefaultRouter()
staff_router.register(r'shipping', ShipmentViewSet, basename='staff-shipment')

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('shipping/create/', ShipmentViewSet.as_view({'post': 'create'}), name='shipping-create-alias'),
    path('staff/shipping/create/', ShipmentViewSet.as_view({'post': 'create'}), name='staff-shipping-create-alias'),
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
]
