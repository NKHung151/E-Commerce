from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import CommentViewSet

router = SimpleRouter()
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]
