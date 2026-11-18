from .models import Notificacion


def _enviar_push_si_token(usuario, titulo, mensaje):
    """Envía notificación push FCM en segundo plano si el usuario tiene un token registrado."""
    if usuario and getattr(usuario, 'fcm_token', None):
        try:
            from inmuebles.services_notificaciones import send_push_notification
            send_push_notification(
                fcm_token=usuario.fcm_token,
                title=titulo,
                body=mensaje,
                data={'tipo': 'notificacion_sistema'}
            )
        except Exception:
            pass


def crear_notificacion_sistema(*, usuario, titulo, mensaje, tipo=Notificacion.TipoNotificacion.INFO):
    notif = Notificacion.objects.create(
        usuario=usuario,
        origen=Notificacion.OrigenNotificacion.SISTEMA,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
    )
    _enviar_push_si_token(usuario, titulo, mensaje)
    return notif


def crear_notificacion_usuario(*, usuario, titulo, mensaje, tipo=Notificacion.TipoNotificacion.CONFIRMACION):
    notif = Notificacion.objects.create(
        usuario=usuario,
        origen=Notificacion.OrigenNotificacion.USUARIO,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
    )
    _enviar_push_si_token(usuario, titulo, mensaje)
    return notif
