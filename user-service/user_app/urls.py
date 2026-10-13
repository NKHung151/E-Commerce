from django.urls import path, include
from rest_framework.routers import SimpleRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import AdminUserViewSet, CustomTokenObtainPairView, MeViewSet, RegisterView

router = SimpleRouter()
router.register(r'users', MeViewSet, basename='user')

admin_router = SimpleRouter()
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
