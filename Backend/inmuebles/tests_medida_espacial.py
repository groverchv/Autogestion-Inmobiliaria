"""
Tests del Motor de Medida Espacial 360° (objetos_3d) y su integración con
el asistente (ar_overlay). Regla bajo prueba: toda medida sale de un bbox
real detectado + profundidad real; sin análisis no hay cotas inventadas.
"""
from unittest.mock import patch

import numpy as np
from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Inmueble, Multimedia, TipoInmueble
from .services_asistente_espacial import AsistenteEspacialEngine
from .services_depth_360 import DepthEstimation360Engine
from .services_medida_espacial import MedidaEspacialEngine


def _objeto_3d(**kw):
    obj = {
        'nombre': 'Mesa', 'label': 'dining table',
        'yaw0': -30.0, 'yaw1': -15.0, 'pitch0': -20.0, 'pitch1': -5.0,
        'yaw': -22.5, 'pitch': -12.5,
        'span_yaw': 15.0, 'span_pitch': 15.0,
        'ancho_m': 1.45, 'alto_m': 0.78, 'distancia_m': 2.9,
        'parcial': False, 'confianza': 'media',
    }
    obj.update(kw)
    return obj


class MedidaEspacialTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create(email='prop2@test.com')
        cls.user.set_password('x' * 12)
        cls.user.save()
        cls.tipo = TipoInmueble.objects.create(nombre='Depto')
        cls.inmueble = Inmueble.objects.create(
            propietario=cls.user, tipo=cls.tipo, titulo='Depto prueba',
        )
        cls.panorama = Multimedia.objects.create(
            inmueble=cls.inmueble, tipo='panorama360',
            archivo='https://ejemplo.com/pano.jpg', descripcion='Sala', orden=0,
        )

    # ── Conversiones geométricas ─────────────────────────────────────────

    def test_bbox_px_a_angular(self):
        ang = MedidaEspacialEngine._bbox_px_a_angular(
            [256, 128, 768, 384], 1024, 512)
        self.assertAlmostEqual(ang['yaw0'], -90.0)
        self.assertAlmostEqual(ang['yaw1'], 90.0)
        self.assertAlmostEqual(ang['pitch1'], 45.0)
        self.assertAlmostEqual(ang['pitch0'], -45.0)

    def test_medir_bbox_devuelve_metros(self):
        img = np.full((512, 1024, 3), 200, dtype=np.uint8)
        depth = DepthEstimation360Engine.estimar_profundidad_esferica(img)
        m = MedidaEspacialEngine._medir_bbox(
            depth, [400, 300, 560, 380], 1024, 512)
        self.assertGreater(m['ancho_m'], 0)
        self.assertGreater(m['alto_m'], 0)
        self.assertGreater(m['distancia_m'], 0)
        self.assertLess(m['ancho_m'], 20)  # rango arquitectónico plausible

    # ── Búsqueda por nombre para el asistente ────────────────────────────

    def test_buscar_objeto_por_sustantivo(self):
        self.panorama.analisis_visual = {'objetos_3d': [_objeto_3d()]}
        self.panorama.save()
        o = MedidaEspacialEngine.buscar_objeto(self.panorama, '¿cuánto mide la mesa?')
        self.assertIsNotNone(o)
        self.assertEqual(o['nombre'], 'Mesa')

    def test_buscar_objeto_sin_analisis_devuelve_none(self):
        with patch.object(MedidaEspacialEngine, 'analizar_objetos_3d', return_value=[]):
            o = MedidaEspacialEngine.buscar_objeto(self.panorama, 'la mesa')
            self.assertIsNone(o)

    # ── Integración con el asistente: ar_overlay ─────────────────────────

    def test_medida_devuelve_ar_overlay(self):
        self.panorama.analisis_visual = {'objetos_3d': [_objeto_3d()]}
        self.panorama.save()
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿cuánto mide la mesa?', self.inmueble,
            panorama_id=self.panorama.id)
        self.assertEqual(r['tipo'], 'medicion_estimada')
        self.assertIn('1.45', r['respuesta'])
        ov = r['ar_overlay']
        self.assertEqual(ov['panorama_id'], self.panorama.id)
        self.assertAlmostEqual(ov['span_yaw'], 15.0)
        self.assertIn('duracion_s', ov)

    @patch.object(AsistenteEspacialEngine, '_vision_groq',
                  return_value='La mesa se ve de aproximadamente un metro.')
    @patch.object(AsistenteEspacialEngine, '_url_a_base64', return_value='aW1hZ2Vu')
    @patch.object(MedidaEspacialEngine, 'analizar_objetos_3d', return_value=[])
    def test_medida_sin_bbox_cae_a_vision(self, _det, _img, _vis):
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿cuánto mide la mesa?', self.inmueble,
            panorama_id=self.panorama.id)
        # Sin bbox real: respuesta de visión honesta, SIN overlay AR
        self.assertNotIn('ar_overlay', r)
        self.assertEqual(r['tipo'], 'medicion_estimada')
