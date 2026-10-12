from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CartViewSet

# Every action works on the caller's own cart (user_id from the JWT).
router = DefaultRouter()
router.register(r'cart', CartViewSet, basename='cart')

urlpatterns = [
    path('', include(router.urls)),
]
