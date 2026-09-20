import logging
from django.http import JsonResponse
import requests
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Comment
from .serializers import CommentSerializer
from .permissions import JWTAuthentication, IsCustomerOrAbove, IsCommentOwnerOrAdmin

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "comment-rate-service"})


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    authentication_classes = [JWTAuthentication]

    def get_permissions(self):
        if self.action == 'create':
            return [IsCustomerOrAbove()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsCommentOwnerOrAdmin()]
        return [AllowAny()]

    def get_queryset(self):
        queryset = Comment.objects.all()
        product_id = self.request.query_param_to_use = self.request.query_params.get('product_id')
        if product_id is not None:
            try:
                queryset = queryset.filter(product_id=int(product_id))
            except ValueError:
                pass
        return queryset

    def list(self, request, *args, **kwargs):
        logger.info('[comment-rate-service] Listing comments')
        return super().list(request, *args, **kwargs)

    def _update_product_rating(self, product_id):
        comments = Comment.objects.filter(product_id=product_id)
        
        # Bayesian average: blend real reviews with 5 virtual 5.0 star reviews
        # This prevents the rating from dropping completely on the first bad review
        VIRTUAL_COUNT = 5
        VIRTUAL_RATING = 5.0
        
        total_real_stars = sum(c.rating for c in comments)
        total_real_count = len(comments)
        
        avg_rating = (total_real_stars + VIRTUAL_COUNT * VIRTUAL_RATING) / (total_real_count + VIRTUAL_COUNT)
        avg_rating = round(avg_rating, 2)
        
        # Send HTTP request to product-service
        product_service_url = getattr(settings, 'PRODUCT_SERVICE_URL', 'http://product-service:8002')
        try:
            requests.post(
                f"{product_service_url}/api/v1/products/{product_id}/update_rating/",
                json={"rating": avg_rating},
                timeout=5
            )
            logger.info(f"[comment-rate-service] Sent update_rating for product {product_id} with rating {avg_rating}")
        except Exception as e:
            logger.error(f"[comment-rate-service] Failed to update rating for product {product_id}: {e}")

    def perform_create(self, serializer):
        comment = serializer.save()
        self._update_product_rating(comment.product_id)

    def perform_update(self, serializer):
        comment = serializer.save()
        self._update_product_rating(comment.product_id)

    def perform_destroy(self, instance):
        product_id = instance.product_id
        instance.delete()
        self._update_product_rating(product_id)
