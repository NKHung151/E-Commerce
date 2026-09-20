import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, CustomTokenObtainPairSerializer
from .permissions import IsAdminRole, IsStaffOrAdmin
from .utils import error_response
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def health_check(request):
    return JsonResponse({"status": "ok", "service": "user-service"})


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UserViewSet(viewsets.ViewSet):
    def get_permissions(self):
        """
        Dynamically set permissions based on action
        - register: AllowAny (anyone can register)
        - list, retrieve: IsAuthenticated + IsAdminRole
        """
        if self.action == 'register':
            return [AllowAny()]
        elif self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsAdminRole()]
        return [IsAuthenticated()]

    def list(self, request):
        if not hasattr(request.user, 'role') or request.user.role != 'admin':
            return error_response('Permission denied', 403)

        logger.info('[user-service] Listing all users')
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        if not hasattr(request.user, 'role') or request.user.role != 'admin':
            return error_response('Permission denied', 403)
        
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user)
            logger.info(f'[user-service] Retrieved user {pk}')
            return Response(serializer.data)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    @action(detail=False, methods=['post'])
    def register(self, request):
        logger.info('[user-service] New user registration attempt')
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            logger.info(f'[user-service] User registered: {serializer.data["email"]}')
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return error_response(str(serializer.errors), 400)

    def update(self, request, pk=None):
        if not hasattr(request.user, 'role') or request.user.role != 'admin':
            return error_response('Permission denied', 403)
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return error_response(str(serializer.errors), 400)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def partial_update(self, request, pk=None):
        if not hasattr(request.user, 'role') or request.user.role != 'admin':
            return error_response('Permission denied', 403)
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return error_response(str(serializer.errors), 400)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def destroy(self, request, pk=None):
        if not hasattr(request.user, 'role') or request.user.role != 'admin':
            return error_response('Permission denied', 403)
        try:
            user = User.objects.get(pk=pk)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return error_response('User not found', 404)


class StaffUserViewSet(viewsets.ViewSet):
    """Endpoints under `/staff/users/` for staff (and admin) to access shared user functionality."""
    def get_permissions(self):
        return [IsAuthenticated(), IsStaffOrAdmin()]

    def list(self, request):
        logger.info('[user-service] Staff listing users')
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user)
            logger.info(f'[user-service] Staff retrieved user {pk}')
            return Response(serializer.data)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def partial_update(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return error_response(str(serializer.errors), 400)
        except User.DoesNotExist:
            return error_response('User not found', 404)


class AdminUserViewSet(viewsets.ViewSet):
    """Admin endpoints under `/admin/users/` for full user management."""
    def get_permissions(self):
        return [IsAuthenticated(), IsAdminRole()]

    def list(self, request):
        logger.info('[user-service] Admin listing users')
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user)
            logger.info(f'[user-service] Admin retrieved user {pk}')
            return Response(serializer.data)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def create(self, request):
        logger.info('[user-service] Admin creating user')
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return error_response(str(serializer.errors), 400)

    def update(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return error_response(str(serializer.errors), 400)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def partial_update(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return error_response(str(serializer.errors), 400)
        except User.DoesNotExist:
            return error_response('User not found', 404)

    def destroy(self, request, pk=None):
        try:
            user = User.objects.get(pk=pk)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return error_response('User not found', 404)
