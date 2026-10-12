import hmac
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
        token = auth_header.split(' ', 1)[1].strip()
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

    def authenticate_header(self, request):
        # Makes DRF answer 401 (not 403) for missing/expired tokens, which is what the
        # frontend's refresh-token interceptor listens for.
        return 'Bearer realm="api"'


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'auth_payload', {}).get('role') == 'admin'


class IsStaffOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request, 'auth_payload', {}).get('role') in ['admin', 'staff']


class IsInternalService(BasePermission):
    """Service-to-service calls authenticated by a shared X-Internal-Token header."""
    def has_permission(self, request, view):
        expected = getattr(settings, 'INTERNAL_SERVICE_TOKEN', '')
        provided = request.headers.get('X-Internal-Token', '')
        return bool(expected) and hmac.compare_digest(provided, expected)
