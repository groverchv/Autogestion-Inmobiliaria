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
GROQ_VISION_MODEL = getattr(
    settings, 'GROQ_VISION_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct'
)

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
        en base64 JPEG reducida para el modelo de visión."""
        if not url:
            return None
        try:
            from PIL import Image

            if url.startswith('http://') or url.startswith('https://'):
                resp = requests.get(url, timeout=15)
                resp.raise_for_status()
                raw = resp.content
            else:
                rel = url.lstrip('/')
                if rel.startswith('media/'):
                    rel = rel[len('media/'):]
                local_path = os.path.join(str(settings.MEDIA_ROOT), rel)
                if not os.path.exists(local_path):
                    return None
                with open(local_path, 'rb') as f:
                    raw = f.read()

            img = Image.open(BytesIO(raw)).convert('RGB')
            img.thumbnail((1568, 1568))
            buf = BytesIO()
            img.save(buf, 'JPEG', quality=82)
            return base64.b64encode(buf.getvalue()).decode('ascii')
        except Exception as e:
            logger.warning('No se pudo cargar imagen para visión (%s): %s', url, e)
            return None

    @classmethod
    def _vision_groq(
        cls,
        prompt_usuario: str,
        img_b64: Optional[str],
        sistema: Optional[str] = None,
        max_tokens: int = 250,
    ) -> Optional[str]:
        api_key = getattr(settings, 'GROQ_API_KEY', '')
        if not api_key:
            return None

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

        payload = {
            "model": GROQ_VISION_MODEL,
            "messages": [
                {"role": "system", "content": sistema},
                {"role": "user", "content": content},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }

        try:
            resp = requests.post(
                GROQ_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                timeout=30,
            )
            if resp.status_code != 200:
                logger.warning('Groq vision respondió %s', resp.status_code)
                return None
            return resp.json()['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.warning('Error llamando a Groq vision: %s', e)
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
            return {
                'tipo': 'informacion_precio',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {'precio_bs': float(pub.precio)} if pub and pub.precio is not None else {},
            }

        # ── 2. Características registradas ────────────────────────────────
        if any(k in t for k in ('habitacion', 'dormitorio', 'cuarto', 'baño', 'bano', 'mascota', 'garaje', 'parqueo', 'piscina', 'amoblado', 'amueblado')):
            if not inmueble_obj:
                return cls._sin_inmueble()
            # Solo campos que realmente existen en la ficha. Mascotas y
            # piscina no son datos registrados: respuesta honesta.
            if any(k in t for k in ('mascota', 'piscina', 'amoblado', 'amueblado')):
                return {
                    'tipo': 'informacion_caracteristicas',
                    'fuente': 'no_determinado',
                    'respuesta': "Ese dato no está registrado en la ficha. Puedes consultarlo directamente con el propietario por el chat.",
                }
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
            return {
                'tipo': 'informacion_caracteristicas',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {
                    k: v for k, v in (('habitaciones', habs), ('banos', banos)) if v is not None
                },
            }

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
            return {
                'tipo': 'dimensiones_generales',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
                'dimensiones': {
                    k: float(v) for k, v in (
                        ('superficie_m2', sup), ('largo_m', largo), ('ancho_m', ancho)
                    ) if v
                },
            }

        # ── 4. Ubicación ──────────────────────────────────────────────────
        if any(k in t for k in ('ubicacion', 'ubicación', 'donde queda', 'dónde queda', 'zona', 'barrio', 'direccion', 'dirección')):
            if not inmueble_obj:
                return cls._sin_inmueble()
            direccion = getattr(inmueble_obj, 'direccion', None)
            texto = (
                f"La propiedad está en {direccion}."
                if direccion else
                "La dirección exacta no está registrada; puedes ver la zona en el mapa de la publicación."
            )
            return {
                'tipo': 'informacion_ubicacion',
                'fuente': 'datos_propiedad',
                'confianza': 'alta',
                'respuesta': texto,
            }

        # ── 5. Navegación a un ambiente (hotspots reales) ─────────────────
        if any(k in t for k in ('llevame', 'llévame', 'muestrame', 'muéstrame', 'ir a', 've a', 'vamos a')):
            destino = cls._buscar_hotspot_destino(pano, t)
            if destino:
                return {
                    'tipo': 'navegacion_ambiente',
                    'fuente': 'datos_propiedad',
                    'confianza': 'alta',
                    'respuesta': f"Vamos hacia {destino['texto']}.",
                    'camara_360': {
                        'yaw': float(destino['yaw']),
                        'pitch': float(destino['pitch']),
                        'hfov': 80.0,
                    },
                }

        # ── 6. Pregunta visual -> visión sobre la imagen real ──────────────
        if pano is None and not pano_url:
            return {
                'tipo': 'sin_imagen',
                'fuente': 'no_determinado',
                'respuesta': "Esta propiedad aún no tiene fotos 360° para analizar. Puedo responderte sobre el precio, los ambientes y los datos registrados de la ficha.",
            }

        img_b64 = cls._url_a_base64(pano_url)
        if not img_b64:
            return {
                'tipo': 'imagen_no_disponible',
                'fuente': 'no_determinado',
                'respuesta': "No pude cargar la imagen actual para analizarla. Intenta de nuevo en un momento, o pregúntame por los datos registrados de la propiedad.",
            }

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
            return {
                'tipo': 'vision_no_disponible',
                'fuente': 'no_determinado',
                'respuesta': "No pude analizar la imagen en este momento. Puedo responderte sobre el precio, los ambientes y los datos registrados de la propiedad.",
            }

        resultado = {
            'tipo': 'medicion_estimada' if es_medida else 'vision_objeto',
            'fuente': 'vision_ia',
            'confianza': 'media',
            'respuesta': respuesta,
            'ambiente': ambiente,
        }
        if es_medida:
            resultado['nota'] = 'Estimación visual aproximada, no una medición calibrada.'
        return resultado

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
