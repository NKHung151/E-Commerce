import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import AuthenticationFailed


class JWTAuthentication(BaseAuthentication):
    """
    Decode JWT locally using shared JWT_SECRET.
    Validates issuer + expiration.
    Attaches decoded payload to request.auth_payload.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=['HS256'],
                options={'require': ['exp', 'iat', 'user_id', 'role']},
                issuer='ecommerce-user-service',
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidIssuerError:
            raise AuthenticationFailed('Invalid token issuer')
        except jwt.InvalidTokenError as e:
            raise AuthenticationFailed(f'Invalid token: {str(e)}')
        request.auth_payload = payload
        return (payload, token)


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'auth_payload', {}).get('role') == 'admin'


class IsStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'auth_payload', {}).get('role') in ['admin', 'staff']


class IsCustomerOrAbove(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'auth_payload', {}).get('role') in ['admin', 'staff', 'customer']


class IsCommentOwnerOrAdmin(BasePermission):
    """
    Object-level permission to allow only owners of a comment or admins to delete/modify it.
    """
    def has_permission(self, request, view):
        # Must be authenticated to perform write/delete
        return getattr(request, 'auth_payload', {}) is not None

    def has_object_permission(self, request, view, obj):
        # Admin role gets free pass
        role = getattr(request, 'auth_payload', {}).get('role')
        if role == 'admin':
            return True
        
        # Otherwise, check matching user_id
        user_id = getattr(request, 'auth_payload', {}).get('user_id')
        return obj.user_id == user_id
