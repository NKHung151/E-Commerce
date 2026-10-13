from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ShipmentViewSet

# Shipping is back-office only (staff/admin), so routes live under /staff/.
router = SimpleRouter()
router.register(r'shipping', ShipmentViewSet, basename='shipment')

urlpatterns = [
    path('staff/', include(router.urls)),
]
