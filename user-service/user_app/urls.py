from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet, CustomTokenObtainPairView, StaffUserViewSet, AdminUserViewSet

# Public / auth router
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# Staff router (staff endpoints use /staff/ prefix)
staff_router = DefaultRouter()
staff_router.register(r'users', StaffUserViewSet, basename='staff-user')

# Admin router (admin endpoints use /admin/ prefix)
admin_router = DefaultRouter()
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', UserViewSet.as_view({'post': 'register'}), name='register'),
    path('', include(router.urls)),
    path('staff/', include(staff_router.urls)),
    path('admin/', include(admin_router.urls)),
]
