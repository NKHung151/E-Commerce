from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'role')

    def validate(self, attrs):
        # AUTH_PASSWORD_VALIDATORS: length, too common, all digits, too close to the username.
        try:
            validate_password(attrs['password'], User(username=attrs.get('username'), email=attrs.get('email')))
        except DjangoValidationError as e:
            raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'customer')
        )


class RegisterSerializer(UserCreateSerializer):
    """Public self-registration: role is always forced to 'customer'."""
    class Meta(UserCreateSerializer.Meta):
        read_only_fields = ('role',)

    def create(self, validated_data):
        validated_data['role'] = 'customer'
        return super().create(validated_data)


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['user_id'] = user.id
        token['username'] = user.username
        token['role'] = user.role
        token['email'] = user.email
        return token
