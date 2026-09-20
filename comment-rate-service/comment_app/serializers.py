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

    def create(self, validated_data):
        request = self.context.get('request')
        # request.user is the decoded JWT payload dictionary returned by JWTAuthentication
        if request and hasattr(request, 'user') and isinstance(request.user, dict):
            validated_data['user_id'] = request.user.get('user_id')
            validated_data['username'] = request.user.get('username', 'Anonymous')
        else:
            validated_data['user_id'] = 0
            validated_data['username'] = 'Anonymous'
        return super().create(validated_data)
