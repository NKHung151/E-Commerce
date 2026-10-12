import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, RegisterSerializer,
    StaffUserSerializer, CustomTokenObtainPairSerializer,
)
from .permissions import IsAdminRole, IsStaffOrAdmin
from .utils import error_response
from django.conf import settings
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "user-service"})


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class _UserCrudMixin:
    """Shared CRUD helpers so the admin-only actions are implemented once."""
    update_serializer_class = UserSerializer

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError):
            return None

    def _list_users(self):
        users = User.objects.all().order_by('id')
        return Response(UserSerializer(users, many=True).data)

    def _retrieve_user(self, pk):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        return Response(UserSerializer(user).data)

    def _update_user(self, request, pk, partial):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        serializer = self.update_serializer_class(user, data=request.data, partial=partial)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return error_response(str(serializer.errors), 400)

    def _destroy_user(self, request, pk):
        user = self._get_user(pk)
        if user is None:
            return error_response('User not found', 404)
        if user.pk == request.user.pk:
            return error_response('You cannot delete your own account', 400)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserViewSet(_UserCrudMixin, viewsets.ViewSet):
    def get_permissions(self):
        """
        - register: AllowAny (anyone can register as a customer)
        - me: any authenticated user
        - everything else: admin only
        """
        if self.action == 'register':
            return [AllowAny()]
        if self.action == 'me':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminRole()]

    def list(self, request):
        logger.info('[user-service] Listing all users')
        return self._list_users()

    def retrieve(self, request, pk=None):
        return self._retrieve_user(pk)

    @action(detail=False, methods=['post'])
    def register(self, request):
        logger.info('[user-service] New user registration attempt')
        serializer_class = UserCreateSerializer if settings.ALLOW_ROLE_ON_REGISTER else RegisterSerializer
        serializer = serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f'[user-service] User registered: {serializer.data["username"]}')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return error_response(str(serializer.errors), 400)

    @action(detail=False, methods=['get'])
    def me(self, request):
        user = self._get_user(request.user.pk)
        if user is None:
            return error_response('User not found', 404)
        return Response(UserSerializer(user).data)

    def update(self, request, pk=None):
        return self._update_user(request, pk, partial=False)

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk, partial=True)

    def destroy(self, request, pk=None):
        return self._destroy_user(request, pk)


class StaffUserViewSet(_UserCrudMixin, viewsets.ViewSet):
    """Endpoints under `/staff/users/` for staff (and admin) to access shared user functionality."""
    update_serializer_class = StaffUserSerializer

    def get_permissions(self):
        return [IsAuthenticated(), IsStaffOrAdmin()]

    def list(self, request):
        logger.info('[user-service] Staff listing users')
        return self._list_users()

    def retrieve(self, request, pk=None):
        return self._retrieve_user(pk)

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk, partial=True)


class AdminUserViewSet(_UserCrudMixin, viewsets.ViewSet):
    """Admin endpoints under `/admin/users/` for full user management."""
    def get_permissions(self):
        return [IsAuthenticated(), IsAdminRole()]

    def list(self, request):
        logger.info('[user-service] Admin listing users')
        return self._list_users()

    def retrieve(self, request, pk=None):
        return self._retrieve_user(pk)

    def create(self, request):
        logger.info('[user-service] Admin creating user')
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return error_response(str(serializer.errors), 400)

    def update(self, request, pk=None):
        return self._update_user(request, pk, partial=False)

    def partial_update(self, request, pk=None):
        return self._update_user(request, pk, partial=True)

    def destroy(self, request, pk=None):
        return self._destroy_user(request, pk)
