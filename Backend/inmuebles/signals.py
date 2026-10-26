from django.core.cache import cache
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Inmueble, Multimedia, Publicacion, Hotspot


@receiver([post_save, post_delete], sender=Inmueble)
def invalidar_cache_inmueble(sender, instance, **kwargs):
    cache.delete(f'metaverso:{instance.id}')
    cache.delete('ciudades')


@receiver([post_save, post_delete], sender=Publicacion)
def invalidar_cache_publicacion(sender, instance, **kwargs):
    cache.delete(f'metaverso:{instance.inmueble_id}')
    cache.delete('ciudades')


@receiver([post_save, post_delete], sender=Multimedia)
def invalidar_cache_multimedia(sender, instance, **kwargs):
    cache.delete(f'metaverso:{instance.inmueble_id}')


@receiver(post_save, sender=Multimedia)
def precomputar_analisis_espacial(sender, instance, **kwargs):
    """Al subir un panorama se dispara el análisis espacial (YOLO +
    profundidad) en background para que las cotas AR estén listas antes
    de que nadie abra el visor. Si ya tiene objetos_3d no re-analiza."""
    if instance.tipo != 'panorama360' or not instance.archivo:
        return
    if (instance.analisis_visual or {}).get('objetos_3d'):
        return
    try:
        from .services_medida_espacial import MedidaEspacialEngine
        MedidaEspacialEngine.encolar_analisis(instance)
    except Exception:
        pass


@receiver([post_save, post_delete], sender=Hotspot)
def invalidar_cache_hotspot(sender, instance, **kwargs):
    cache.delete(f'metaverso:{instance.inmueble_id}')
