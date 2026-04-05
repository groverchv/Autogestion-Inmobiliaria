from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Usuario, Agenda, Notificacion
from .serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    AgendaSerializer,
    NotificacionSerializer,
)


class UsuarioViewSet(viewsets.ModelViewSet):
    """CRUD para usuarios."""
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer

    @action(detail=False, methods=['get'], url_path='me', permission_classes=[permissions.IsAuthenticated])
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin ve todas las agendas
        if user.is_staff or user.rol == 'admin':
            return Agenda.objects.all()
        return Agenda.objects.filter(usuario=user)

    def perform_create(self, serializer):
        # Si no manda usuario, asigna el autenticado
        if 'usuario' not in serializer.validated_data:
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()


class NotificacionViewSet(viewsets.ModelViewSet):
    """CRUD para notificaciones."""
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Admin ve todas las notificaciones
        if user.is_staff or user.rol == 'admin':
            return Notificacion.objects.all()
        return Notificacion.objects.filter(usuario=user)

    def perform_create(self, serializer):
        if 'usuario' not in serializer.validated_data:
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()

    @action(detail=False, methods=['post'], url_path='marcar-leidas')
    def marcar_leidas(self, request):
        """Marca todas las notificaciones como leídas."""
        self.get_queryset().filter(leida=False).update(leida=True)
        return Response({'status': 'Notificaciones marcadas como leídas'})
