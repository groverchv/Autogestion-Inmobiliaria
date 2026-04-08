from django.contrib import admin
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision, Direccion


@admin.register(TipoInmueble)
class TipoInmuebleAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


class MultimediaInline(admin.TabularInline):
    model = Multimedia
    extra = 1


@admin.register(Direccion)
class DireccionAdmin(admin.ModelAdmin):
    list_display = ['ciudad', 'zona', 'calle']
    search_fields = ['ciudad', 'zona', 'calle']


@admin.register(Inmueble)
class InmuebleAdmin(admin.ModelAdmin):
    list_display = ['titulo', 'tipo', 'propietario', 'get_ciudad', 'precio', 'estado', 'creado']
    list_filter = ['estado', 'tipo', 'direccion_fk__ciudad']
    search_fields = ['titulo', 'direccion_fk__calle', 'direccion_fk__ciudad']
    inlines = [MultimediaInline]

    def get_ciudad(self, obj):
        return obj.direccion_fk.ciudad if obj.direccion_fk else 'N/A'
    get_ciudad.short_description = 'Ciudad'


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
