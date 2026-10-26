"""
Tests del Asistente Espacial 360°.

Regla bajo prueba: el asistente NUNCA inventa datos. Responde desde la BD,
desde visión sobre la imagen real, o admite que no puede determinarlo.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Inmueble, Multimedia, Publicacion, TipoInmueble
from .services_asistente_espacial import AsistenteEspacialEngine


class AsistenteEspacialTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.user = User.objects.create(email='prop@test.com')
        cls.user.set_password('x' * 12)
        cls.user.save()
        cls.tipo = TipoInmueble.objects.create(nombre='Casa')
        cls.inmueble = Inmueble.objects.create(
            propietario=cls.user,
            tipo=cls.tipo,
            titulo='Casa de prueba',
            habitaciones=3,
            banos=2,
            superficie=120,
        )
        cls.publicacion = Publicacion.objects.create(
            inmueble=cls.inmueble,
            tipo_oferta='alquiler',
            precio=2500,
            estado='activa',
        )
        cls.panorama = Multimedia.objects.create(
            inmueble=cls.inmueble,
            tipo='panorama360',
            archivo='https://ejemplo.com/pano_sala.jpg',
            descripcion='Sala principal',
            orden=0,
        )

    # ── Datos reales de la propiedad ─────────────────────────────────────

    def test_precio_desde_publicacion_real(self):
        r = AsistenteEspacialEngine.procesar_consulta('¿cuál es el precio?', self.inmueble)
        self.assertEqual(r['fuente'], 'datos_propiedad')
        self.assertIn('2500', r['respuesta'])
        self.assertIn('lquiler', r['respuesta'])

    def test_caracteristicas_reales(self):
        r = AsistenteEspacialEngine.procesar_consulta('¿cuántos dormitorios tiene?', self.inmueble)
        self.assertEqual(r['fuente'], 'datos_propiedad')
        self.assertIn('3 dormitorios', r['respuesta'])
        self.assertIn('2 baños', r['respuesta'])

    def test_dato_no_registrado_es_honesto(self):
        r = AsistenteEspacialEngine.procesar_consulta('¿se permiten mascotas?', self.inmueble)
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertIn('no está registrado', r['respuesta'].lower())

    # ── Preguntas visuales: sin imagen cargable -> honesto ───────────────

    @patch.object(AsistenteEspacialEngine, '_url_a_base64', return_value=None)
    def test_pregunta_visual_sin_imagen_cargable(self, _):
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿hay un sofá?', self.inmueble, foto_360_url='https://ejemplo.com/pano_sala.jpg'
        )
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertIn('No pude cargar la imagen', r['respuesta'])

    @patch.object(AsistenteEspacialEngine, '_vision_groq', return_value='No se ve ningún sofá en la imagen.')
    @patch.object(AsistenteEspacialEngine, '_url_a_base64', return_value='aW1hZ2Vu')
    def test_pregunta_visual_usa_vision_real(self, _img, _vision):
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿hay un sofá?', self.inmueble, foto_360_url='https://ejemplo.com/pano_sala.jpg'
        )
        self.assertEqual(r['fuente'], 'vision_ia')
        self.assertIn('No se ve ningún sofá', r['respuesta'])
        self.assertEqual(r['ambiente'], 'Sala principal')
        # La visión se llamó sobre la imagen real
        _vision.assert_called_once()
        self.assertIn('Sala principal', _vision.call_args[0][0])

    @patch.object(AsistenteEspacialEngine, '_vision_groq', return_value='Aproximadamente 2.10 m de alto.')
    @patch.object(AsistenteEspacialEngine, '_url_a_base64', return_value='aW1hZ2Vu')
    def test_medida_via_vision_marcada_estimada(self, _img, _vision):
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿cuánto mide la puerta?', self.inmueble, foto_360_url='https://ejemplo.com/pano_sala.jpg'
        )
        self.assertEqual(r['tipo'], 'medicion_estimada')
        self.assertIn('aproximada', r['nota'].lower())

    # ── Sin panoramas -> honesto ─────────────────────────────────────────

    def test_sin_panoramas_respuesta_honesta(self):
        inm2 = Inmueble.objects.create(propietario=self.user, titulo='Sin fotos')
        r = AsistenteEspacialEngine.procesar_consulta('¿qué se ve en la sala?', inm2)
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertIn('no tiene fotos 360', r['respuesta'])

    # ── Consulta vacía ───────────────────────────────────────────────────

    def test_consulta_vacia(self):
        r = AsistenteEspacialEngine.procesar_consulta('   ', self.inmueble)
        self.assertEqual(r['tipo'], 'sin_consulta')

    # ── Tour narrado: solo datos reales ──────────────────────────────────

    def test_tour_usa_descripciones_reales(self):
        tour = AsistenteEspacialEngine.generar_tour_narrado(self.inmueble)
        pasos = tour['pasos']
        self.assertEqual(pasos[0]['titulo'], 'Sala principal')
        self.assertIn('Casa de prueba', pasos[0]['locucion'])
        self.assertIn('Bs. 2500', pasos[0]['locucion'])
        # Ningún paso inventa características
        for paso in pasos:
            self.assertNotIn('empotrado', paso['locucion'])
            self.assertNotIn('box de vidrio', paso['locucion'])

    def test_tour_con_analisis_cacheado(self):
        self.panorama.analisis_visual = {
            'descripcion': 'Se ve una mesa de madera y una ventana.',
            'objetos': [{'nombre': 'mesa', 'posicion': 'centro'}],
            'elementos_arquitectonicos': ['ventana'],
        }
        self.panorama.save()
        tour = AsistenteEspacialEngine.generar_tour_narrado(self.inmueble)
        locuciones = ' '.join(p['locucion'] for p in tour['pasos'])
        self.assertIn('mesa de madera', locuciones)

    def test_tour_sin_panoramas_es_honesto(self):
        inm2 = Inmueble.objects.create(propietario=self.user, titulo='Sin panos')
        tour = AsistenteEspacialEngine.generar_tour_narrado(inm2)
        self.assertIn('no tiene fotos 360', tour['pasos'][0]['locucion'])

    # ── Nunca hay afirmaciones fabricadas ────────────────────────────────

    @patch.object(AsistenteEspacialEngine, '_vision_groq', return_value=None)
    @patch.object(AsistenteEspacialEngine, '_url_a_base64', return_value='aW1hZ2Vu')
    def test_vision_caida_no_inventa_objetos(self, _img, _vision):
        r = AsistenteEspacialEngine.procesar_consulta(
            '¿hay un cuadro?', self.inmueble, foto_360_url='https://ejemplo.com/pano_sala.jpg'
        )
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertNotIn('cuadro decorativo', r['respuesta'])
        self.assertNotIn('sofá', r['respuesta'])
