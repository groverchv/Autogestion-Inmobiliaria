"""Servicio de planes de suscripción.

Regla central: `plan_activo(usuario)` siempre devuelve un Plan.
- Si el usuario tiene suscripción activa y vigente → su plan.
- Si venció → se marca vencida y cae al plan gratuito.
- Si nunca tuvo → se le crea una suscripción gratuita activa.
- Si no existe ningún plan gratuito configurado → None (sin límites;
  el sistema no bloquea nada hasta que el negocio defina planes).
"""
import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import Plan, Suscripcion, PagoSuscripcion

log = logging.getLogger(__name__)


def plan_activo(usuario):
    """Devuelve el Plan vigente del usuario (o None si no hay plan gratis)."""
    if not usuario or not usuario.is_authenticated:
        return None

    sus = (
        Suscripcion.objects.filter(usuario=usuario, estado=Suscripcion.Estado.ACTIVA)
        .select_related('plan')
        .first()
    )
    if sus:
        if sus.vigente():
            return sus.plan
        sus.estado = Suscripcion.Estado.VENCIDA
        sus.save(update_fields=['estado'])

    # Sin plan vigente → asignar el gratuito
    gratis = Plan.objects.filter(precio=0, activo=True).order_by('id').first()
    if gratis is None:
        return None
    Suscripcion.objects.get_or_create(
        usuario=usuario,
        plan=gratis,
        estado=Suscripcion.Estado.ACTIVA,
    )
    return gratis


def inmuebles_activos(usuario):
    """Propiedades del usuario que cuentan contra el límite del plan."""
    from inmuebles.models import Inmueble

    return Inmueble.objects.filter(propietario=usuario).exclude(estado='oculto').count()


def validar_crear_inmueble(usuario):
    """Lanza ValidationError si el plan no permite crear más inmuebles."""
    plan = plan_activo(usuario)
    if plan is None:
        return
    usados = inmuebles_activos(usuario)
    if usados >= plan.max_inmuebles:
        raise ValidationError(
            f'Tu plan {plan.nombre} permite hasta {plan.max_inmuebles} '
            f'{"propiedad" if plan.max_inmuebles == 1 else "propiedades"} '
            f'(ya tienes {usados}). Mejora tu plan para publicar más.'
        )


def validar_multimedia(usuario, inmueble, tipo):
    """Lanza ValidationError si la subida excede lo que permite el plan."""
    plan = plan_activo(usuario)
    if plan is None:
        return

    if tipo == 'panorama360' and not plan.permite_360:
        raise ValidationError(
            f'Tu plan {plan.nombre} no incluye tours 360. '
            'Mejora tu plan para agregarlos.'
        )

    if plan.max_fotos and tipo == 'imagen':
        usados = inmueble.multimedia.filter(tipo='imagen').count()
        if usados >= plan.max_fotos:
            raise ValidationError(
                f'Tu plan {plan.nombre} permite hasta {plan.max_fotos} fotos por propiedad. '
                'Mejora tu plan para subir más.'
            )


def validar_destacado(usuario):
    """Lanza ValidationError si el plan no permite marcar destacadas."""
    plan = plan_activo(usuario)
    if plan is None:
        return
    if not plan.permite_destacado:
        raise ValidationError(
            f'Tu plan {plan.nombre} no incluye propiedades destacadas. '
            'Mejora tu plan para destacarla en el catálogo.'
        )


def activar_suscripcion(pago: PagoSuscripcion):
    """Activa (o extiende) la suscripción del usuario al plan pagado.

    Se llama cuando PagoSuscripcion pasa a estado 'completado'.
    """
    hoy = timezone.now().date()
    actual = Suscripcion.objects.filter(
        usuario=pago.usuario, estado=Suscripcion.Estado.ACTIVA
    ).first()

    # La suscripción vigente del mismo plan se extiende; cualquier otra se reemplaza.
    if actual and actual.plan_id == pago.plan_id:
        base = max(hoy, actual.fecha_vencimiento or hoy)
        actual.fecha_vencimiento = base + timedelta(days=30 * pago.plan.duracion)
        actual.save(update_fields=['fecha_vencimiento'])
        return actual

    Suscripcion.objects.filter(
        usuario=pago.usuario, estado=Suscripcion.Estado.ACTIVA
    ).update(estado=Suscripcion.Estado.CANCELADA)

    return Suscripcion.objects.create(
        usuario=pago.usuario,
        plan=pago.plan,
        estado=Suscripcion.Estado.ACTIVA,
        fecha_vencimiento=hoy + timedelta(days=30 * pago.plan.duracion),
    )
