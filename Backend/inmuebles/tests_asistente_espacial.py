"""
Tests del Asistente Espacial 360°.

Regla bajo prueba: el asistente NUNCA inventa datos. Responde desde la BD,
desde visión sobre la imagen real, o admite que no puede determinarlo.
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Hotspot, Inmueble, Multimedia, Publicacion, TipoInmueble
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

    # ── Orquestador: cámara, barrio, acciones, sugerencias ───────────────

    def test_comando_camara_relativa(self):
        r = AsistenteEspacialEngine.procesar_consulta('gira a la derecha', self.inmueble)
        self.assertEqual(r['tipo'], 'movimiento_camara')
        self.assertEqual(r['camara_relativa']['dyaw'], 45.0)

        r2 = AsistenteEspacialEngine.procesar_consulta('acércate', self.inmueble)
        self.assertEqual(r2['camara_relativa']['zoom'], 'in')

    def test_navegacion_a_ambiente_por_hotspot_real(self):
        cocina = Multimedia.objects.create(
            inmueble=self.inmueble, tipo='panorama360',
            archivo='https://ejemplo.com/pano_cocina.jpg',
            descripcion='Cocina', orden=1,
        )
        Hotspot.objects.create(
            inmueble=self.inmueble,
            escena_origen=self.panorama, escena_destino=cocina,
            yaw=75.0, pitch=-5.0, texto_ayuda='Ir a la cocina',
        )
        r = AsistenteEspacialEngine.procesar_consulta('llévame a la cocina', self.inmueble)
        self.assertEqual(r['tipo'], 'navegacion_ambiente')
        self.assertEqual(r['camara_360']['yaw'], 75.0)
        self.assertIn('cocina', r['respuesta'].lower())

    def test_navegacion_sin_ambiente_honesto(self):
        r = AsistenteEspacialEngine.procesar_consulta('llévame al sótano', self.inmueble)
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertIn('No encuentro ese ambiente', r['respuesta'])

    def test_accion_pedir_visita(self):
        r = AsistenteEspacialEngine.procesar_consulta('quiero agendar una visita', self.inmueble)
        self.assertEqual(r['tipo'], 'accion_visita')
        self.assertEqual(r['accion']['tipo'], 'cerrar_visor')
        self.assertIn('Pedir visita', r['respuesta'])

    def test_barrio_sin_gps_honesto(self):
        r = AsistenteEspacialEngine.procesar_consulta('¿hay supermercados cerca?', self.inmueble)
        self.assertEqual(r['fuente'], 'no_determinado')
        self.assertIn('GPS', r['respuesta'])

    @patch('inmuebles.services_calidad_vida.CalidadVidaEngine.calcular_indice_barrio')
    def test_barrio_con_pois_reales(self, mock_barrio):
        self.inmueble.gps = '-17.78, -63.18'
        self.inmueble.save()
        mock_barrio.return_value = {
            'walk_score': 78,
            'puntos_de_interes': [
                {'categoria': 'supermercados', 'nombre': 'Mercado Central',
                 'tipo': 'Mercado', 'distancia_metros': 320, 'minutos_a_pie': 4},
                {'categoria': 'salud', 'nombre': 'Farmacia Centro',
                 'tipo': 'Farmacia', 'distancia_metros': 150, 'minutos_a_pie': 2},
            ],
        }
        r = AsistenteEspacialEngine.procesar_consulta('¿hay supermercados cerca?', self.inmueble)
        self.assertEqual(r['fuente'], 'datos_barrio')
        self.assertIn('Mercado Central', r['respuesta'])
        self.assertIn('320', r['respuesta'])

        r2 = AsistenteEspacialEngine.procesar_consulta('¿qué hay cerca?', self.inmueble)
        self.assertIn('78/100', r2['respuesta'])

    def test_sugerencias_siempre_presentes(self):
        r = AsistenteEspacialEngine.procesar_consulta('¿cuál es el precio?', self.inmueble)
        self.assertIn('sugerencias', r)
        self.assertGreater(len(r['sugerencias']), 0)
        self.assertIn('¿Cuál es el precio?', r['sugerencias'])

    def test_sugerencias_usan_objetos_detectados(self):
        self.panorama.analisis_visual = {
            'descripcion': 'Sala con mesa',
            'objetos': [{'nombre': 'la mesa de centro', 'posicion': 'centro'}],
        }
        self.panorama.save()
        sugs = AsistenteEspacialEngine.generar_sugerencias(self.inmueble, self.panorama)
        self.assertTrue(any('mesa de centro' in s for s in sugs))
