from rest_framework import viewsets
from .models import TipoPago, Pago, DetallePago, HistorialPago, TipoPlan, Plan
from .serializers import (
    TipoPagoSerializer,
    PagoSerializer,
    DetallePagoSerializer,
    HistorialPagoSerializer,
    TipoPlanSerializer,
    PlanSerializer,
)


class TipoPagoViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de pago."""
    queryset = TipoPago.objects.all()
    serializer_class = TipoPagoSerializer


class PagoViewSet(viewsets.ModelViewSet):
    """CRUD para pagos."""
    queryset = Pago.objects.select_related(
        'contrato', 'tipo_pago', 'usuario'
    ).prefetch_related('detalles').all()
    serializer_class = PagoSerializer

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class DetallePagoViewSet(viewsets.ModelViewSet):
    """CRUD para detalles de pago."""
    queryset = DetallePago.objects.select_related('pago').all()
    serializer_class = DetallePagoSerializer


class HistorialPagoViewSet(viewsets.ReadOnlyModelViewSet):
    """Solo lectura para historial de pagos."""
    queryset = HistorialPago.objects.select_related('pago', 'usuario').all()
    serializer_class = HistorialPagoSerializer


class TipoPlanViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de plan."""
    queryset = TipoPlan.objects.all()
    serializer_class = TipoPlanSerializer


class PlanViewSet(viewsets.ModelViewSet):
    """CRUD para planes."""
    queryset = Plan.objects.select_related('tipo_plan').all()
    serializer_class = PlanSerializer
