from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShipmentViewSet

# Shipping is back-office only (staff/admin), so routes live under /staff/.
router = DefaultRouter()
router.register(r'shipping', ShipmentViewSet, basename='shipment')

urlpatterns = [
    path('staff/shipping/create/', ShipmentViewSet.as_view({'post': 'create'}), name='shipping-create'),
    path('staff/', include(router.urls)),
]
