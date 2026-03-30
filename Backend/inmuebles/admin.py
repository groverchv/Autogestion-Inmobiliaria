from django.contrib import admin
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision


@admin.register(TipoInmueble)
class TipoInmuebleAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


class MultimediaInline(admin.TabularInline):
    model = Multimedia
    extra = 1


@admin.register(Inmueble)
class InmuebleAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'propietario', 'ciudad', 'precio', 'estado', 'creado']
    list_filter = ['estado', 'tipo', 'ciudad']
    search_fields = ['titulo', 'direccion', 'ciudad']
    inlines = [MultimediaInline]


@admin.register(Multimedia)
class MultimediaAdmin(admin.ModelAdmin):
    list_display = ['inmueble', 'tipo', 'es_principal', 'subido']
    list_filter = ['tipo', 'es_principal']


@admin.register(TipoContrato)
class TipoContratoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ['id', 'inmueble', 'inquilino', 'tipo_contrato', 'monto', 'estado', 'fecha_inicio']
    list_filter = ['estado', 'tipo_contrato']
    search_fields = ['inmueble__titulo', 'inquilino__username']


@admin.register(Comision)
class ComisionAdmin(admin.ModelAdmin):
    list_display = ['contrato', 'porcentaje', 'monto', 'pagada', 'fecha']
    list_filter = ['pagada']
