from django.contrib import admin
from .models import TipoPago, Pago, DetallePago, HistorialPago, TipoPlan, Plan, TransaccionStripe, Suscripcion, PagoSuscripcion


@admin.register(TipoPago)
class TipoPagoAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'activo']
    list_filter = ['activo']
    search_fields = ['nombre']


class DetallePagoInline(admin.TabularInline):
    model = DetallePago
    extra = 1


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'contrato', 'usuario', 'monto', 'tipo_pago', 'estado', 'fecha']
    list_filter = ['estado', 'tipo_pago', 'fecha']
    search_fields = ['referencia', 'usuario__username']
    inlines = [DetallePagoInline]


@admin.register(DetallePago)
class DetallePagoAdmin(admin.ModelAdmin):
    list_display = ['pago', 'concepto', 'monto']
    search_fields = ['concepto']


@admin.register(HistorialPago)
class HistorialPagoAdmin(admin.ModelAdmin):
    list_display = ['pago', 'anterior', 'nuevo', 'usuario', 'fecha']
    list_filter = ['nuevo']


@admin.register(TipoPlan)
class TipoPlanAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'descripcion']
    search_fields = ['nombre']


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['nombre', 'tipo_plan', 'precio', 'duracion', 'activo']
    list_filter = ['activo', 'tipo_plan']
    search_fields = ['nombre']


@admin.register(TransaccionStripe)
class TransaccionStripeAdmin(admin.ModelAdmin):
    list_display = ['id', 'contrato', 'pagador', 'propietario', 'monto', 'moneda', 'tipo_operacion', 'estado', 'creado']
    list_filter = ['estado', 'tipo_operacion', 'moneda']
    search_fields = ['stripe_session_id', 'stripe_payment_intent', 'descripcion']
    readonly_fields = ['stripe_session_id', 'stripe_payment_intent', 'comprobante_url']


@admin.register(Suscripcion)
class SuscripcionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'plan', 'estado', 'fecha_vencimiento', 'creado']
    list_filter = ['estado', 'plan']
    search_fields = ['usuario__username', 'usuario__email']


@admin.register(PagoSuscripcion)
class PagoSuscripcionAdmin(admin.ModelAdmin):
    list_display = ['id', 'usuario', 'plan', 'monto', 'metodo', 'estado', 'creado']
    list_filter = ['estado', 'metodo', 'plan']
    search_fields = ['usuario__username', 'usuario__email', 'referencia']
    actions = ['confirmar_pagos', 'rechazar_pagos']

    @admin.action(description='Confirmar pagos seleccionados (activa el plan)')
    def confirmar_pagos(self, request, queryset):
        n = 0
        for pago in queryset.filter(estado=PagoSuscripcion.Estado.EN_REVISION):
            pago.estado = PagoSuscripcion.Estado.COMPLETADO
            pago.save()
            n += 1
        self.message_user(request, f'{n} pago(s) confirmados y planes activados.')

    @admin.action(description='Rechazar pagos seleccionados')
    def rechazar_pagos(self, request, queryset):
        n = queryset.filter(estado=PagoSuscripcion.Estado.EN_REVISION).update(
            estado=PagoSuscripcion.Estado.RECHAZADO
        )
        self.message_user(request, f'{n} pago(s) rechazados.')
