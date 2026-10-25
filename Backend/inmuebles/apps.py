from django.apps import AppConfig


class InmueblesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inmuebles'
    verbose_name = 'Gestión de Inmuebles'

    def ready(self):
        from . import signals
