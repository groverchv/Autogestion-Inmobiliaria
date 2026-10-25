"""
Load testing de la API — Autogestión Inmobiliaria 360°.

Uso:
    pip install locust
    locust -f loadtests/locustfile.py --host http://localhost:8000

Headless (CI):
    locust -f loadtests/locustfile.py --host http://localhost:8000 \
        --headless -u 100 -r 10 -t 2m

SLOs objetivo:
    - catalogo/publicaciones: p95 < 300 ms, 100 usuarios concurrentes
    - detalle + metaverso:    p95 < 400 ms, 50 concurrentes
    - auth/me/badges:         p95 < 500 ms, 30 concurrentes
    - escritura (favorito):   p95 < 800 ms, sin 5xx
"""
import os

from locust import HttpUser, task, between, tag


LOGIN_EMAIL = os.getenv('LT_EMAIL', 'juan.perez@gmail.com')
LOGIN_PASSWORD = os.getenv('LT_PASSWORD', 'usuario123')
INMUEBLE_ID = int(os.getenv('LT_INMUEBLE', '1'))


class UsuarioAnonimo(HttpUser):
    """Tráfico público sin autenticación (catálogo + detalle)."""
    weight = 3
    wait_time = between(1, 3)

    @task(5)
    def catalogo(self):
        self.client.get('/api/inmuebles/publicaciones/', name='GET /publicaciones')

    @task(3)
    def lista_inmuebles(self):
        self.client.get('/api/inmuebles/lista/', name='GET /inmuebles/lista')

    @task(2)
    def detalle(self):
        self.client.get(f'/api/inmuebles/lista/{INMUEBLE_ID}/', name='GET /inmuebles/[id]')

    @task(1)
    def ciudades(self):
        self.client.get('/api/inmuebles/lista/ciudades/', name='GET /ciudades')


class UsuarioAutenticado(HttpUser):
    """Usuario logueado: navega, consulta metaverso, badges, favoritos."""
    weight = 2
    wait_time = between(1, 3)

    def on_start(self):
        r = self.client.post('/api/usuarios/login/', json={
            'email': LOGIN_EMAIL,
            'password': LOGIN_PASSWORD,
        }, name='POST /login')
        if r.status_code == 200:
            token = r.json().get('access')
            self.client.headers['Authorization'] = f'Bearer {token}'
        else:
            self.environment.events.request.fire(
                request_type='LOGIN', name='login fallo',
                response_time=0, response_length=0,
                exception=Exception(f'login {r.status_code}'), context={},
            )

    @task(4)
    def catalogo_auth(self):
        self.client.get('/api/inmuebles/publicaciones/', name='GET /publicaciones (auth)')

    @task(3)
    def metaverso(self):
        self.client.get(
            f'/api/inmuebles/calidad-vida/metaverso-datos/?inmueble={INMUEBLE_ID}',
            name='GET /metaverso-datos',
        )

    @task(2)
    def badges(self):
        self.client.get('/api/usuarios/lista/badges/', name='GET /badges')

    @task(1)
    def toggle_favorito(self):
        self.client.post('/api/inmuebles/favoritos/toggle/',
                         json={'inmueble': INMUEBLE_ID},
                         name='POST /favoritos/toggle')
