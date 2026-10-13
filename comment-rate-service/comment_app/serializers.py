import requests
from django.conf import settings
from rest_framework import serializers
from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = (
            'id', 'product_id', 'user_id', 'username',
            'rating', 'comment_text', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'user_id', 'username', 'created_at', 'updated_at')

    def validate_comment_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Nội dung đánh giá không được để trống')
        return value

    def validate(self, attrs):
        if self.instance is None:  # creating
            user_id = self.context['request'].auth_payload['user_id']
            product_id = attrs['product_id']
            if Comment.objects.filter(user_id=user_id, product_id=product_id).exists():
                raise serializers.ValidationError('Bạn đã đánh giá sản phẩm này, hãy sửa đánh giá cũ')
            if not _product_exists(product_id):
                raise serializers.ValidationError('Sản phẩm không tồn tại')
        return attrs

    def update(self, instance, validated_data):
        # A review cannot be moved to another product (the old product's rating
        # would never be recomputed).
        validated_data.pop('product_id', None)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        # The author always comes from the JWT (create requires a logged-in user).
        payload = self.context['request'].auth_payload
        validated_data['user_id'] = payload['user_id']
        validated_data['username'] = payload.get('username', '')
        return super().create(validated_data)


def _product_exists(product_id):
    """True unless product-service says 404 (an unreachable product-service does not block reviews)."""
    try:
        resp = requests.get(f'{settings.PRODUCT_SERVICE_URL}/api/v1/products/{product_id}/', timeout=3)
        return resp.status_code != 404
    except requests.RequestException:
        return True
