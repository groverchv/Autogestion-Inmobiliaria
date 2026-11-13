"""
Django settings for Autogestión Inmobiliaria.
"""
import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-key')

DEBUG = os.getenv('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [h.strip() for h in os.getenv('ALLOWED_HOSTS', '*').split(',')]

# ─── Seguridad en producción (activas solo con DEBUG=False) ──────
if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True') == 'True'
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

X_FRAME_OPTIONS = 'SAMEORIGIN'

# ─── Aplicaciones ────────────────────────────────────────────────
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'cloudinary_storage',
    'cloudinary',
    'django_filters',
    'channels',
    'django.contrib.postgres',
    # Local apps
    'usuarios',
    'inmuebles',
    'pagos',
]

# ─── Middleware ───────────────────────────────────────────────────
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

redis_url = os.getenv('REDIS_URL')
if redis_url:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                "hosts": [redis_url],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }

# ─── Base de Datos ───────────────────────────────────────────────
db_url = os.getenv('DATABASE_URL')
if db_url and (db_url.startswith('postgres://') or db_url.startswith('postgresql://')):
    from urllib.parse import urlparse
    url = urlparse(db_url)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': url.path[1:],
            'USER': url.username,
            'PASSWORD': url.password,
            'HOST': url.hostname,
            'PORT': url.port or '5432',
            'CONN_MAX_AGE': int(os.getenv('CONN_MAX_AGE', '60')),
            'CONN_HEALTH_CHECKS': True,
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
            'NAME': os.getenv('DB_NAME', 'autogestion'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
            # 0 en dev (runserver crea threads ilimitados → agota conexiones).
            # En producción con workers acotados usar CONN_MAX_AGE=60 + pgbouncer.
            'CONN_MAX_AGE': int(os.getenv('CONN_MAX_AGE', '0')),
            'CONN_HEALTH_CHECKS': True,
        }
    }

# ─── Cache ───────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': (
            'django.core.cache.backends.redis.RedisCache'
            if os.getenv('REDIS_URL')
            else 'django.core.cache.backends.locmem.LocMemCache'
        ),
        'LOCATION': os.getenv('REDIS_URL', 'autogestion-locmem'),
        'TIMEOUT': 300,
    }
}

# ─── Contraseñas ─────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internacionalización ───────────────────────────────────────
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/La_Paz'
USE_I18N = True
USE_TZ = True

# ─── Archivos estáticos y media ─────────────────────────────────
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Permitir subida y análisis de fotos HD / Data-URIs en Base64 hasta 100MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 104857600  # 100 MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 10000

# ─── Modelo de usuario personalizado ────────────────────────────
AUTH_USER_MODEL = 'usuarios.Usuario'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Django REST Framework ──────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# ─── Simple JWT ─────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# ─── CORS & Acceso de Clientes (Móvil / Web) ───────────────────
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True') == 'True'
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()
]
# Orígenes por regex (ej. cualquier puerto localhost para `flutter run` en dev)
CORS_ALLOWED_ORIGIN_REGEXES = [
    o.strip() for o in os.getenv('CORS_ALLOWED_ORIGIN_REGEXES', '').split(',') if o.strip()
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ['*']
CORS_ALLOW_METHODS = ['*']
CSRF_ALLOW_ALL_ORIGINS = True
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:*',
    'http://127.0.0.1:*',
    'http://10.0.2.2:*',
    'http://192.168.*',
] + [o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',') if o.strip()]

# ─── Cloudinary (almacenamiento de imágenes) ───────────────────
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.getenv('CLOUDINARY_CLOUD_NAME', ''),
    'API_KEY': os.getenv('CLOUDINARY_API_KEY', ''),
    'API_SECRET': os.getenv('CLOUDINARY_API_SECRET', ''),
}

DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# ─── Stripe (Pasarela de pagos) ─────────────────────────────
STRIPE_PUBLIC_KEY = os.getenv('STRIPE_PUBLIC_KEY', '')
STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
# Tasa Bs → USD para cobrar planes en Stripe (BOB no es moneda soportada por Stripe)
STRIPE_TASA_USD_BOB = float(os.getenv('STRIPE_TASA_USD_BOB', '6.96'))

# ─── Frontend URL ───────────────────────────────────────────
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')

# ─── Groq (IA Generativa) ───────────────────────────────────
GROQ_API_KEY = os.getenv('GROQ_API_KEY', '')
# Modelo con capacidad de visión para el asistente 360°. Vacío = la cuenta
# de Groq no expone modelos de visión y se omite de la cadena de respaldo.
GROQ_VISION_MODEL = os.getenv('GROQ_VISION_MODEL', '')
# Modelo de texto de Groq (respaldo de la cadena LLM; los llama-3.x fueron retirados)
GROQ_TEXT_MODEL = os.getenv('GROQ_TEXT_MODEL', 'openai/gpt-oss-20b')

# ─── Google Gemini API ──────────────────────────────────────
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
# Modelo Gemini con visión para el asistente 360° (primer proveedor de la cadena)
GEMINI_VISION_MODEL = os.getenv('GEMINI_VISION_MODEL', 'gemini-2.5-flash')
# Modelos de respaldo si el principal agota cuota (cada uno tiene cuota propia)
GEMINI_VISION_FALLBACK_MODELS = os.getenv(
    'GEMINI_VISION_FALLBACK_MODELS',
    'gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash',
)

# ─── IA Local (LM Studio) ───────────────────────────────────
LOCAL_AI_URL = os.getenv('LOCAL_AI_URL', 'http://192.168.56.1:1234/v1/chat/completions')
LOCAL_AI_MODEL = os.getenv('LOCAL_AI_MODEL', 'meta-llama-3.1-8b-instruct')

# ─── Blockchain Gateway ──────────────────────────────────────
BLOCKCHAIN_GATEWAY_URL = os.getenv('BLOCKCHAIN_GATEWAY_URL', 'http://localhost:4000')
if BLOCKCHAIN_GATEWAY_URL and not BLOCKCHAIN_GATEWAY_URL.endswith('/api/blockchain'):
    BLOCKCHAIN_GATEWAY_URL = BLOCKCHAIN_GATEWAY_URL.rstrip('/') + '/api/blockchain'



