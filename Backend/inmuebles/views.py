from rest_framework import viewsets, permissions, status, filters
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
from django_filters.rest_framework import DjangoFilterBackend
import django_filters


class UnaccentSearchFilter(filters.SearchFilter):
    def construct_search(self, field_name, queryset=None):
        lookup = self.lookup_prefixes.get(field_name[0])
        if lookup:
            field_name = field_name[1:]
        else:
            lookup = 'unaccent__icontains'
        return "__".join([field_name, lookup])


class InmuebleFilter(django_filters.FilterSet):
    precio_min = django_filters.NumberFilter(field_name="precio", lookup_expr='gte')
    precio_max = django_filters.NumberFilter(field_name="precio", lookup_expr='lte')
    superficie_min = django_filters.NumberFilter(field_name="superficie", lookup_expr='gte')
    superficie_max = django_filters.NumberFilter(field_name="superficie", lookup_expr='lte')
    ciudad = django_filters.CharFilter(field_name="direccion__ciudad", lookup_expr='icontains')
    zona = django_filters.CharFilter(field_name="direccion__zona", lookup_expr='icontains')
    habitaciones_min = django_filters.NumberFilter(field_name="habitaciones", lookup_expr='gte')
    banos_min = django_filters.NumberFilter(field_name="banos", lookup_expr='gte')
    garaje = django_filters.BooleanFilter(field_name="garaje")

    class Meta:
        model = Inmueble
        fields = ['estado', 'tipo', 'habitaciones', 'banos']

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
    filter_backends = [DjangoFilterBackend, UnaccentSearchFilter]
    filterset_class = InmuebleFilter
    search_fields = ['titulo', 'descripcion', 'direccion__ciudad', 'direccion__zona', 'direccion__calle', 'direccion__referencia']

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
            
        # Para catálogo público, no mostrar ocultos
        return qs.exclude(estado='oculto')

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

    def create(self, request, *args, **kwargs):
        import cloudinary
        import cloudinary.uploader
        from django.conf import settings

        # Explicit configuration
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
            api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
            api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
        )
        
        file_obj = request.FILES.get('archivo')
        inmueble_id = request.data.get('inmueble')
        es_principal = request.data.get('principal') == 'true' or request.data.get('es_principal') == 'true'
        tipo = request.data.get('tipo', 'imagen')

        if not file_obj or not inmueble_id:
            return Response({'error': 'Archivo e inmueble requeridos'}, status=400)

        # Subir el archivo a Cloudinary
        upload_data = cloudinary.uploader.upload(
            file_obj, 
            resource_type='auto' if tipo == 'video' else 'image'
        )
        url = upload_data.get('secure_url')

        # Crear el registro en base de datos con la URL absoluta
        media = Multimedia.objects.create(
            inmueble_id=inmueble_id,
            tipo=tipo,
            principal=es_principal,
            archivo=url
        )
        
        serializer = self.get_serializer(media)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
