import logging
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import Category
from .serializers import CategorySerializer
from .permissions import JWTAuthentication, IsAdminRole

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "catalog-service"})


class CategoryViewSet(viewsets.ModelViewSet):
    # Stable ordering is required for consistent pagination.
    queryset = Category.objects.order_by('name')
    serializer_class = CategorySerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [AllowAny()]

    def list(self, request, *args, **kwargs):
        logger.info('[catalog-service] Listing all categories')
        return super().list(request, *args, **kwargs)
