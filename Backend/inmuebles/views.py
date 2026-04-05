from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision, Favorito
from .serializers import (
    TipoInmuebleSerializer,
    InmuebleSerializer,
    InmuebleListSerializer,
    MultimediaSerializer,
    TipoContratoSerializer,
    ContratoSerializer,
    ComisionSerializer,
    FavoritoSerializer,
)


class TipoInmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de inmueble."""
    queryset = TipoInmueble.objects.all()
    serializer_class = TipoInmuebleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class InmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para inmuebles."""
    queryset = Inmueble.objects.select_related('tipo', 'propietario').prefetch_related('multimedia').all()

    def get_permissions(self):
        # Permitir ver inmuebles de forma pública
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Inmueble.objects.select_related('tipo', 'propietario').prefetch_related('multimedia')
        
        if self.request.path.startswith('/api/inmuebles/panel/'):
            if user.is_authenticated:
                if user.is_staff or user.rol == 'admin':
                    return qs.all()
                return qs.filter(propietario=user)
            return qs.none()
        return qs.all()

    def get_serializer_class(self):
        if self.action == 'list':
            return InmuebleListSerializer
        return InmuebleSerializer

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)


class MultimediaViewSet(viewsets.ModelViewSet):
    """CRUD para multimedia de inmuebles."""
    queryset = Multimedia.objects.all()
    serializer_class = MultimediaSerializer
    parser_classes = [MultiPartParser, FormParser]


class TipoContratoViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de contrato."""
    queryset = TipoContrato.objects.all()
    serializer_class = TipoContratoSerializer

class ContratoViewSet(viewsets.ModelViewSet):
    """CRUD para contratos."""
    queryset = Contrato.objects.all()
    serializer_class = ContratoSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Contrato.objects.select_related('inmueble', 'tipo_contrato', 'inquilino')
        if user.is_staff or user.rol == 'admin':
            return qs.all()
        # Ver contratos donde es el dueño del inmueble o el inquilino
        from django.db.models import Q
        return qs.filter(Q(inquilino=user) | Q(inmueble__propietario=user))


class ComisionViewSet(viewsets.ModelViewSet):
    """CRUD para comisiones."""
    queryset = Comision.objects.select_related('contrato').all()
    serializer_class = ComisionSerializer


class FavoritoViewSet(viewsets.ModelViewSet):
    """CRUD para favoritos del usuario."""
    serializer_class = FavoritoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorito.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        # Si ya existe, no lo duplica por el constraint unique_together
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        inmueble_id = request.data.get('inmueble')
        if not inmueble_id:
            return Response({'error': 'Falta el ID del inmueble'}, status=400)
        
        fav, created = Favorito.objects.get_or_create(
            usuario=request.user, inmueble_id=inmueble_id
        )
        if not created:
            fav.delete()
            return Response({'is_favorito': False, 'status': 'Quitado de favoritos'})
        
        return Response({'is_favorito': True, 'status': 'Agregado a favoritos'})
