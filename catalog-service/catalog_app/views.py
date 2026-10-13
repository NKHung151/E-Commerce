import logging

import requests
from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Category
from .serializers import CategorySerializer
from .permissions import JWTAuthentication, IsAdminRole

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "catalog-service"})


def products_in_category(category_id):
    """Number of products in the category according to product-service (None if unreachable)."""
    try:
        resp = requests.get(f'{settings.PRODUCT_SERVICE_URL}/api/v1/products/',
                            params={'category_id': category_id, 'page_size': 1}, timeout=3)
        resp.raise_for_status()
        return resp.json().get('count', 0)
    except (requests.RequestException, ValueError) as e:
        logger.warning(f'[catalog-service] Could not count products of category {category_id}: {e}')
        return None


class CategoryViewSet(viewsets.ModelViewSet):
    # Stable ordering is required for consistent pagination.
    queryset = Category.objects.order_by('name')
    serializer_class = CategorySerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [AllowAny()]

    def destroy(self, request, *args, **kwargs):
        # Products only store the category id: deleting a used category would leave them
        # pointing at nothing (no name, wrong storefront filters, unknown back-office type).
        category = self.get_object()
        count = products_in_category(category.pk)
        if count is None:
            return Response({'error': 'Không kiểm tra được sản phẩm của danh mục, vui lòng thử lại sau', 'code': 503},
                            status=503)
        if count:
            return Response({'error': f'Danh mục đang có {count} sản phẩm, hãy chuyển chúng sang danh mục khác trước',
                             'code': 409}, status=409)
        return super().destroy(request, *args, **kwargs)
