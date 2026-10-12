from django.contrib import admin
from django.urls import path, include
from shipping_app.views import health_check


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check),
    path('api/v1/', include('shipping_app.urls')),
]
