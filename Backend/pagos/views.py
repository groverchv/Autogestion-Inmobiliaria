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
    queryset = Pago.objects.all()
    serializer_class = PagoSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Pago.objects.select_related('contrato', 'tipo_pago', 'usuario').prefetch_related('detalles')
        if not user.is_authenticated: return qs.none()
        if user.is_staff or user.rol == 'admin':
            return qs.all()
        # Dueño del pago o dueño del inmueble asociado al contrato
        from django.db.models import Q
        return qs.filter(Q(usuario=user) | Q(contrato__inmueble__propietario=user))

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class DetallePagoViewSet(viewsets.ModelViewSet):
    """CRUD para detalles de pago."""
    queryset = DetallePago.objects.select_related('pago').all()
    serializer_class = DetallePagoSerializer


class HistorialPagoViewSet(viewsets.ReadOnlyModelViewSet):
    """Solo lectura para historial de pagos."""
    queryset = HistorialPago.objects.all()
    serializer_class = HistorialPagoSerializer

    def get_queryset(self):
        user = self.request.user
        qs = HistorialPago.objects.select_related('pago', 'usuario')
        if not user.is_authenticated: return qs.none()
        if user.is_staff or user.rol == 'admin':
            return qs.all()
        # Solo lo relacionado a sus propios pagos
        from django.db.models import Q
        return qs.filter(Q(pago__usuario=user) | Q(pago__contrato__inmueble__propietario=user))


class TipoPlanViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de plan."""
    queryset = TipoPlan.objects.all()
    serializer_class = TipoPlanSerializer


class PlanViewSet(viewsets.ModelViewSet):
    """CRUD para planes."""
    queryset = Plan.objects.select_related('tipo_plan').all()
    serializer_class = PlanSerializer
