import logging
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, RegisterSerializer, CustomTokenObtainPairSerializer
from .permissions import IsAdminRole
from .utils import error_response, validation_error
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "user-service"})


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.GenericAPIView):
    """Public self-registration; the account is always a customer."""
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer.errors)
        serializer.save()
        logger.info(f'[user-service] User registered: {serializer.data["username"]}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MeViewSet(viewsets.ViewSet):
    """/users/me/: the profile of the logged-in user."""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(UserSerializer(request.user).data)


class AdminUserViewSet(viewsets.ViewSet):
    """Admin endpoints under /admin/users/ for full user management."""
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError):
            return None

    def list(self, request):
        return Response(UserSerializer(User.objects.order_by('id'), many=True).data)

    def retrieve(self, request, pk=None):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        return Response(UserSerializer(user).data)

    def create(self, request):
        serializer = UserCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return validation_error(serializer.errors)
        serializer.save()
        logger.info(f'[user-service] Admin created user {serializer.data["username"]}')
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def _update(self, request, pk, partial):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        serializer = UserSerializer(user, data=request.data, partial=partial)
        if not serializer.is_valid():
            return validation_error(serializer.errors)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, pk=None):
        return self._update(request, pk, partial=False)

    def partial_update(self, request, pk=None):
        return self._update(request, pk, partial=True)

    def destroy(self, request, pk=None):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        if user.pk == request.user.pk:
            return error_response('You cannot delete your own account', 400)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
