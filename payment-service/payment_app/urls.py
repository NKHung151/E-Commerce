from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet, health_check

# Public router (customers)
router = DefaultRouter()
router.register(r'payment', PaymentViewSet, basename='payment')

# Staff router for staff/admin shared endpoints
staff_router = DefaultRouter()
staff_router.register(r'payment', PaymentViewSet, basename='staff-payment')

# Admin router for admin-only management (if needed)
admin_router = DefaultRouter()
admin_router.register(r'payment', PaymentViewSet, basename='admin-payment')

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
    path('admin/', include(admin_router.urls)),
]
