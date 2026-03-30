from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Rol, Usuario, Agenda, Notificacion
from .serializers import (
    RolSerializer,
    UsuarioSerializer,
    UsuarioCreateSerializer,
    AgendaSerializer,
    NotificacionSerializer,
)


class RolViewSet(viewsets.ModelViewSet):
    """CRUD para roles del sistema."""
    queryset = Rol.objects.all()
    serializer_class = RolSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    """CRUD para usuarios."""
    queryset = Usuario.objects.select_related('rol').all()

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer

    @action(detail=False, methods=['get'], url_path='me')
    def me(self, request):
        """Retorna el perfil del usuario autenticado."""
        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)


class RegistroView(viewsets.GenericViewSet):
    """Endpoint público para registro de usuarios."""
    serializer_class = UsuarioCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            UsuarioSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class AgendaViewSet(viewsets.ModelViewSet):
    """CRUD para eventos de agenda."""
    serializer_class = AgendaSerializer

    def get_queryset(self):
        return Agenda.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class NotificacionViewSet(viewsets.ModelViewSet):
    """CRUD para notificaciones."""
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=['post'], url_path='marcar-leidas')
    def marcar_leidas(self, request):
        """Marca todas las notificaciones como leídas."""
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'status': 'Notificaciones marcadas como leídas'})
