from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoPagoViewSet,
    PagoViewSet,
    DetallePagoViewSet,
    HistorialPagoViewSet,
    TipoPlanViewSet,
    PlanViewSet,
)

router = DefaultRouter()
router.register(r'tipos-pago', TipoPagoViewSet)
router.register(r'lista', PagoViewSet)
router.register(r'detalles', DetallePagoViewSet)
router.register(r'historial', HistorialPagoViewSet)
router.register(r'tipos-plan', TipoPlanViewSet)
router.register(r'planes', PlanViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
