from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TipoInmuebleViewSet,
    InmuebleViewSet,
    MultimediaViewSet,
    TipoContratoViewSet,
    ContratoViewSet,
    ComisionViewSet,
    FavoritoViewSet,
)

router = DefaultRouter()
router.register(r'tipos', TipoInmuebleViewSet)
router.register(r'lista', InmuebleViewSet)
router.register(r'multimedia', MultimediaViewSet)
router.register(r'tipos-contrato', TipoContratoViewSet)
router.register(r'contratos', ContratoViewSet)
router.register(r'comisiones', ComisionViewSet)
router.register(r'favoritos', FavoritoViewSet, basename='favoritos')

# Rutas para el panel con filtrado por usuario logueado
router.register(r'panel/tipos', TipoInmuebleViewSet, basename='panel-tipos')
router.register(r'panel/lista', InmuebleViewSet, basename='panel-inmuebles')
router.register(r'panel/contratos', ContratoViewSet, basename='panel-contratos')

urlpatterns = [
    path('', include(router.urls)),
]
