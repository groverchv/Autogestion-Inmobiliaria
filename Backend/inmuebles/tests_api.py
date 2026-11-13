"""Suite automatizada de la API operativa (Punto 9 — pruebas de camino básico).

Corre con:  python manage.py test inmuebles.tests_api
Cubren el flujo crítico del negocio: salud del servicio, autenticación JWT
(obtener, refrescar, rechazar), perfil autenticado, catálogo público y el
toggle de favoritos del usuario.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario
from inmuebles.models import Inmueble, TipoInmueble


def crear_usuario(email='cliente@test.com', password='Clave1234'):
    """Crea el usuario directo (el modelo no usa username)."""
    u = Usuario(email=email, first_name='Ana', last_name='Prueba')
    u.set_password(password)
    u.save()
    return u


def crear_inmueble(propietario, titulo='Depto Centro'):
    tipo = TipoInmueble.objects.create(nombre='Departamento')
    return Inmueble.objects.create(
        propietario=propietario,
        tipo=tipo,
        titulo=titulo,
        descripcion='Prueba automatizada',
    )


class SaludYCatalogoTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check(self):
        resp = self.client.get('/api/health/')
        self.assertEqual(resp.status_code, 200)

    def test_catalogo_publico_anonimo(self):
        """GET /api/inmuebles/lista/ es AllowAny — vitrina sin login."""
        resp = self.client.get('/api/inmuebles/lista/')
        self.assertEqual(resp.status_code, 200)

    def test_catalogo_lista_inmuebles_creados(self):
        crear_inmueble(crear_usuario('dueno@test.com'))
        resp = self.client.get('/api/inmuebles/lista/')
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        resultados = data['results'] if isinstance(data, dict) else data
        self.assertGreaterEqual(len(resultados), 1)


class AutenticacionJwtTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = crear_usuario()

    def test_login_devuelve_tokens(self):
        resp = self.client.post('/api/token/', {
            'email': 'cliente@test.com',
            'password': 'Clave1234',
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_password_incorrecta_rechazada(self):
        resp = self.client.post('/api/token/', {
            'email': 'cliente@test.com',
            'password': 'incorrecta',
        })
        self.assertIn(resp.status_code, (400, 401))

    def test_refresh_devuelve_nuevo_access(self):
        login = self.client.post('/api/token/', {
            'email': 'cliente@test.com',
            'password': 'Clave1234',
        })
        resp = self.client.post('/api/token/refresh/', {
            'refresh': login.data['refresh'],
        })
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_me_anonimo_rechazado(self):
        resp = self.client.get('/api/usuarios/me/')
        self.assertIn(resp.status_code, (401, 403))

    def test_me_autenticado_devuelve_perfil(self):
        login = self.client.post('/api/token/', {
            'email': 'cliente@test.com',
            'password': 'Clave1234',
        })
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        resp = self.client.get('/api/usuarios/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['email'], 'cliente@test.com')


class FavoritosTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = crear_usuario()
        self.inmueble = crear_inmueble(crear_usuario('dueno2@test.com'))
        self.client.force_authenticate(self.user)

    def test_toggle_agrega_y_quita(self):
        url = '/api/inmuebles/favoritos/toggle/'
        r1 = self.client.post(url, {'inmueble': self.inmueble.id})
        self.assertEqual(r1.status_code, 200)
        self.assertTrue(r1.data['is_favorito'])

        r2 = self.client.post(url, {'inmueble': self.inmueble.id})
        self.assertEqual(r2.status_code, 200)
        self.assertFalse(r2.data['is_favorito'])

    def test_toggle_sin_inmueble_rechazado(self):
        resp = self.client.post('/api/inmuebles/favoritos/toggle/', {})
        self.assertEqual(resp.status_code, 400)

    def test_toggle_anonimo_rechazado(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            '/api/inmuebles/favoritos/toggle/',
            {'inmueble': self.inmueble.id},
        )
        self.assertIn(resp.status_code, (401, 403))
