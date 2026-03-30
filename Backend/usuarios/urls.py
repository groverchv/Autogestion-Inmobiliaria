from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RolViewSet, UsuarioViewSet, RegistroView, AgendaViewSet, NotificacionViewSet

router = DefaultRouter()
router.register(r'roles', RolViewSet)
router.register(r'lista', UsuarioViewSet)
router.register(r'registro', RegistroView, basename='registro')
router.register(r'agenda', AgendaViewSet, basename='agenda')
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('', include(router.urls)),
]
