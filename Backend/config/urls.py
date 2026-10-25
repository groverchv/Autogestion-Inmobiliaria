"""
URL configuration for Autogestión Inmobiliaria.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenRefreshView,
)
from usuarios.views import CustomTokenObtainPairView
from django.http import JsonResponse
from django.db import connection


def health_check(request):
    """Health check ligero para monitoreo/deploy (Railway, uptime)."""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    return JsonResponse(
        {'status': 'ok' if db_ok else 'degraded', 'db': db_ok},
        status=200 if db_ok else 503,
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),

    # ─── JWT Authentication ─────────────────────────────────────
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ─── API Routes ─────────────────────────────────────────────
    path('api/usuarios/', include('usuarios.urls')),
    path('api/inmuebles/', include('inmuebles.urls')),
    path('api/pagos/', include('pagos.urls')),
]

# Servir archivos media en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
