from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import OrderViewSet

# Public router (customers)
router = SimpleRouter()
router.register(r'orders', OrderViewSet, basename='order')

# Staff router (staff and admin shared endpoints)
staff_router = SimpleRouter()
staff_router.register(r'orders', OrderViewSet, basename='staff-order')

urlpatterns = [
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
]
