from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet

# Single router: the old staff/ and admin/ routers pointed at the same viewset.
router = DefaultRouter()
router.register(r'payment', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
