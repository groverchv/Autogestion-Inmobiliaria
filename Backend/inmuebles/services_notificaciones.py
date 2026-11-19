import os
import logging
from pathlib import Path
from django.conf import settings
from django.core.mail import send_mail
import firebase_admin
from firebase_admin import credentials, messaging

logger = logging.getLogger(__name__)

# Inicialización segura de Firebase Admin SDK (Singleton)
_firebase_initialized = False

def initialize_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return True
    try:
        if firebase_admin._apps:
            _firebase_initialized = True
            return True

        cred_path = getattr(settings, 'FIREBASE_CREDENTIALS_PATH', None)
        if not cred_path:
            cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', 'firebase-credentials.json')

        # Si es ruta relativa, resolver respecto a BASE_DIR
        full_path = Path(cred_path)
        if not full_path.is_absolute():
            full_path = settings.BASE_DIR / cred_path

        if full_path.exists():
            cred = credentials.Certificate(str(full_path))
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("Firebase Admin inicializado correctamente.")
            return True
        else:
            logger.warning(f"No se encontró el archivo de credenciales de Firebase en: {full_path}")
            return False
    except Exception as e:
        logger.error(f"Error al inicializar Firebase Admin: {e}")
        return False


def _build_high_priority_configs():
    """Configuración de prioridad máxima para entrega inmediata (<1s) en Android, iOS y Web."""
    android_cfg = messaging.AndroidConfig(
        priority='high',
        notification=messaging.AndroidNotification(
            channel_id='high_importance_channel',
            priority='max',
            sound='default',
        ),
    )
    apns_cfg = messaging.APNSConfig(
        headers={'apns-priority': '10'},
        payload=messaging.APNSPayload(
            aps=messaging.Aps(sound='default'),
        ),
    )
    webpush_cfg = messaging.WebpushConfig(
        headers={'Urgency': 'high'},
    )
    return android_cfg, apns_cfg, webpush_cfg


def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Envía una notificación push de alta prioridad (<1s) en segundo plano vía FCM.
    """
    if not initialize_firebase():
        logger.warning("FCM no disponible: Firebase no inicializado.")
        return False

    if not fcm_token:
        logger.warning("Token FCM vacío, no se puede enviar push.")
        return False

    sanitized_data = {str(k): str(v) for k, v in (data or {}).items()}
    android_cfg, apns_cfg, webpush_cfg = _build_high_priority_configs()
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=sanitized_data,
        token=fcm_token,
        android=android_cfg,
        apns=apns_cfg,
        webpush=webpush_cfg,
    )

    def _dispatch():
        try:
            response = messaging.send(message)
            logger.info(f"Push alta prioridad enviado con éxito. ID: {response}")
        except Exception as e:
            logger.error(f"Error al enviar notificación push: {e}")

    threading.Thread(target=_dispatch, daemon=True).start()
    return True


def send_push_to_topic(topic: str, title: str, body: str, data: dict = None) -> bool:
    """
    Envía una notificación push de alta prioridad a un canal/tópico en segundo plano.
    """
    if not initialize_firebase():
        return False

    sanitized_data = {str(k): str(v) for k, v in (data or {}).items()}
    android_cfg, apns_cfg, webpush_cfg = _build_high_priority_configs()
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=sanitized_data,
        topic=topic,
        android=android_cfg,
        apns=apns_cfg,
        webpush=webpush_cfg,
    )

    def _dispatch():
        try:
            response = messaging.send(message)
            logger.info(f"Push alta prioridad a topic '{topic}' enviado. ID: {response}")
        except Exception as e:
            logger.error(f"Error al enviar push a topic {topic}: {e}")

    threading.Thread(target=_dispatch, daemon=True).start()
    return True


def send_email_notification(to_email: str, subject: str, message: str, html_message: str = None) -> bool:
    """
    Envía una notificación por correo electrónico usando Django mail (SMTP).
    """
    if not to_email:
        logger.warning("Dirección de correo de destino vacía.")
        return False

    try:
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Inmuebles 360 <noreply@inmuebles360.com>')
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[to_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Correo enviado exitosamente a {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo electrónico a {to_email}: {e}")
        return False
