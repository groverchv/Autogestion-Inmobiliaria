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


def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> bool:
    """
    Envía una notificación push a un dispositivo específico (Web o Móvil) vía FCM.
    """
    if not initialize_firebase():
        logger.warning("FCM no disponible: Firebase no inicializado.")
        return False

    if not fcm_token:
        logger.warning("Token FCM vacío, no se puede enviar push.")
        return False

    try:
        sanitized_data = {str(k): str(v) for k, v in (data or {}).items()}
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=sanitized_data,
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info(f"Push enviado con éxito. ID: {response}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar notificación push: {e}")
        return False


def send_push_to_topic(topic: str, title: str, body: str, data: dict = None) -> bool:
    """
    Envía una notificación push a un canal/tópico (ej. 'inmuebles_nuevos', 'alertas').
    """
    if not initialize_firebase():
        return False

    try:
        sanitized_data = {str(k): str(v) for k, v in (data or {}).items()}
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=sanitized_data,
            topic=topic,
        )
        response = messaging.send(message)
        logger.info(f"Push a topic '{topic}' enviado. ID: {response}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar push a topic {topic}: {e}")
        return False


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
