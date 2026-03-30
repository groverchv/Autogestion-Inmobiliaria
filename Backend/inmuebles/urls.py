from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoInmuebleViewSet,
    InmuebleViewSet,
    MultimediaViewSet,
    TipoContratoViewSet,
    ContratoViewSet,
    ComisionViewSet,
)

router = DefaultRouter()
router.register(r'tipos', TipoInmuebleViewSet)
router.register(r'lista', InmuebleViewSet)
router.register(r'multimedia', MultimediaViewSet)
router.register(r'tipos-contrato', TipoContratoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'comisiones', ComisionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
