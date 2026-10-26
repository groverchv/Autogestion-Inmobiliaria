"""
Motor de Medida Espacial 360° (objetos_3d)
==========================================
Detecta objetos reales en panoramas equirrectangulares (YOLOv8 + fallback
a bounding boxes de Gemini), convierte cada bbox de píxeles a coordenadas
angulares (yaw/pitch) y estima su tamaño métrico con el modelo de
profundidad monocular.

El resultado se cachea en ``Multimedia.analisis_visual['objetos_3d']`` y
alimenta:
- ``metaverso-datos.cotas_ar`` (HUD de cotas AR en web y móvil)
- ``ar_overlay`` del asistente espacial ("¿cuánto mide la mesa?")

Toda medida es APROXIMADA por naturaleza (monocular): el payload siempre
lleva ``confianza`` y la UI debe mostrar el prefijo "~".
"""
import json
import logging
import re
import unicodedata
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


class MedidaEspacialEngine:
    MAX_OBJETOS = 12          # tope de cotas por panorama
    PITCH_LIMITE = 60.0       # sobre |60°| la deformación es extrema
    SPAN_MIN_YAW = 1.5        # bboxes diminutos no son medibles
    SOLAPE_MIN = 0.30         # IoU mínimo para fundir nombre Gemini↔YOLO

    # COCO (YOLOv8n) → nombre en español para la UI
    _NOMBRES_ES = {
        'chair': 'Silla', 'couch': 'Sofá', 'bed': 'Cama',
        'dining table': 'Mesa', 'tv': 'Televisor', 'refrigerator': 'Refrigerador',
        'microwave': 'Microondas', 'oven': 'Horno', 'sink': 'Lavamanos',
        'toilet': 'Inodoro', 'clock': 'Reloj', 'vase': 'Florero',
        'potted plant': 'Planta', 'book': 'Libro', 'bottle': 'Botella',
        'cup': 'Taza', 'bowl': 'Recipiente', 'laptop': 'Portátil',
        'keyboard': 'Teclado', 'mouse': 'Ratón', 'monitor': 'Monitor',
        'bench': 'Banca', 'backpack': 'Mochila', 'suitcase': 'Maleta',
        'person': 'Persona', 'dog': 'Perro', 'cat': 'Gato',
        'car': 'Vehículo', 'bicycle': 'Bicicleta', 'motorcycle': 'Motocicleta',
        'table': 'Mesa', 'door': 'Puerta', 'window': 'Ventana',
    }

    # Sustantivos de consulta → tokens a buscar en el nombre del objeto
    _SINONIMOS_OBJETO = {
        'mesa': ['mesa', 'table'],
        'cama': ['cama', 'bed'],
        'silla': ['silla', 'chair', 'sillón', 'sillon'],
        'sofa': ['sofá', 'sofa', 'sillón', 'sillon', 'couch'],
        'puerta': ['puerta', 'door'],
        'ventana': ['ventana', 'window'],
        'tele': ['tele', 'tv', 'televisor', 'pantalla', 'monitor'],
        'tv': ['tele', 'tv', 'televisor', 'pantalla'],
        'pantalla': ['pantalla', 'tv', 'televisor', 'monitor'],
        'refrigerador': ['refrigerador', 'refrigeradora', 'nevera', 'frigo', 'heladera'],
        'nevera': ['nevera', 'refrigerador', 'refrigeradora', 'heladera'],
        'microondas': ['microondas', 'microwave'],
        'horno': ['horno', 'oven', 'cocina'],
        'cocina': ['cocina', 'horno', 'oven', 'estufa'],
        'estufa': ['estufa', 'cocina', 'horno'],
        'lampara': ['lámpara', 'lampara', 'lamp'],
        'espejo': ['espejo', 'mirror'],
        'lavamanos': ['lavamanos', 'lavabo', 'grifería', 'sink'],
        'inodoro': ['inodoro', 'toilet', 'wc', 'baño'],
        'ropero': ['ropero', 'armario', 'closet', 'guardarropa'],
        'armario': ['armario', 'ropero', 'closet'],
        'estante': ['estante', 'estantería', 'estanteria', 'repisa'],
        'planta': ['planta', 'maceta', 'plant'],
        'reloj': ['reloj', 'clock'],
        'cuadro': ['cuadro', 'pintura', 'retrato', 'picture'],
        'cortina': ['cortina', 'curtain'],
        'escritorio': ['escritorio', 'mesa', 'desk'],
        'computadora': ['computadora', 'portátil', 'portatil', 'laptop', 'pc'],
        'laptop': ['laptop', 'portátil', 'portatil', 'computadora'],
        'aire': ['aire', 'acondicionado', 'ac', 'split'],
        'ventilador': ['ventilador', 'fan'],
    }

    # ──────────────────── Detección de objetos (px) ────────────────────

    @classmethod
    def _detectar_yolo(cls, cv_img) -> List[Dict[str, Any]]:
        """YOLOv8 del auditor → bboxes en píxeles. [] si no hay detecciones."""
        try:
            from .services_auditoria import AuditoriaVisionEngine
            detecciones = AuditoriaVisionEngine.detectar_inventario_yolo(cv_img)
            if not isinstance(detecciones, list):
                return []
            reales = []
            for d in detecciones:
                if d.get('label') == 'ambiente_general' or 'error' in d:
                    continue
                bbox = d.get('bbox')
                if bbox and len(bbox) == 4:
                    reales.append(d)
            return reales
        except Exception as e:
            logger.warning('YOLO no disponible para objetos_3d: %s', e)
            return []

    @classmethod
    def _detectar_gemini(cls, img_b64: str, w: int, h: int) -> List[Dict[str, Any]]:
        """Fallback: pide a Gemini bounding boxes normalizados [0..1000]
        (formato nativo de detección de Gemini). Devuelve bboxes en px."""
        try:
            from .services_asistente_espacial import AsistenteEspacialEngine
            prompt = (
                "Detecta los objetos principales de este panorama 360° "
                "(muebles, puertas, ventanas, electrodomésticos). "
                "Responde SOLO con JSON válido:\n"
                '{"objetos":[{"nombre":"nombre en español",'
                '"bbox":[y0,x0,y1,x1]}]}\n'
                "bbox normalizado 0-1000. Máximo 12 objetos claramente "
                "visibles. No inventes objetos que no se ven."
            )
            texto = AsistenteEspacialEngine._vision_groq(prompt, img_b64, max_tokens=600)
            if not texto:
                return []
            limpio = texto.strip()
            if limpio.startswith('```'):
                limpio = re.sub(r'^```[a-zA-Z]*\n?|```$', '', limpio).strip()
            data = json.loads(limpio)
            out = []
            for o in (data.get('objetos') or [])[:cls.MAX_OBJETOS]:
                bbox = o.get('bbox')
                if not bbox or len(bbox) != 4:
                    continue
                y0, x0, y1, x1 = [float(v) / 1000.0 for v in bbox]
                if not (0 <= x0 < x1 <= 1.01 and 0 <= y0 < y1 <= 1.01):
                    continue
                out.append({
                    'label': (o.get('nombre') or 'Objeto').strip(),
                    'confidence': 0.5,
                    'bbox': [x0 * w, y0 * h, x1 * w, y1 * h],
                    'nombre_forzado': True,
                })
            return out
        except Exception as e:
            logger.warning('Fallback de detección Gemini falló: %s', e)
            return []

    # ────────────── Conversión angular y medición métrica ──────────────

    @staticmethod
    def _norm_txt(s: str) -> str:
        return ''.join(
            c for c in unicodedata.normalize('NFD', s.lower())
            if unicodedata.category(c) != 'Mn'
        ).strip()

    @classmethod
    def _bbox_px_a_angular(cls, bbox, w: int, h: int) -> Dict[str, float]:
        x0, y0, x1, y1 = [float(v) for v in bbox]
        return {
            'yaw0': ((x0 / w) - 0.5) * 360.0,
            'yaw1': ((x1 / w) - 0.5) * 360.0,
            'pitch0': (0.5 - (y1 / h)) * 180.0,
            'pitch1': (0.5 - (y0 / h)) * 180.0,
        }

    @classmethod
    def _medir_bbox(cls, depth_map, bbox, w: int, h: int) -> Dict[str, float]:
        """Ancho y alto métricos estimados del bbox vía puntos 3D."""
        from .services_depth_360 import DepthEstimation360Engine
        x0, y0, x1, y1 = [float(v) for v in bbox]
        xc = (x0 + x1) / 2.0
        uv = lambda x, y: (min(max(x / w, 0.0), 1.0), min(max(y / h, 0.0), 1.0))
        try:
            ancho = DepthEstimation360Engine.medir_distancia_3d(
                depth_map, uv(x0, y1), uv(x1, y1))['distancia_metros']
            alto = DepthEstimation360Engine.medir_distancia_3d(
                depth_map, uv(xc, y1), uv(xc, y0))['distancia_metros']
        except Exception:
            return {}
        cy, cx = int(min(max(y1 + y0, 0), 2 * h - 1) / 2), int(min(max(x1 + x0, 0), 2 * w - 1) / 2)
        distancia = float(depth_map[cy, cx])
        return {
            'ancho_m': round(ancho, 2),
            'alto_m': round(alto, 2),
            'distancia_m': round(distancia, 2),
        }

    # ──────────────── Fusión de nombres Gemini ↔ YOLO ──────────────────

    @classmethod
    def _fusionar_nombres(cls, objetos: List[Dict], nombres_vision: List[str]) -> None:
        """Si Gemini describió objetos por posición cualitativa, intenta
        reemplazar la etiqueta COCO genérica por el nombre amable."""
        if not nombres_vision:
            return
        usados = set()
        for o in objetos:
            o['_nombre_es'] = cls._NOMBRES_ES.get(
                cls._norm_txt(o.get('label', '')), o.get('label', 'Objeto'))
        for nv in nombres_vision:
            nombre = (nv.get('nombre') or '').strip()
            pos = cls._norm_txt(nv.get('posicion') or 'centro')
            if not nombre or nombre.lower() in usados:
                continue
            # bucket de posición: izquierda yaw<-20, derecha >20, centro resto
            for o in objetos:
                if o.get('_fusionado'):
                    continue
                cy = (o['yaw0'] + o['yaw1']) / 2.0
                bucket = 'izquierda' if cy < -20 else 'derecha' if cy > 20 else 'centro'
                if bucket == pos or (bucket.startswith('centro') and pos == 'centro'):
                    o['_nombre_es'] = nombre
                    o['_fusionado'] = True
                    usados.add(nombre.lower())
                    break

    # ───────────────────── Análisis principal (cache) ──────────────────

    @classmethod
    def analizar_objetos_3d(cls, panorama: Any, forzar: bool = False) -> List[Dict[str, Any]]:
        """Devuelve objetos_3d del panorama (cacheado en analisis_visual).
        Lista vacía si no se pudo analizar — nunca objetos inventados."""
        analisis = getattr(panorama, 'analisis_visual', None) or {}
        cache = analisis.get('objetos_3d')
        if cache and not forzar:
            return cache

        from .services_auditoria import AuditoriaVisionEngine
        from .services_asistente_espacial import AsistenteEspacialEngine
        from .services_depth_360 import DepthEstimation360Engine

        archivo = str(getattr(panorama, 'archivo', '') or '')
        cv_img = AuditoriaVisionEngine._cargar_cv2_image(archivo)
        if cv_img is None:
            return cache or []

        h, w = cv_img.shape[:2]
        detecciones = cls._detectar_yolo(cv_img)
        fuente_deteccion = 'yolo'

        if not detecciones:
            img_b64 = AsistenteEspacialEngine._url_a_base64(archivo)
            if img_b64:
                detecciones = cls._detectar_gemini(img_b64, w, h)
                fuente_deteccion = 'gemini'
        if not detecciones:
            return cache or []

        try:
            depth_map = DepthEstimation360Engine.estimar_profundidad_esferica(cv_img)
        except Exception as e:
            logger.warning('Depth map no disponible: %s', e)
            return cache or []

        objetos = []
        for d in detecciones:
            bbox = d['bbox']
            ang = cls._bbox_px_a_angular(bbox, w, h)
            span_yaw = abs(ang['yaw1'] - ang['yaw0'])
            span_pitch = abs(ang['pitch1'] - ang['pitch0'])
            pitch_centro = (ang['pitch0'] + ang['pitch1']) / 2.0
            if span_yaw < cls.SPAN_MIN_YAW or span_pitch < 1.0:
                continue
            if abs(pitch_centro) > cls.PITCH_LIMITE:
                continue
            medida = cls._medir_bbox(depth_map, bbox, w, h)
            if not medida or medida.get('ancho_m', 0) <= 0 or medida.get('alto_m', 0) <= 0:
                continue
            parcial = bbox[0] <= 1 or bbox[2] >= w - 1 or bbox[1] <= 1 or bbox[3] >= h - 1
            confianza = 'baja' if fuente_deteccion == 'gemini' else (
                'alta' if d.get('confidence', 0) >= 0.6 else 'media')
            objetos.append({
                'label': d['label'],
                'bbox': [round(float(v), 1) for v in bbox],
                **ang,
                'span_yaw': round(span_yaw, 1),
                'span_pitch': round(span_pitch, 1),
                'yaw': round((ang['yaw0'] + ang['yaw1']) / 2.0, 1),
                'pitch': round(pitch_centro, 1),
                **medida,
                'parcial': parcial,
                'confianza': confianza,
            })

        if not objetos:
            return cache or []

        objetos.sort(key=lambda o: o['span_yaw'] * o['span_pitch'], reverse=True)
        objetos = objetos[:cls.MAX_OBJETOS]

        cls._fusionar_nombres(
            objetos, [o for o in analisis.get('objetos', []) if isinstance(o, dict)])

        for o in objetos:
            o['nombre'] = o.pop('_nombre_es', o['label'])
            o.pop('_fusionado', None)

        try:
            analisis['objetos_3d'] = objetos
            panorama.analisis_visual = analisis
            panorama.save(update_fields=['analisis_visual'])
        except Exception as e:
            logger.warning('No se pudo cachear objetos_3d: %s', e)

        return objetos

    # ──────────────── Búsqueda por nombre (asistente) ──────────────────

    @classmethod
    def buscar_objeto(cls, panorama: Any, texto: str) -> Optional[Dict[str, Any]]:
        """Encuentra el objeto cotizado que mejor responde al sustantivo
        de la consulta ("la mesa", "la tele", "esa puerta")."""
        objetos = cls.analizar_objetos_3d(panorama)
        if not objetos:
            return None
        t = cls._norm_txt(texto)
        tokens = set(t.split())
        for sust, sinon in cls._SINONIMOS_OBJETO.items():
            if sust in tokens:
                for o in objetos:
                    nombre = cls._norm_txt(str(o.get('nombre') or ''))
                    if any(s in nombre for s in sinon):
                        return o
        for o in objetos:  # match directo por nombre
            nombre = cls._norm_txt(str(o.get('nombre') or ''))
            if nombre and nombre in t:
                return o
        return None
