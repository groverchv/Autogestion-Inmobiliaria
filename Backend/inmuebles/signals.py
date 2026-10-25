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


@receiver([post_save, post_delete], sender=Hotspot)
def invalidar_cache_hotspot(sender, instance, **kwargs):
    cache.delete(f'metaverso:{instance.inmueble_id}')
