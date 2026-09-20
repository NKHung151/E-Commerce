from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommentViewSet, health_check

router = DefaultRouter()
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('health/', health_check, name='health_check'),
    path('', include(router.urls)),
]
