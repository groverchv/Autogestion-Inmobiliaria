from rest_framework import viewsets, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision
from .serializers import (
    TipoInmuebleSerializer,
    InmuebleSerializer,
    InmuebleListSerializer,
    MultimediaSerializer,
    TipoContratoSerializer,
    ContratoSerializer,
    ComisionSerializer,
)


class TipoInmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de inmueble."""
    queryset = TipoInmueble.objects.all()
    serializer_class = TipoInmuebleSerializer


class InmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para inmuebles."""
    queryset = Inmueble.objects.select_related('tipo', 'propietario').prefetch_related('multimedia').all()

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
    queryset = Contrato.objects.select_related(
        'inmueble', 'tipo_contrato', 'inquilino'
    ).all()
    serializer_class = ContratoSerializer


class ComisionViewSet(viewsets.ModelViewSet):
    """CRUD para comisiones."""
    queryset = Comision.objects.select_related('contrato').all()
    serializer_class = ComisionSerializer
