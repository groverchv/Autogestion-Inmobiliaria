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
    SPAN_MAX_YAW = 120.0      # mayor = artefacto de la costura ±180°
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
    # Dos modelos complementarios:
    #  - yolov8n.pt (COCO, 80 clases): muebles y objetos cotidianos.
    #  - best.pt custom (inventario inmobiliario): puerta/ventana y daños,
    #    clases que COCO no tiene. Solo se usa si el archivo existe.
    # El modelo del auditor NO se reutiliza aquí: su prioridad es el
    # custom y detecta cero muebles genéricos en panoramas normales.

    _modelo_coco = None
    _modelo_custom = 'pendiente'  # None una vez resuelto sin archivo

    _CUSTOM_PATHS = [
        'runs/inmobiliario_check/yolov8_inmobiliario_custom/weights/best.pt',
        'runs/detect/runs/inmobiliario_check/yolov8_inmobiliario_custom/weights/best.pt',
        '../runs/detect/runs/inmobiliario_check/yolov8_inmobiliario_custom/weights/best.pt',
    ]

    @classmethod
    def _modelo_deteccion_coco(cls):
        if cls._modelo_coco is None:
            import os
            from ultralytics import YOLO
            ruta = 'yolov8n.pt'
            if not os.path.exists(ruta):
                alt = os.path.join(os.path.dirname(__file__), '..', 'yolov8n.pt')
                if os.path.exists(alt):
                    ruta = alt
            cls._modelo_coco = YOLO(ruta)
        return cls._modelo_coco

    @classmethod
    def _modelo_deteccion_custom(cls):
        if cls._modelo_custom == 'pendiente':
            import os
            cls._modelo_custom = None
            for r in cls._CUSTOM_PATHS:
                if os.path.exists(r):
                    try:
                        from ultralytics import YOLO
                        cls._modelo_custom = YOLO(r)
                    except Exception as e:
                        logger.warning('Modelo custom no cargó: %s', e)
                    break
        return cls._modelo_custom

    @staticmethod
    def _inferir(modelo, cv_img, conf_min: float = 0.30) -> List[Dict[str, Any]]:
        dets = []
        try:
            res = modelo(cv_img, verbose=False)[0]
            names = modelo.names
            for b in res.boxes:
                conf = float(b.conf)
                if conf < conf_min:
                    continue
                x0, y0, x1, y1 = [float(v) for v in b.xyxy[0]]
                dets.append({
                    'label': str(names[int(b.cls)]),
                    'confidence': round(conf, 3),
                    'bbox': [x0, y0, x1, y1],
                })
        except Exception as e:
            logger.warning('Inferencia YOLO falló: %s', e)
        return dets

    @staticmethod
    def _iou(a, b) -> float:
        ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
        iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
        inter = ix * iy
        if inter <= 0:
            return 0.0
        ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
        return inter / ua if ua > 0 else 0.0

    @classmethod
    def _detectar_yolo(cls, cv_img) -> List[Dict[str, Any]]:
        """COCO + custom (si existe) → bboxes en píxeles, dedup por IoU
        sin importar etiqueta (la misma silla puede salir como 'chair'
        y como 'silla'). [] si no hay detecciones."""
        try:
            detecciones = cls._inferir(cls._modelo_deteccion_coco(), cv_img)
        except Exception as e:
            logger.warning('YOLO COCO no disponible para objetos_3d: %s', e)
            detecciones = []
        custom = cls._modelo_deteccion_custom()
        if custom is not None:
            detecciones += cls._inferir(custom, cv_img)
        if not detecciones:
            return []
        detecciones.sort(key=lambda d: d.get('confidence', 0), reverse=True)
        finales = []
        for d in detecciones:
            if any(cls._iou(d['bbox'], f['bbox']) > 0.5 for f in finales):
                continue
            finales.append(d)
        return finales

    # ────── Detección sobre recortes en perspectiva del panorama ──────
    # YOLO sobre una equirrectangular completa funciona mal por la
    # distorsión esférica. La técnica correcta: proyectar N vistas en
    # perspectiva (~100° FOV) que cubren los 360°, detectar en cada una
    # y reproyectar sus bboxes al panorama.

    @staticmethod
    def _perspectiva(cv_img, yaw0_deg: float, fov_deg: float = 100.0,
                     out_w: int = 640, out_h: int = 480):
        """Proyecta una vista en perspectiva del panorama equirrectangular
        mirando hacia yaw0 (misma convención que medir_distancia_3d:
        theta=0 -> +Z, u = theta/2π + 0.5)."""
        import cv2
        h, w = cv_img.shape[:2]
        f = out_w / (2.0 * np.tan(np.deg2rad(fov_deg) / 2.0))
        ys, xs = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
        xc = xs - out_w / 2.0
        yc = out_h / 2.0 - ys
        norm = np.sqrt(xc * xc + yc * yc + f * f)
        dx, dy, dz = xc / norm, yc / norm, f / norm
        t = np.deg2rad(yaw0_deg)
        wx = dx * np.cos(t) + dz * np.sin(t)
        wz = -dx * np.sin(t) + dz * np.cos(t)
        theta = np.arctan2(wx, wz)
        phi = np.arcsin(np.clip(dy, -1.0, 1.0))
        map_x = ((theta / (2.0 * np.pi) + 0.5) * w).astype(np.float32)
        map_y = ((0.5 - phi / np.pi) * h).astype(np.float32)
        return cv2.remap(cv_img, map_x, map_y, cv2.INTER_LINEAR,
                         borderMode=cv2.BORDER_WRAP)

    @staticmethod
    def _px_perspectiva_a_uv(x: float, y: float, yaw0_deg: float,
                             fov_deg: float, out_w: int, out_h: int):
        """Inverso de _perspectiva: píxel de la vista -> (u, v) del panorama."""
        f = out_w / (2.0 * np.tan(np.deg2rad(fov_deg) / 2.0))
        xc, yc = x - out_w / 2.0, out_h / 2.0 - y
        norm = np.sqrt(xc * xc + yc * yc + f * f)
        dx, dy, dz = xc / norm, yc / norm, f / norm
        t = np.deg2rad(yaw0_deg)
        wx = dx * np.cos(t) + dz * np.sin(t)
        wz = -dx * np.sin(t) + dz * np.cos(t)
        theta = np.arctan2(wx, wz)
        phi = np.arcsin(np.clip(dy, -1.0, 1.0))
        return (theta / (2.0 * np.pi) + 0.5) % 1.0, 0.5 - phi / np.pi

    @classmethod
    def _detectar_en_perspectivas(cls, cv_img, vistas: int = 4,
                                  fov_deg: float = 100.0) -> List[Dict[str, Any]]:
        """Detecta objetos sobre vistas en perspectiva que cubren los 360°
        y devuelve bboxes ya reproyectados al panorama equirrectangular."""
        import cv2
        h, w = cv_img.shape[:2]
        out_w, out_h = 640, 480
        detecciones = []
        for i in range(vistas):
            yaw0 = i * 360.0 / vistas
            try:
                view = cls._perspectiva(cv_img, yaw0, fov_deg, out_w, out_h)
            except Exception as e:
                logger.warning('No se pudo proyectar vista %s°: %s', yaw0, e)
                continue
            for d in cls._detectar_yolo(view):
                x0, y0, x1, y1 = [float(v) for v in d['bbox']]
                us, vs = [], []
                for px, py in ((x0, y0), (x1, y0), (x0, y1), (x1, y1)):
                    u, v = cls._px_perspectiva_a_uv(px, py, yaw0, fov_deg, out_w, out_h)
                    us.append(u)
                    vs.append(v)
                detecciones.append({
                    **d,
                    'bbox': [min(us) * w, min(vs) * h, max(us) * w, max(vs) * h],
                })
        # Dedup: mismo objeto visto en dos vistas vecinas (IoU sobre el
        # bbox ya reproyectado, sin importar la etiqueta del modelo).
        detecciones.sort(key=lambda d: d.get('confidence', 0), reverse=True)
        finales = []
        for d in detecciones:
            if any(cls._iou(d['bbox'], f['bbox']) > 0.5 for f in finales):
                continue
            finales.append(d)
        return finales

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
        """Distancia = mediana de profundidad dentro del bbox; ancho/alto
        por geometría angular del span (2·d·tan(span/2)).

        Medir extremo a extremo con dos puntos de profundidad da saltos
        falsos: el centro de una silla suele muestrear la pared de atrás.
        El tamaño angular del objeto sobre la esfera es la medición
        monocular más estable disponible."""
        x0, y0, x1, y1 = [float(v) for v in bbox]
        ix0, ix1 = int(max(min(x0, x1), 0)), int(min(max(x0, x1), w - 1))
        iy0, iy1 = int(max(min(y0, y1), 0)), int(min(max(y0, y1), h - 1))
        if ix1 <= ix0 or iy1 <= iy0:
            return {}
        patch = depth_map[iy0:iy1 + 1, ix0:ix1 + 1]
        distancia = float(np.median(patch))
        if not np.isfinite(distancia) or distancia <= 0:
            return {}
        span_yaw = abs(x1 - x0) / w * 2.0 * np.pi
        span_pitch = abs(y1 - y0) / h * np.pi
        ancho = 2.0 * distancia * np.tan(span_yaw / 2.0)
        alto = 2.0 * distancia * np.tan(span_pitch / 2.0)
        return {
            'ancho_m': round(float(ancho), 2),
            'alto_m': round(float(alto), 2),
            'distancia_m': round(distancia, 2),
        }

    # ──────────────── Fusión de nombres Gemini ↔ YOLO ──────────────────

    @classmethod
    def _fusionar_nombres(cls, objetos: List[Dict], nombres_vision: List[str]) -> None:
        """Si Gemini describió objetos por posición cualitativa, intenta
        reemplazar la etiqueta COCO genérica por el nombre amable."""
        for o in objetos:
            label = (o.get('label') or 'Objeto').strip()
            o['_nombre_es'] = cls._NOMBRES_ES.get(
                cls._norm_txt(label), label[:1].upper() + label[1:])
        if not nombres_vision:
            return
        usados = set()
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

    _en_analisis = set()  # ids de panorama con thread ya en vuelo (dedup)

    @classmethod
    def encolar_analisis(cls, panorama: Any) -> None:
        """Dispara el análisis en background una sola vez por panorama,
        sin importar cuántos usuarios/requests lo pidan a la vez."""
        pid = getattr(panorama, 'id', None)
        if pid is None or pid in cls._en_analisis:
            return
        cls._en_analisis.add(pid)

        def _run():
            try:
                cls.analizar_objetos_3d(panorama)
            finally:
                cls._en_analisis.discard(pid)

        import threading
        threading.Thread(target=_run, daemon=True).start()

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
        # Primero sobre vistas en perspectiva (el formato correcto para
        # YOLO); la equirrectangular entera solo como respaldo rápido.
        detecciones = cls._detectar_en_perspectivas(cv_img)
        if not detecciones:
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
            # Un bbox que cruza la costura ±180° envuelve casi todo el
            # ancho; las vistas vecinas ya capturan ese objeto bien.
            if span_yaw > cls.SPAN_MAX_YAW:
                continue
            if abs(pitch_centro) > cls.PITCH_LIMITE:
                continue
            medida = cls._medir_bbox(depth_map, bbox, w, h)
            if not medida or medida.get('ancho_m', 0) <= 0 or medida.get('alto_m', 0) <= 0:
                continue
            parcial = bool(bbox[0] <= 1 or bbox[2] >= w - 1
                           or bbox[1] <= 1 or bbox[3] >= h - 1)
            # Sanidad: medidas físicamente implausibles para un ambiente
            # interior quedan marcadas bajas (HUD las dibuja punteadas).
            dudosa = (medida['ancho_m'] > 8.0 or medida['alto_m'] > 5.0
                      or medida['distancia_m'] > 15.0)
            confianza = 'baja' if fuente_deteccion == 'gemini' or dudosa else (
                'alta' if d.get('confidence', 0) >= 0.6 else 'media')
            objetos.append({
                'label': str(d['label']),
                'bbox': [round(float(v), 1) for v in bbox],
                **{k: float(v) for k, v in ang.items()},
                'span_yaw': round(float(span_yaw), 1),
                'span_pitch': round(float(span_pitch), 1),
                'yaw': round(float((ang['yaw0'] + ang['yaw1']) / 2.0), 1),
                'pitch': round(float(pitch_centro), 1),
                **{k: float(v) for k, v in medida.items()},
                'parcial': parcial,
                'confianza': confianza,
            })

        if not objetos:
            return cache or []

        objetos.sort(key=lambda o: o['span_yaw'] * o['span_pitch'], reverse=True)
        # Dedup angular: mismo objeto detectado en dos vistas vecinas cuyos
        # bboxes reproyectados no llegan a solapar (típico cerca de la
        # costura ±180°). Misma etiqueta y centros casi iguales → uno solo.
        finales = []
        for o in objetos:
            dup = any(
                f['label'] == o['label']
                and min(abs(f['yaw'] - o['yaw']),
                        360.0 - abs(f['yaw'] - o['yaw'])) < 4.0
                and abs(f['pitch'] - o['pitch']) < 10.0
                for f in finales)
            if not dup:
                finales.append(o)
        objetos = finales[:cls.MAX_OBJETOS]

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
        de la consulta ("la mesa", "la tele", "esa puerta").

        Solo lee el caché `objetos_3d` — nunca corre el pipeline en el
        camino de una respuesta al usuario. Si el panorama aún no está
        analizado, dispara el análisis en background y devuelve None
        (la consulta cae a la visión genérica, que es rápida)."""
        analisis = getattr(panorama, 'analisis_visual', None) or {}
        objetos = analisis.get('objetos_3d')
        if objetos is None:
            cls.encolar_analisis(panorama)
            return None
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
