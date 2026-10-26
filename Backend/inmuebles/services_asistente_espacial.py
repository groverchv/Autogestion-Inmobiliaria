import base64
import json
import logging
import os
import re
from io import BytesIO
from typing import Any, Dict, Optional, Tuple

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_VISION_MODEL = getattr(settings, 'GROQ_VISION_MODEL', '')

class AsistenteEspacialEngine:
    """
    Asistente de consultas en lenguaje natural sobre un inmueble y sus
    panoramas 360°.

    Fuentes de verdad:
    - Datos estructurados del inmueble (precio, superficie, ambientes) -> BD.
    - Contenido visual de un panorama -> modelo de visión (Groq) sobre la
      imagen real. Nunca se afirma un objeto sin evidencia.
    - Medidas -> solo datos registrados o estimaciones declaradas como
      aproximadas. Sin calibración no se prometen medidas exactas.
    """

    # ────────────────────────── Visión (Groq) ──────────────────────────

    @classmethod
    def _url_a_base64(cls, url: str) -> Optional[str]:
        """Descarga una imagen (URL http o ruta de media local) y la devuelve
        en base64 JPEG reducida para el modelo de visión. El resultado se
        cachea 1h por URL: el mismo panorama se reusa en todas las
        preguntas visuales sin volver a descargarlo."""
        if not url:
            return None
        import hashlib
        from django.core.cache import cache
        clave = 'pano_b64:' + hashlib.sha1(url.encode()).hexdigest()
        try:
            cacheado = cache.get(clave)
            if cacheado is not None:
                return cacheado or None
        except Exception:
            pass
        try:
            from PIL import Image

            if url.startswith('http://') or url.startswith('https://'):
                # Si apunta a localhost o 127.0.0.1 intentar leer directamente de MEDIA_ROOT
                if ('localhost' in url or '127.0.0.1' in url) and '/media/' in url:
                    rel = url.split('/media/')[-1]
                    local_path = os.path.join(str(settings.MEDIA_ROOT), rel.replace('/', os.sep))
                    if os.path.exists(local_path):
                        with open(local_path, 'rb') as f:
                            raw = f.read()
                    else:
                        resp = requests.get(url, timeout=15)
                        resp.raise_for_status()
                        raw = resp.content
                else:
                    resp = requests.get(url, timeout=15)
                    resp.raise_for_status()
                    raw = resp.content
            else:
                rel = url.lstrip('/')
                if rel.startswith('media/'):
                    rel = rel[len('media/'):]
                local_path = os.path.join(str(settings.MEDIA_ROOT), rel.replace('/', os.sep))
                if not os.path.exists(local_path):
                    logger.warning('Archivo media local no encontrado: %s', local_path)
                    return None
                with open(local_path, 'rb') as f:
                    raw = f.read()

            img = Image.open(BytesIO(raw)).convert('RGB')
            img.thumbnail((1568, 1568))
            buf = BytesIO()
            img.save(buf, 'JPEG', quality=82)
            b64 = base64.b64encode(buf.getvalue()).decode('ascii')
            try:
                cache.set(clave, b64, 3600)
            except Exception:
                pass
            return b64
        except Exception as e:
            logger.warning('No se pudo cargar imagen para visión (%s): %s', url, e)
            return None

    @classmethod
    def _llamar_chat(
        cls,
        url: str,
        api_key: Optional[str],
        model: str,
        messages: list,
        max_tokens: int,
    ) -> Optional[str]:
        """Llamada OpenAI-compatible (Groq / LM Studio / cualquier endpoint)."""
        from .services_llm import marcar_proveedor_caido, proveedor_activo
        nombre = 'groq' if 'groq' in url else ('local' if api_key is None else url)
        if not proveedor_activo(nombre):
            return None
        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        try:
            resp = requests.post(
                url,
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": max_tokens,
                },
                headers=headers,
                timeout=10 if nombre != 'local' else 6,
            )
            if resp.status_code != 200:
                logger.warning('%s respondió %s: %s', url, resp.status_code, resp.text[:200])
                if resp.status_code in (429, 500, 502, 503, 504):
                    marcar_proveedor_caido(nombre)
                return None
            return resp.json()['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.warning('Error llamando a %s: %s', url, e)
            marcar_proveedor_caido(nombre)
            return None

    @classmethod
    def _llamar_gemini(
        cls,
        sistema: str,
        prompt_usuario: str,
        img_b64: Optional[str] = None,
        max_tokens: int = 250,
    ) -> Optional[str]:
        """Llamada a la API nativa de Gemini (generateContent).
        Soporta texto + imagen inline; con img_b64=None funciona como LLM
        de solo texto."""
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        from .services_llm import marcar_proveedor_caido, proveedor_activo
        if not api_key or not proveedor_activo('gemini'):
            return None
        # Cadena de modelos: el principal configurado + fallbacks conocidos.
        # gemini-2.5-flash suele agotar su cuota gratuita; los -lite tienen
        # cuota independiente y soportan visión.
        principal = getattr(settings, 'GEMINI_VISION_MODEL', 'gemini-2.5-flash')
        extra = getattr(
            settings, 'GEMINI_VISION_FALLBACK_MODELS',
            'gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.5-flash',
        )
        modelos = []
        for m in f'{principal},{extra}'.split(','):
            m = m.strip()
            if m and m not in modelos:
                modelos.append(m)

        parts = [{"text": prompt_usuario}]
        if img_b64:
            parts.append({
                "inline_data": {"mime_type": "image/jpeg", "data": img_b64},
            })

        ultimo_error = None
        for model in modelos:
            generation_config = {
                "maxOutputTokens": max_tokens,
                "temperature": 0.2,
            }
            # Solo la familia 2.5 soporta thinkingBudget: 0
            if '2.5' in model:
                generation_config["thinkingConfig"] = {"thinkingBudget": 0}
            url = (
                f'https://generativelanguage.googleapis.com/v1beta/models/'
                f'{model}:generateContent?key={api_key}'
            )
            try:
                resp = requests.post(
                    url,
                    json={
                        "system_instruction": {"parts": [{"text": sistema}]},
                        "contents": [{"parts": parts}],
                        "generationConfig": generation_config,
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=12,
                )
            except Exception as e:
                logger.warning('Error llamando a Gemini (%s): %s', model, e)
                ultimo_error = e
                continue
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    candidatos = data.get('candidates') or []
                    if not candidatos:
                        ultimo_error = f'{model}: sin candidatos'
                        continue
                    partes = (candidatos[0].get('content') or {}).get('parts') or []
                    texto = ''.join(p.get('text', '') for p in partes).strip()
                    if texto:
                        return texto
                    ultimo_error = f'{model}: respuesta vacía'
                except Exception as e:
                    logger.warning('Error parseando respuesta de Gemini (%s): %s', model, e)
                    ultimo_error = e
                continue
            logger.warning('Gemini (%s) respondió %s: %s', model, resp.status_code, resp.text[:300])
            ultimo_error = f'{model}: HTTP {resp.status_code}'
            # 400/404/429/5xx -> probar el siguiente modelo de la cadena
            continue

        # Todos los modelos fallaron: marcar el proveedor solo si fue por
        # cuota/servidor (429/5xx/timeout), no por errores de parseo puntuales.
        if ultimo_error is not None:
            err = str(ultimo_error)
            if any(c in err for c in ('429', '500', '502', '503', '504')) or not isinstance(ultimo_error, str):
                marcar_proveedor_caido('gemini')
        return None

    @classmethod
    def _proveedores_vision(cls) -> list:
        """Cadena OpenAI-compatible de respaldo: Groq -> VLM local (LM Studio)."""
        proveedores = []
        if getattr(settings, 'GROQ_API_KEY', '') and GROQ_VISION_MODEL:
            proveedores.append((GROQ_API_URL, settings.GROQ_API_KEY, GROQ_VISION_MODEL))
        local_url = getattr(settings, 'LOCAL_AI_URL', '')
        if local_url:
            proveedores.append((local_url, None, getattr(settings, 'LOCAL_AI_MODEL', 'local-vlm')))
        return proveedores

    @classmethod
    def _vision_groq(
        cls,
        prompt_usuario: str,
        img_b64: Optional[str],
        sistema: Optional[str] = None,
        max_tokens: int = 250,
    ) -> Optional[str]:
        sistema = sistema or (
            "Eres el asistente visual de un recorrido 360° de una propiedad "
            "inmobiliaria en Bolivia. Respondes en español, de forma breve "
            "(máximo 2 oraciones) y SOLO sobre lo que realmente se aprecia en "
            "la imagen panorámica.\n"
            "REGLAS ESTRICTAS:\n"
            "1. Nunca afirmes que existe un objeto que no se ve claramente.\n"
            "2. Si preguntan por algo que no se ve, dilo con claridad.\n"
            "3. Si preguntan medidas, da una estimación APROXIMADA usando "
            "referencias visibles (una puerta interior estándar mide ~2.10 m "
            "de alto) y aclara siempre que es aproximado.\n"
            "4. No inventes marcas, acabados ni características.\n"
            "5. Si la imagen no permite responder, di 'No puedo determinarlo "
            "desde esta imagen'."
        )

        content = [{"type": "text", "text": prompt_usuario}]
        if img_b64:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
            })

        # Cadena de visión: Gemini -> Groq -> VLM local (LM Studio)
        texto = cls._llamar_gemini(sistema, prompt_usuario, img_b64, max_tokens)
        if texto:
            return texto

        messages = [
            {"role": "system", "content": sistema},
            {"role": "user", "content": content},
        ]

        for url, key, model in cls._proveedores_vision():
            texto = cls._llamar_chat(url, key, model, messages, max_tokens)
            if texto:
                return texto
        return None

    @classmethod
    def _texto_groq(cls, prompt_usuario: str, sistema: str, max_tokens: int = 60) -> Optional[str]:
        """LLM de solo texto (clasificador de intención). Gemini -> Groq -> local."""
        texto = cls._llamar_gemini(sistema, prompt_usuario, None, max_tokens)
        if texto:
            return texto
        proveedores = []
        if getattr(settings, 'GROQ_API_KEY', ''):
            proveedores.append((GROQ_API_URL, settings.GROQ_API_KEY, getattr(settings, 'GROQ_TEXT_MODEL', 'llama-3.1-8b-instant')))
        local_url = getattr(settings, 'LOCAL_AI_URL', '')
        if local_url:
            proveedores.append((local_url, None, getattr(settings, 'LOCAL_AI_MODEL', 'local-llm')))
        messages = [
            {"role": "system", "content": sistema},
            {"role": "user", "content": prompt_usuario},
        ]
        for url, key, model in proveedores:
            texto = cls._llamar_chat(url, key, model, messages, max_tokens)
            if texto:
                return texto
        return None

    # ────────────────────── Resolución del panorama ──────────────────────

    @classmethod
    def _resolver_panorama(
        cls,
        inmueble_obj: Any,
        panorama_id: Optional[int] = None,
        foto_360_url: Optional[str] = None,
    ) -> Tuple[Optional[Any], Optional[str]]:
        """Devuelve (panorama Multimedia, url_imagen) del panorama que el
        usuario está viendo, o el primero disponible del inmueble."""
        if not inmueble_obj:
            return None, foto_360_url

        qs = inmueble_obj.multimedia.filter(tipo='panorama360').order_by('orden')
        pano = None

        if panorama_id:
            pano = qs.filter(id=panorama_id).first()

        if pano is None and foto_360_url:
            pano = qs.filter(archivo=foto_360_url).first()
            if pano is None:
                for p in qs:
                    if p.archivo and (
                        foto_360_url.endswith(str(p.archivo))
                        or str(p.archivo) in foto_360_url
                    ):
                        pano = p
                        break

        if pano is None:
            pano = qs.first()

        url = foto_360_url
        if pano is not None:
            url = str(pano.archivo)
        return pano, url

    # ──────────────────── Análisis de escena (cacheado) ────────────────────

    @classmethod
    def analizar_panorama(cls, panorama: Any, forzar: bool = False) -> Optional[Dict[str, Any]]:
        """
        Analiza el contenido real de un panorama con visión y lo cachea en
        Multimedia.analisis_visual. Devuelve dict con descripcion/objetos o None.
        """
        if panorama is None:
            return None

        cache = getattr(panorama, 'analisis_visual', None)
        if cache and not forzar:
            return cache

        img_b64 = cls._url_a_base64(str(panorama.archivo))
        if not img_b64:
            return None

        prompt = (
            "Analiza esta imagen panorámica 360° de un ambiente de una "
            "propiedad inmobiliaria. Responde SOLO con JSON válido (sin texto "
            "extra) con esta estructura:\n"
            '{"descripcion": "descripción breve y fiel de lo que se ve",\n'
            ' "objetos": [{"nombre": "nombre del objeto visible", '
            '"posicion": "izquierda|centro|derecha|arriba|abajo", '
            '"dimension_aprox": "ej: ~1.20 m de alto (opcional, solo si se '
            'puede estimar)"}],\n'
            ' "elementos_arquitectonicos": ["ventana", "puerta", ...]}\n'
            "Incluye solo objetos claramente visibles. Si el ambiente está "
            "vacío, la lista de objetos queda vacía."
        )

        texto = cls._vision_groq(prompt, img_b64, max_tokens=500)
        if not texto:
            return None

        try:
            limpio = texto.strip()
            if limpio.startswith('```'):
                limpio = re.sub(r'^```[a-zA-Z]*\n?|```$', '', limpio).strip()
            data = json.loads(limpio)
        except (ValueError, TypeError):
            data = {'descripcion': texto[:400], 'objetos': [], 'elementos_arquitectonicos': []}

        if not isinstance(data, dict):
            return None

        data.setdefault('objetos', [])
        data.setdefault('elementos_arquitectonicos', [])
        try:
            panorama.analisis_visual = data
            panorama.save(update_fields=['analisis_visual'])
        except Exception as e:
            logger.warning('No se pudo cachear analisis_visual: %s', e)

        return data

    # ─────────────────────── Contexto del inmueble ───────────────────────

    @classmethod
    def _publicacion_activa(cls, inmueble_obj: Any):
        """Publicación comercial activa del inmueble (precio y tipo de oferta
        viven ahí, no en el inmueble físico)."""
        if not inmueble_obj:
            return None
        pubs = inmueble_obj.publicaciones.order_by('-creado')
        activa = pubs.filter(estado='activa').first()
        return activa or pubs.first()

    @classmethod
    def _contexto_inmueble(cls, inmueble_obj: Any) -> str:
        if not inmueble_obj:
            return ''
        partes = [f"Propiedad: {getattr(inmueble_obj, 'titulo', 'inmueble')}."]
        tipo = getattr(getattr(inmueble_obj, 'tipo', None), 'nombre', None)
        if tipo:
            partes.append(f"Tipo: {tipo}.")
        return ' '.join(partes)

    @classmethod
    def _vision_disponible(cls) -> bool:
        """True si algún proveedor de visión (Gemini/Groq/VLM local) no
        está marcado caído por el circuit breaker."""
        from .services_llm import proveedor_activo
        if getattr(settings, 'GEMINI_API_KEY', '') and proveedor_activo('gemini'):
            return True
        for url, _key, _model in cls._proveedores_vision():
            nombre = 'groq' if 'groq' in url else 'local'
            if proveedor_activo(nombre):
                return True
        return False

    @staticmethod
    def _direccion_relativa(obj_yaw, cam_yaw) -> str:
        """Dirección del objeto respecto a donde mira el usuario."""
        if obj_yaw is None or cam_yaw is None:
            return ''
        rel = ((float(obj_yaw) - float(cam_yaw) + 540.0) % 360.0) - 180.0
        if abs(rel) < 35.0:
            return 'frente a ti'
        if 35.0 <= rel <= 145.0:
            return 'a tu derecha'
        if -145.0 <= rel <= -35.0:
            return 'a tu izquierda'
        return 'detrás de ti'

    @classmethod
    def _analisis_color_luz(cls, pano) -> str:
        """Colores dominantes e iluminación de la foto real con OpenCV.
        Devuelve texto honesto o '' si no se pudo analizar."""
        try:
            import cv2
            import numpy as np
            from .services_auditoria import AuditoriaVisionEngine
            img = AuditoriaVisionEngine._cargar_cv2_image(str(getattr(pano, 'archivo', '') or ''))
            if img is None:
                return ''
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            brillo = float(hsv[..., 2].mean())
            sat = float(hsv[..., 1].mean())
            if brillo < 60:
                luz = 'bastante oscura'
            elif brillo < 120:
                luz = 'con iluminación media'
            else:
                luz = 'bien iluminada'
            # Colores dominantes: kmeans sobre la imagen reducida
            small = cv2.resize(img, (64, 32)).reshape(-1, 3).astype(np.float32)
            _, labels, centers = cv2.kmeans(
                small, 3, None,
                (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0),
                3, cv2.KMEANS_PP_CENTERS)
            orden = np.argsort(np.bincount(labels.flatten()))[::-1]
            nombres = []
            for i in orden:
                n = cls._nombre_color(centers[i])
                if n and n not in nombres:
                    nombres.append(n)
            tonos = ' y '.join(nombres[:2]) if nombres else 'tonos neutros'
            viveza = 'apagados' if sat < 60 else ('naturales' if sat < 130 else 'intensos')
            return (
                f"La foto se ve {luz}, con tonos dominantes {tonos} "
                f"de saturación {viveza}. Es un análisis automático de la imagen real."
            )
        except Exception:
            return ''

    @staticmethod
    def _nombre_color(bgr) -> str:
        """Nombre aproximado de un color BGR (para describir la foto)."""
        try:
            import cv2
            import numpy as np
            h, s, v = cv2.cvtColor(
                np.uint8([[bgr]]), cv2.COLOR_BGR2HSV)[0, 0]
            h, s, v = int(h), int(s), int(v)
            if v < 45:
                return 'negro'
            if s < 35:
                return 'blanco' if v > 175 else 'gris'
            if h < 10 or h >= 170:
                return 'rojo'
            if h < 22:
                return 'naranja/marrón'
            if h < 35:
                return 'amarillo'
            if h < 85:
                return 'verde'
            if h < 130:
                return 'azul'
            return 'violeta'
        except Exception:
            return ''

    @staticmethod
    def _plural(nombre: str) -> str:
        """'Silla'->'sillas', 'Portátil'->'portátiles', 'Televisor'->'televisores'."""
        n = nombre.lower()
        if n.endswith(('l', 'r', 'z', 'd')):
            return n + 'es'
        if n.endswith('s'):
            return n
        return n + 's'

    # ───────────────────────── Consulta principal ─────────────────────────

    @classmethod
    def procesar_consulta(
        cls,
        texto_consulta: str,
        inmueble_obj: Any,
        foto_360_url: Optional[str] = None,
        panorama_id: Optional[int] = None,
        yaw: Optional[float] = None,
        pitch: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Enruta la pregunta del usuario:
        - Datos registrados del inmueble -> respuesta desde la BD.
        - Navegación a un ambiente -> hotspot real (yaw/pitch registrados).
        - Preguntas visuales -> modelo de visión sobre la imagen real.
        - Sin evidencia -> respuesta honesta de "no se puede determinar".
        """
        t = (texto_consulta or '').lower().strip()
        if not t:
            return {
                'tipo': 'sin_consulta',
                'fuente': 'no_determinado',
                'respuesta': "No escuché ninguna pregunta. Toca el micrófono y pregúntame sobre la propiedad o lo que ves en la imagen.",
            }

        pano, pano_url = cls._resolver_panorama(inmueble_obj, panorama_id, foto_360_url)

        def _con_sugerencias(resultado: Dict[str, Any]) -> Dict[str, Any]:
            resultado.setdefault('sugerencias', cls.generar_sugerencias(inmueble_obj, pano))
            return resultado

        # ── 0. Comando de cámara relativa (gira, acerca, arriba...) ───────
        camara_rel = cls._comando_camara_relativa(t)
        if camara_rel:
            return _con_sugerencias({
                'tipo': 'movimiento_camara',
                'fuente': 'comando',
                'confianza': 'alta',
                'respuesta': camara_rel['texto'],
                'camara_relativa': camara_rel['delta'],
            })

        # ── 0b. Navegación a un ambiente (hotspots reales) ────────────────
        if re.search(r'\b(?:ll[eé]vame|mu[eé]strame)\b', t) or re.search(r'\b(?:ir|ve|vamos)\s+a\b', t):
            destino = cls._buscar_hotspot_destino(pano, t)
            if destino:
                return _con_sugerencias({
                    'tipo': 'navegacion_ambiente',
                    'fuente': 'datos_propiedad',
                    'confianza': 'alta',
                    'respuesta': f"Vamos hacia {destino['texto']}.",
                    'camara_360': {
                        'yaw': float(destino['yaw']),
                        'pitch': float(destino['pitch']),
                        'hfov': 80.0,
                    },
                })
            return _con_sugerencias({
                'tipo': 'navegacion_ambiente',
                'fuente': 'no_determinado',
                'respuesta': "No encuentro ese ambiente entre los espacios registrados. Puedes moverte con las flechas o las miniaturas del recorrido.",
            })

        # ── 0c. Acciones de negocio (visita, contacto, contrato) ──────────
        if any(k in t for k in ('visita', 'visitar', 'agendar', 'reservar', 'contactar', 'propietario', 'dueño', 'contrato', 'alquilar', 'comprar')):
            return _con_sugerencias(cls._responder_accion(t))

        # ── 0d. Barrio / entorno (POIs reales del motor de calidad de vida)
        if cls._es_pregunta_barrio(t):
            return _con_sugerencias(cls._responder_barrio(t, inmueble_obj))

        # ── 1. Precio / oferta ────────────────────────────────────────────
        if any(k in t for k in ('precio', 'cuesta', 'vale', 'alquiler', 'costo', 'expensa', 'monto', 'anticretico', 'anticrético', 'venta')):
            if not inmueble_obj:
                return cls._sin_inmueble()
            pub = cls._publicacion_activa(inmueble_obj)
            tipo = getattr(getattr(inmueble_obj, 'tipo', None), 'nombre', 'inmueble')
            if pub and pub.precio is not None:
                oferta = pub.get_tipo_oferta_display()
                periodicidad = ' mensuales' if pub.tipo_oferta == 'alquiler' else ''
                texto = f"Este {tipo} está en {oferta} por Bs. {pub.precio}{periodicidad}."
            else:
                texto = "El precio de esta propiedad no está publicado todavía."
            return _con_sugerencias({
                'tipo': 'informacion_precio',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {'precio_bs': float(pub.precio)} if pub and pub.precio is not None else {},
            })

        # ── 2. Características registradas ────────────────────────────────
        # Preguntas sobre contenido/apariencia de la foto ("qué muebles hay",
        # "de qué color") NO son datos de la ficha: se guardan para la visión.
        es_visual = any(k in t for k in ('mueble', 'objeto', 'color', 'que hay', 'qué hay', 'que se ve', 'qué se ve', 'que ves', 'qué ves', 'que tiene', 'qué tiene'))
        if not es_visual and any(k in t for k in ('habitacion', 'dormitorio', 'cuarto', 'baño', 'bano', 'mascota', 'garaje', 'parqueo', 'piscina', 'amoblado', 'amueblado')):
            if not inmueble_obj:
                return cls._sin_inmueble()
            # Solo campos que realmente existen en la ficha. Mascotas y
            # piscina no son datos registrados: respuesta honesta.
            if any(k in t for k in ('mascota', 'piscina', 'amoblado', 'amueblado')):
                return _con_sugerencias({
                    'tipo': 'informacion_caracteristicas',
                    'fuente': 'no_determinado',
                    'respuesta': "Ese dato no está registrado en la ficha. Puedes consultarlo directamente con el propietario por el chat.",
                })
            datos = []
            habs = getattr(inmueble_obj, 'habitaciones', None)
            banos = getattr(inmueble_obj, 'banos', None)
            if habs:
                datos.append(f"{habs} dormitorio{'s' if habs != 1 else ''}")
            if banos:
                datos.append(f"{banos} baño{'s' if banos != 1 else ''}")
            if getattr(inmueble_obj, 'garaje', None):
                datos.append("garaje")
            if datos:
                texto = "Según los datos registrados, la propiedad tiene " + ", ".join(datos) + "."
            else:
                texto = "Ese dato no está registrado en la ficha de la propiedad."
            return _con_sugerencias({
                'tipo': 'informacion_caracteristicas',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {
                    k: v for k, v in (('habitaciones', habs), ('banos', banos)) if v is not None
                },
            })

        # ── 3. Superficie / dimensiones del inmueble ──────────────────────
        if any(k in t for k in ('superficie', 'metros cuadrados', 'm2', 'terreno', 'dimensiones del')):
            if not inmueble_obj:
                return cls._sin_inmueble()
            sup = getattr(inmueble_obj, 'superficie', None)
            largo = getattr(inmueble_obj, 'largo', None)
            ancho = getattr(inmueble_obj, 'ancho', None)
            partes = []
            if sup:
                partes.append(f"una superficie de {float(sup):.0f} m²")
            if largo and ancho:
                partes.append(f"dimensiones de terreno de {float(largo):.1f} m por {float(ancho):.1f} m")
            texto = (
                "La propiedad tiene " + " y ".join(partes) + "."
                if partes else
                "Las dimensiones de esta propiedad no están registradas."
            )
            return _con_sugerencias({
                'tipo': 'dimensiones_generales',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {
                    k: float(v) for k, v in (
                        ('superficie_m2', sup), ('largo_m', largo), ('ancho_m', ancho)
                    ) if v
                },
            })

        # ── 4. Ubicación registrada ───────────────────────────────────────
        if any(k in t for k in ('ubicacion', 'ubicación', 'donde queda', 'dónde queda', 'direccion', 'dirección')) or ('zona' in t and 'cerca' not in t):
            if not inmueble_obj:
                return cls._sin_inmueble()
            direccion = getattr(inmueble_obj, 'direccion', None)
            texto = (
                f"La propiedad está en {direccion}."
                if direccion else
                "La dirección exacta no está registrada; puedes ver la zona en el mapa de la publicación."
            )
            return _con_sugerencias({
                'tipo': 'informacion_ubicacion',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
            })

        # ── 4b. Medición de un objeto visible -> cota AR sobre el objeto ──
        es_medida = any(k in t for k in ('mide', 'medida', 'cuanto mide', 'cuánto mide', 'largo', 'ancho', 'alto', 'distancia', 'cabe', 'entra'))
        if es_medida and pano is not None:
            try:
                from .services_medida_espacial import MedidaEspacialEngine
                obj = MedidaEspacialEngine.buscar_objeto(pano, t)
            except Exception:
                obj = None
            if obj:
                nombre = obj.get('nombre', 'El objeto')
                partes = []
                if obj.get('ancho_m'):
                    partes.append(f"~{obj['ancho_m']} m de ancho")
                if obj.get('alto_m'):
                    partes.append(f"~{obj['alto_m']} m de alto")
                if obj.get('distancia_m'):
                    partes.append(f"a unos {obj['distancia_m']} m de ti")
                respuesta = (
                    f"{nombre} mide aproximadamente " + ", ".join(partes[:2]) +
                    (f" ({partes[2]})." if len(partes) > 2 else ".")
                )
                if obj.get('parcial'):
                    respuesta += " Está parcialmente cortado en el borde de la imagen, así que la medida puede quedarse corta."
                return _con_sugerencias({
                    'tipo': 'medicion_estimada',
                    'fuente': 'medicion_estimada',
                    'confianza': obj.get('confianza', 'media'),
                    'respuesta': respuesta,
                    'nota': 'Estimación visual sobre la imagen real, no una medición calibrada.',
                    # La vista gira hacia el objeto medido
                    'camara_360': {
                        'yaw': obj['yaw'],
                        'pitch': obj['pitch'],
                    },
                    'ar_overlay': {
                        'elemento': nombre,
                        'panorama_id': getattr(pano, 'id', None),
                        'yaw': obj['yaw'], 'pitch': obj['pitch'],
                        'yaw0': obj['yaw0'], 'yaw1': obj['yaw1'],
                        'pitch0': obj['pitch0'], 'pitch1': obj['pitch1'],
                        'span_yaw': obj['span_yaw'], 'span_pitch': obj['span_pitch'],
                        'valor': ", ".join(partes[:2]),
                        'tipo': 'vertical' if obj['span_pitch'] > obj['span_yaw'] * 1.6 else 'horizontal',
                        'confianza': obj.get('confianza', 'media'),
                        'parcial': obj.get('parcial', False),
                        'duracion_s': 6,
                    },
                })

        # ── 4c. Objetos detectados en la foto (contar / hay / qué hay) ──
        # Responde desde objetos_3d (YOLO real, ya cacheado): instantáneo,
        # sin depender de proveedores de visión externos.
        es_conteo = any(k in t for k in ('cuantas', 'cuantos', 'cuántas', 'cuántos', 'numero de', 'número de', 'cantidad de'))
        es_listado = any(k in t for k in ('que hay', 'qué hay', 'que objetos', 'qué objetos', 'que muebles', 'qué muebles', 'que ves', 'qué ves', 'que se ve', 'qué se ve', 'que tiene', 'qué tiene', 'que hay aqui', 'qué hay aquí'))
        es_presencia = bool(re.search(r'\b(hay|habia|había|se ve|ves)\b', t)) and not es_listado
        if (es_conteo or es_listado or es_presencia) and pano is not None:
            try:
                from .services_medida_espacial import MedidaEspacialEngine
                objetos = MedidaEspacialEngine.objetos_cache(pano)
            except Exception:
                objetos = []
            if objetos and es_listado and not es_conteo:
                from collections import Counter
                conteo = Counter(str(o.get('nombre') or 'Objeto') for o in objetos)
                detalle = ", ".join(
                    f"{n} {nombre.lower() if n == 1 else cls._plural(nombre)}"
                    for nombre, n in conteo.most_common())
                return _con_sugerencias({
                    'tipo': 'objetos_detectados',
                    'fuente': 'deteccion_espacial',
                    'confianza': 'media',
                    'respuesta': (
                        f"En esta vista detecto: {detalle}. "
                        "Detección automática sobre la foto 360°; puedo pasar por alto objetos pequeños u ocultos."
                    ),
                })
            hits = MedidaEspacialEngine.buscar_objetos(pano, t) if objetos else []
            if hits:
                n = len(hits)
                o = hits[0]
                nombre = str(o.get('nombre') or 'Objeto')
                plural = cls._plural(nombre)
                direccion = cls._direccion_relativa(o.get('yaw'), yaw)
                dist = o.get('distancia_m')
                detalle_dir = (f" {direccion}" if direccion else '') + (f", a unos ~{dist} m de ti" if dist else '')
                if es_conteo:
                    respuesta = (
                        f"Veo {n} {nombre.lower() if n == 1 else plural} en esta vista. "
                        "Conteo automático sobre la foto 360°."
                    )
                else:
                    respuesta = (
                        f"Sí, hay {n} {nombre.lower() if n == 1 else plural}{detalle_dir}."
                        if n >= 1 else ''
                    )
                return _con_sugerencias({
                    'tipo': 'presencia_objeto' if not es_conteo else 'conteo_objetos',
                    'fuente': 'deteccion_espacial',
                    'confianza': o.get('confianza', 'media'),
                    'respuesta': respuesta,
                    'nota': 'Detección automática sobre la imagen real.',
                    # En presencia de un solo objeto, encender su cota y
                    # girar la vista hacia él (efecto lentes inteligentes).
                    'camara_360': None if es_conteo else {
                        'yaw': o['yaw'], 'pitch': o['pitch'],
                    },
                    'ar_overlay': None if es_conteo else {
                        'elemento': nombre,
                        'panorama_id': getattr(pano, 'id', None),
                        'yaw': o['yaw'], 'pitch': o['pitch'],
                        'yaw0': o['yaw0'], 'yaw1': o['yaw1'],
                        'pitch0': o['pitch0'], 'pitch1': o['pitch1'],
                        'span_yaw': o['span_yaw'], 'span_pitch': o['span_pitch'],
                        'valor': f"~{o.get('ancho_m', '')} m" if o.get('ancho_m') else '',
                        'tipo': 'vertical' if o['span_pitch'] > o['span_yaw'] * 1.6 else 'horizontal',
                        'confianza': o.get('confianza', 'media'),
                        'parcial': o.get('parcial', False),
                        'duracion_s': 6,
                    },
                })
            # Sin coincidencia en el caché (o análisis aún pendiente):
            # si algún proveedor de visión está activo, la pregunta cae a
            # la sección 5 para que un VLM verifique la imagen real. Si
            # todos están caídos, respuesta honesta inmediata.
            if not cls._vision_disponible():
                if objetos is None:
                    msg = ("Estoy analizando los objetos de esta foto por primera "
                           "vez; me toma unos segundos. Vuelve a preguntarme en un momento.")
                    tipo = 'objetos_detectados'
                elif es_listado:
                    msg = ("No detecté objetos identificables en esta foto 360°. "
                           "Puedo responderte sobre los datos registrados de la propiedad.")
                    tipo = 'objetos_detectados'
                else:
                    msg = ("No detecté ese objeto en esta vista 360°; puede estar "
                           "fuera del encuadre o ser demasiado pequeño para el detector.")
                    tipo = 'presencia_objeto'
                return _con_sugerencias({
                    'tipo': tipo,
                    'fuente': 'deteccion_espacial',
                    'confianza': 'media',
                    'respuesta': msg,
                })

        # ── 4d. Atributos simples de la imagen (color / iluminación) ──
        # OpenCV local sobre la foto real: no requiere proveedores externos.
        es_atributo = any(k in t for k in ('color', 'colores', 'de que color', 'de qué color', 'oscuro', 'oscura', 'claro', 'clara', 'iluminad', 'luz', 'luminoso', 'brillante'))
        if es_atributo and pano is not None:
            attr = cls._analisis_color_luz(pano)
            if attr:
                return _con_sugerencias({
                    'tipo': 'atributo_imagen',
                    'fuente': 'analisis_local',
                    'confianza': 'media',
                    'respuesta': attr,
                    'nota': 'Análisis automático sobre la foto 360° real.',
                })

        # ── 5. Pregunta visual -> visión sobre la imagen real ──────────────
        if pano is None and not pano_url:
            return _con_sugerencias({
                'tipo': 'sin_imagen',
                'fuente': 'no_determinado',
                'respuesta': "Esta propiedad aún no tiene fotos 360° para analizar. Puedo responderte sobre el precio, los ambientes y los datos registrados de la ficha.",
            })

        img_b64 = cls._url_a_base64(pano_url)
        if not img_b64:
            return _con_sugerencias({
                'tipo': 'imagen_no_disponible',
                'fuente': 'no_determinado',
                'respuesta': "No pude cargar la imagen actual para analizarla. Intenta de nuevo en un momento, o pregúntame por los datos registrados de la propiedad.",
            })

        ambiente = getattr(pano, 'descripcion', '') or 'este ambiente'
        contexto = cls._contexto_inmueble(inmueble_obj)
        prompt = (
            f"{contexto}\n"
            f"La imagen corresponde a: \"{ambiente}\".\n"
            f"Pregunta del usuario: {texto_consulta}"
        )

        es_medida = any(k in t for k in ('mide', 'medida', 'cuanto mide', 'cuánto mide', 'largo', 'ancho', 'alto', 'distancia', 'cabe', 'entra'))
        respuesta = cls._vision_groq(prompt, img_b64)

        if not respuesta:
            extra = ''
            if pano is not None:
                try:
                    from .services_medida_espacial import MedidaEspacialEngine
                    objetos = MedidaEspacialEngine.objetos_cache(pano) or []
                except Exception:
                    objetos = []
                if objetos:
                    from collections import Counter
                    conteo = Counter(str(o.get('nombre') or 'Objeto') for o in objetos)
                    detalle = ", ".join(
                        f"{n} {nombre.lower() if n == 1 else cls._plural(nombre)}"
                        for nombre, n in conteo.most_common())
                    extra = (
                        f" Lo que sí detecté en la foto: {detalle}. "
                        "Puedes preguntarme cuánto miden o cuántos hay."
                    )
            return _con_sugerencias({
                'tipo': 'vision_no_disponible',
                'fuente': 'no_determinado',
                'respuesta': (
                    "El análisis visual detallado no está disponible ahora mismo "
                    "(el servicio de visión externo alcanzó su límite de uso)." + extra +
                    " También puedo responderte sobre el precio, los ambientes y los datos registrados."
                ),
            })

        resultado = {
            'tipo': 'medicion_estimada' if es_medida else 'vision_objeto',
            'fuente': 'vision_ia',
            'confianza': 'media',
            'respuesta': respuesta,
            'ambiente': ambiente,
        }
        if es_medida:
            resultado['nota'] = 'Estimación visual aproximada, no una medición calibrada.'
        return _con_sugerencias(resultado)

    # ──────────────────────── Helpers internos ────────────────────────

    @classmethod
    def _sin_inmueble(cls) -> Dict[str, Any]:
        return {
            'tipo': 'sin_inmueble',
            'fuente': 'no_determinado',
            'respuesta': "No encontré la ficha de esta propiedad para responder.",
        }

    @classmethod
    def _buscar_hotspot_destino(cls, pano: Any, texto: str) -> Optional[Dict[str, Any]]:
        """Busca un hotspot del panorama actual cuyo ambiente destino o texto
        de ayuda coincida con lo pedido ('llévame a la cocina')."""
        if pano is None:
            return None
        try:
            for h in pano.hotspots_salida.select_related('escena_destino').all():
                destino_desc = (h.escena_destino.descripcion or '').lower() if h.escena_destino else ''
                ayuda = (h.texto_ayuda or '').lower()
                for palabra in set((destino_desc + ' ' + ayuda).split()):
                    if len(palabra) >= 4 and palabra in texto:
                        return {
                            'yaw': h.yaw,
                            'pitch': h.pitch,
                            'texto': h.texto_ayuda or h.escena_destino.descripcion,
                        }
        except Exception:
            pass
        return None

    # ─────────────────── Herramientas del orquestador ───────────────────

    @classmethod
    def _comando_camara_relativa(cls, t: str) -> Optional[Dict[str, Any]]:
        """Comandos de cámara relativos: 'gira a la derecha', 'acércate'."""
        if any(k in t for k in ('acerca', 'zoom in', 'adelante', 'acercate', 'acércate')):
            return {'delta': {'zoom': 'in'}, 'texto': 'Acercando la vista.'}
        if any(k in t for k in ('aleja', 'zoom out', 'atras', 'atrás', 'abrir')):
            return {'delta': {'zoom': 'out'}, 'texto': 'Alejando la vista.'}
        if 'izquierda' in t or 'izq' in t:
            return {'delta': {'dyaw': -45.0}, 'texto': 'Girando a la izquierda.'}
        if 'derecha' in t or 'der' in t:
            return {'delta': {'dyaw': 45.0}, 'texto': 'Girando a la derecha.'}
        if 'arriba' in t or 'techo' in t or 'sube' in t:
            return {'delta': {'dpitch': 25.0}, 'texto': 'Mirando hacia arriba.'}
        if 'abajo' in t or 'piso' in t or 'baja' in t:
            return {'delta': {'dpitch': -25.0}, 'texto': 'Mirando hacia abajo.'}
        if 'gira' in t or 'girar' in t or 'voltea' in t:
            return {'delta': {'dyaw': 45.0}, 'texto': 'Girando la vista.'}
        return None

    _CATEGORIAS_POI = {
        'supermercados': (
            'supermercado', 'mercado', 'tienda', 'compras', 'abarrote', 'minimarket', 'hipermaxi'
        ),
        'salud': (
            'farmacia', 'salud', 'hospital', 'clinica', 'clínica', 'medico', 'médico',
            'doctor', 'emergencia',
        ),
        'educacion': (
            'colegio', 'escuela', 'universidad', 'educacion', 'educación',
            'guarderia', 'guardería', 'instituto', 'estudiar',
        ),
        'recreacion': (
            'parque', 'plaza', 'recreacion', 'recreación', 'cine', 'gimnasio',
            'deporte', 'cancha',
        ),
        'transporte': (
            'bus', 'transporte', 'parada', 'micro', 'trufi', 'taxi', 'terminal',
        ),
    }

    @classmethod
    def _es_pregunta_barrio(cls, t: str) -> bool:
        proximidad = ('cerca', 'cercano', 'alrededor', 'barrio', 'vecindario',
                      'a pie', 'caminando', 'servicios', 'que hay por ahi',
                      'qué hay por ahí')
        if any(k in t for k in proximidad):
            return True
        for palabras in cls._CATEGORIAS_POI.values():
            if any(k in t for k in palabras):
                return True
        return False

    @classmethod
    def _responder_barrio(cls, t: str, inmueble_obj: Any) -> Dict[str, Any]:
        """Responde '¿hay X cerca?' con los POIs calculados del entorno real
        (CalidadVidaEngine sobre el GPS del inmueble)."""
        if not inmueble_obj:
            return cls._sin_inmueble()

        gps = getattr(inmueble_obj, 'gps', None)
        if not gps or ',' not in gps:
            return {
                'tipo': 'informacion_barrio',
                'fuente': 'no_determinado',
                'respuesta': "Esta propiedad no tiene ubicación GPS registrada, así que no puedo decirte qué hay cerca.",
            }

        try:
            lat, lng = (float(x.strip()) for x in gps.split(',')[:2])
        except (ValueError, IndexError):
            return {
                'tipo': 'informacion_barrio',
                'fuente': 'no_determinado',
                'respuesta': "La ubicación registrada no permite calcular el entorno.",
            }

        from .services_calidad_vida import CalidadVidaEngine
        try:
            data = CalidadVidaEngine.calcular_indice_barrio(lat, lng)
        except Exception as e:
            logger.warning('CalidadVidaEngine falló: %s', e)
            return {
                'tipo': 'informacion_barrio',
                'fuente': 'no_determinado',
                'respuesta': "No pude calcular el entorno del barrio en este momento.",
            }

        pois = data.get('puntos_de_interes', []) or []

        # Categoría específica pedida ("¿hay farmacias cerca?")
        categoria_pedida = None
        for cat, palabras in cls._CATEGORIAS_POI.items():
            if any(k in t for k in palabras):
                categoria_pedida = cat
                break

        if categoria_pedida:
            cercanos = [p for p in pois if p.get('categoria') == categoria_pedida][:3]
            if cercanos:
                lista = '; '.join(
                    f"{p.get('nombre')} a {int(p.get('distancia_metros', 0))} m (~{p.get('minutos_a_pie')} min a pie)"
                    for p in cercanos
                )
                return {
                    'tipo': 'informacion_barrio',
                    'fuente': 'datos_barrio',
                    'confianza': 'media',
                    'respuesta': f"Cerca de la propiedad: {lista}. Distancias estimadas según la ubicación.",
                    'pois': cercanos,
                }
            return {
                'tipo': 'informacion_barrio',
                'fuente': 'datos_barrio',
                'confianza': 'media',
                'respuesta': "No encontré ese servicio entre los puntos cercanos registrados para esta zona.",
            }

        # Pregunta general "¿qué hay cerca?"
        if pois:
            por_cat = {}
            for p in pois:
                por_cat.setdefault(p.get('categoria', 'otros'), p)
            lista = '; '.join(
                f"{p.get('nombre')} (~{p.get('minutos_a_pie')} min a pie)"
                for p in list(por_cat.values())[:5]
            )
            walk = data.get('walk_score')
            extra = f" La zona tiene un puntaje de caminabilidad de {walk}/100." if walk else ''
            return {
                'tipo': 'informacion_barrio',
                'fuente': 'datos_barrio',
                'confianza': 'media',
                'respuesta': f"En los alrededores hay: {lista}.{extra} Distancias estimadas según la ubicación.",
                'pois': list(por_cat.values())[:5],
            }

        return {
            'tipo': 'informacion_barrio',
            'fuente': 'no_determinado',
            'respuesta': "No tengo puntos de interés calculados para esta zona todavía.",
        }

    @classmethod
    def _responder_accion(cls, t: str) -> Dict[str, Any]:
        """Peticiones de acción: agendar visita, contactar, contrato."""
        if any(k in t for k in ('visita', 'visitar', 'agendar', 'reservar', 'conocer')):
            return {
                'tipo': 'accion_visita',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': "Puedes pedir una visita con el botón 'Pedir visita' de la publicación. Cierro el recorrido si quieres hacerlo ahora.",
                'accion': {'tipo': 'cerrar_visor', 'etiqueta': 'Ir a pedir visita'},
            }
        if any(k in t for k in ('contactar', 'propietario', 'dueño', 'mensaje', 'chat', 'hablar con')):
            return {
                'tipo': 'accion_contacto',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': "Puedes escribirle directamente al propietario con el botón 'Escribir al propietario' de la publicación.",
                'accion': {'tipo': 'cerrar_visor', 'etiqueta': 'Escribir al propietario'},
            }
        if any(k in t for k in ('contrato', 'alquilar', 'comprar', 'arrendar')):
            return {
                'tipo': 'accion_contrato',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': "Cuando tú y el propietario se pongan de acuerdo, el contrato se genera desde la publicación. ¿Quieres escribirle o pedir una visita primero?",
            }
        return {
            'tipo': 'accion_general',
            'fuente': 'no_determinado',
            'respuesta': "Puedo guiarte por el recorrido, responder sobre la propiedad o indicarte cómo pedir una visita. ¿Qué necesitas?",
        }

    # ─────────────────── Sugerencias dinámicas de preguntas ───────────────────

    @classmethod
    def generar_sugerencias(cls, inmueble_obj: Any, pano: Any) -> list:
        """Chips de sugerencia generados desde el contexto REAL:
        objetos detectados en el panorama, hotspots disponibles, datos de
        la ficha y el entorno. Nunca una lista fija."""
        sugerencias = []

        # 1. Objetos realmente detectados por visión en este ambiente
        analisis = getattr(pano, 'analisis_visual', None) if pano else None
        if analisis:
            for obj in analisis.get('objetos', [])[:2]:
                nombre = (obj.get('nombre') or '').strip()
                if nombre:
                    sugerencias.append(f'¿Cuánto mide {nombre}?')
            if analisis.get('descripcion'):
                sugerencias.append('¿Qué más se ve aquí?')

        # 2. Ambientes alcanzables por hotspots reales
        if pano is not None:
            try:
                for h in pano.hotspots_salida.select_related('escena_destino').all()[:2]:
                    destino = ''
                    if h.escena_destino:
                        destino = h.escena_destino.descripcion or ''
                    if destino:
                        sugerencias.append(f'Llévame a {destino}')
            except Exception:
                pass

        # 3. Datos de la ficha que existen y son pregunta natural
        if inmueble_obj:
            pub = cls._publicacion_activa(inmueble_obj)
            if pub and pub.precio is not None:
                sugerencias.append('¿Cuál es el precio?')
            if getattr(inmueble_obj, 'habitaciones', None):
                sugerencias.append('¿Cuántos dormitorios tiene?')
            if getattr(inmueble_obj, 'gps', None):
                sugerencias.append('¿Qué servicios hay cerca?')

        # 4. Fallback honesto si no hay contexto
        if not sugerencias:
            sugerencias = [
                '¿Qué se ve en esta habitación?',
                '¿Cuál es el precio?',
                '¿Qué servicios hay cerca?',
            ]

        # Deduplicar preservando orden, máximo 5
        vistas = set()
        unicas = []
        for s in sugerencias:
            if s not in vistas:
                vistas.add(s)
                unicas.append(s)
            if len(unicas) >= 5:
                break
        return unicas

    # ────────────────────────── Tour narrado ──────────────────────────

    @classmethod
    def generar_tour_narrado(
        cls,
        inmueble_obj: Any,
        foto_360_url: Optional[str] = None,
        usar_vision: bool = False,
    ) -> Dict[str, Any]:
        """
        Itinerario por los panoramas reales del inmueble. La locución se
        genera desde el análisis visual cacheado (o en vivo si usar_vision)
        y siempre describe solo lo que hay evidencia. Sin análisis, narra
        únicamente lo que dice la descripción registrada del ambiente.
        """
        titulo = getattr(inmueble_obj, 'titulo', 'esta propiedad') if inmueble_obj else 'esta propiedad'
        tipo = getattr(getattr(inmueble_obj, 'tipo', None), 'nombre', 'inmueble')
        pub = cls._publicacion_activa(inmueble_obj)
        precio = pub.precio if pub else None
        oferta = pub.get_tipo_oferta_display() if pub else None
        sup = getattr(inmueble_obj, 'superficie', None)
        habs = getattr(inmueble_obj, 'habitaciones', None)
        banos = getattr(inmueble_obj, 'banos', None)

        panoramas_qs = list(
            inmueble_obj.multimedia.filter(tipo='panorama360').order_by('orden')
        ) if inmueble_obj else []

        pasos = []

        if panoramas_qs:
            datos_intro = []
            if sup:
                datos_intro.append(f"{float(sup):.0f} m²")
            if habs:
                datos_intro.append(f"{habs} dormitorios")
            if banos:
                datos_intro.append(f"{banos} baños")
            resumen = f" de {', '.join(datos_intro)}" if datos_intro else ''
            precio_txt = f", en {oferta} por Bs. {precio}" if oferta and precio else ''

            for idx, p in enumerate(panoramas_qs):
                desc = p.descripcion or f'Ambiente {idx + 1}'

                analisis = getattr(p, 'analisis_visual', None)
                if usar_vision and not analisis:
                    analisis = cls.analizar_panorama(p)

                if idx == 0:
                    loc = (
                        f"Hola, soy tu guía. Te doy la bienvenida a {titulo}, "
                        f"un {tipo}{resumen}{precio_txt}. "
                        f"Estamos en {desc}."
                    )
                    if analisis and analisis.get('descripcion'):
                        loc += f" {analisis['descripcion']}"
                elif analisis and analisis.get('descripcion'):
                    loc = f"Estamos en {desc}. {analisis['descripcion']}"
                else:
                    loc = (
                        f"Estamos en {desc}. Puedes mirar a tu alrededor y "
                        "preguntarme por lo que veas."
                    )

                pasos.append({
                    'id': idx + 1,
                    'panorama_id': p.id,
                    'titulo': desc,
                    'locucion': loc,
                    'camara_360': {'yaw': 0.0, 'pitch': 0.0, 'hfov': 100.0},
                    'duracion_seg': 7.0,
                })

            pasos.append({
                'id': len(pasos) + 1,
                'panorama_id': panoramas_qs[0].id,
                'titulo': 'Recorrido libre',
                'locucion': (
                    "Fin del recorrido guiado. Puedes seguir explorando "
                    "libremente o preguntarme lo que quieras sobre lo que ves."
                ),
                'camara_360': {'yaw': 0.0, 'pitch': 0.0, 'hfov': 100.0},
                'duracion_seg': 5.0,
            })
        else:
            datos_intro = []
            if sup:
                datos_intro.append(f"{float(sup):.0f} m²")
            if habs:
                datos_intro.append(f"{habs} dormitorios")
            if banos:
                datos_intro.append(f"{banos} baños")
            resumen = f" con {', '.join(datos_intro)}" if datos_intro else ''
            pasos = [{
                'id': 1,
                'panorama_id': None,
                'titulo': 'Bienvenida',
                'locucion': (
                    f"Hola, soy tu guía. {titulo} es un {tipo}{resumen}. "
                    "Esta propiedad aún no tiene fotos 360° publicadas; cuando "
                    "el propietario las suba podrás recorrerla desde aquí."
                ),
                'camara_360': {'yaw': 0.0, 'pitch': 0.0, 'hfov': 100.0},
                'duracion_seg': 7.0,
            }]

        return {
            'propiedad_titulo': titulo,
            'total_pasos': len(pasos),
            'pasos': pasos,
        }
