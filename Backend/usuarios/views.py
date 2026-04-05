from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Usuario, Agenda, Notificacion, Chat, Mensaje
from .serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    AgendaSerializer,
    NotificacionSerializer,
    ChatSerializer,
    MensajeSerializer,
)


class UsuarioViewSet(viewsets.ModelViewSet):
    """CRUD para usuarios."""
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me', permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Retorna o actualiza el perfil del usuario autenticado."""
        if request.method in ['PUT', 'PATCH']:
            serializer = UsuarioSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

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

from django.db.models import Q

class ChatViewSet(viewsets.ModelViewSet):
    """CRUD para Chats."""
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Chat.objects.filter(Q(participante1=user) | Q(participante2=user)).distinct()

    def create(self, request, *args, **kwargs):
        part1 = request.data.get('participante1')
        part2 = request.data.get('participante2')
        inm = request.data.get('inmueble')
        
        # Buscar si ya existe el chat en cualquier dirección
        chat = Chat.objects.filter(
            (Q(participante1_id=part1) & Q(participante2_id=part2) & Q(inmueble_id=inm)) |
            (Q(participante1_id=part2) & Q(participante2_id=part1) & Q(inmueble_id=inm))
        ).first()

        if chat:
            serializer = self.get_serializer(chat)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='mensajes')
    def listar_mensajes(self, request, pk=None):
        chat = self.get_object()
        mensajes = chat.mensajes.all().order_by('creado')
        # Marcar como leídos los que no son míos
        mensajes.exclude(remitente=request.user).filter(leido=False).update(leido=True)
        serializer = MensajeSerializer(mensajes, many=True)
        return Response(serializer.data)


class MensajeViewSet(viewsets.ModelViewSet):
    """CRUD para Mensajes."""
    serializer_class = MensajeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Mensaje.objects.filter(Q(chat__participante1=user) | Q(chat__participante2=user)).distinct()

    def perform_create(self, serializer):
        serializer.save(remitente=self.request.user)
