import os
import sys
import json
import requests

BASE_URL = "http://127.0.0.1:8000/api"
RESULTS = []

def record(test_name, success, details=""):
    RESULTS.append({
        "test": test_name,
        "success": success,
        "details": details
    })
    status = "[PASS]" if success else "[FAIL]"
    print(f"{status} | {test_name}: {details}")

print("="*70)
print(" SUITE DE TESTING PROFESIONAL INTEGRAL - INMOBILIARIA NOBLEVE")
print("="*70)

# 1. Test Servidor Activo
try:
    r = requests.get(f"{BASE_URL}/inmuebles/lista/")
    record("1. Disponibilidad Backend API", r.status_code == 200, f"Status: {r.status_code}")
except Exception as e:
    record("1. Disponibilidad Backend API", False, str(e))
    sys.exit(1)

# 2. Test Registro de Nuevo Usuario con Validación
email_test = f"test_qa_{os.getpid()}@nobleve.com"
password_test = "NoblePass2026*"

reg_payload = {
    "email": email_test,
    "first_name": "Auditor",
    "last_name": "Calidad",
    "password": password_test,
    "telefono": "78912345",
    "ci": "99887766 SC",
    "nacimiento": "1998-05-15",
    "rol": "usuario"
}

r = requests.post(f"{BASE_URL}/usuarios/registro/", json=reg_payload)
record("2. Registro de Usuario (+18 y CI)", r.status_code in [200, 201], f"Status {r.status_code}")

# 3. Test Login y Obtención de Tokens JWT
login_payload = {
    "email": email_test,
    "password": password_test
}
r = requests.post(f"{BASE_URL}/usuarios/login/", json=login_payload)
login_ok = r.status_code == 200
access_token = r.json().get("access") if login_ok else ""
record("3. Autenticación JWT y Emisión de Token", login_ok and bool(access_token), f"Token obtenido: {access_token[:20]}...")

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# 4. Test Perfil Usuario (Me)
r = requests.get(f"{BASE_URL}/usuarios/me/", headers=headers)
record("4. Consulta de Perfil de Usuario (/usuarios/me/)", r.status_code == 200, f"Email verificado: {r.json().get('email')}")

# 5. Test Catálogo Público de Inmuebles
r = requests.get(f"{BASE_URL}/inmuebles/lista/", headers=headers)
data = r.json()
inmuebles = data.get("results", data) if isinstance(data, dict) else data
inmueble_id = inmuebles[0]["id"] if (isinstance(inmuebles, list) and len(inmuebles) > 0) else None
record("5. Catálogo de Inmuebles", r.status_code == 200 and len(inmuebles) > 0, f"Propiedades listadas: {len(inmuebles)}")

# 6. Test Detalle Ficha Inmueble y Multimedia
if inmueble_id:
    r = requests.get(f"{BASE_URL}/inmuebles/lista/{inmueble_id}/", headers=headers)
    det = r.json() if r.status_code == 200 else {}
    titulo_inmueble = det.get('titulo') or (inmuebles[0].get('titulo') if isinstance(inmuebles[0], dict) else 'Inmueble')
    gal_count = len(det.get('galeria', []))
    record("6. Detalle Ficha Inmueble y Multimedia", r.status_code == 200, f"Título: {titulo_inmueble}, Galería: {gal_count} items")

# 7. Test Toggle Favoritos (Agregar a favoritos)
if inmueble_id:
    r = requests.post(f"{BASE_URL}/inmuebles/favoritos/toggle/", json={"inmueble": inmueble_id}, headers=headers)
    fav_data = r.json()
    is_fav_1 = fav_data.get("is_favorito")
    record("7.1 Marcar Inmueble como Favorito", r.status_code == 200 and is_fav_1 is True, f"Estado: {fav_data.get('status')}")

    # 7.2 Test Toggle Favoritos (Desmarcar de favoritos)
    r2 = requests.post(f"{BASE_URL}/inmuebles/favoritos/toggle/", json={"inmueble": inmueble_id}, headers=headers)
    fav_data_2 = r2.json()
    is_fav_2 = fav_data_2.get("is_favorito")
    record("7.2 Desmarcar Inmueble de Favoritos (Bidireccional)", r2.status_code == 200 and is_fav_2 is False, f"Estado: {fav_data_2.get('status')}")

# 8. Test Agenda de Citas
if inmueble_id:
    cita_payload = {
        "inmueble": inmueble_id,
        "fecha": "2026-09-10",
        "hora_inicio": "10:00:00",
        "motivo": "Visita programada desde QA Suite"
    }
    r = requests.post(f"{BASE_URL}/inmuebles/citas/", json=cita_payload, headers=headers)
    record("8. Agendamiento de Citas Inmobiliarias", r.status_code in [200, 201], f"Status: {r.status_code}")

# 9. Test Mis Inmuebles del Propietario
r = requests.get(f"{BASE_URL}/inmuebles/lista/mis_inmuebles/", headers=headers)
record("9. Consulta Mis Inmuebles Propietario", r.status_code == 200, f"Total registrados: {len(r.json().get('results', r.json())) if isinstance(r.json(), dict) else len(r.json())}")

# 10. Test Módulo de Notificaciones y Badges
r = requests.get(f"{BASE_URL}/usuarios/lista/badges/", headers=headers)
record("10. Sistema de Insignias y Alertas (/badges/)", r.status_code == 200, f"Badges: {r.json()}")

# 11. Test Frontend Bundle & Servidor Web (Vite)
frontend_ok = False
for port in [5174, 5173, 3000]:
    try:
        rf = requests.get(f"http://localhost:{port}/", timeout=2)
        if rf.status_code == 200:
            record("11. Servidor Frontend React (Vite)", True, f"Puerto activo {port}, status {rf.status_code}")
            frontend_ok = True
            break
    except Exception:
        pass

if not frontend_ok:
    record("11. Servidor Frontend React (Vite)", False, "No responde en puertos 5174/5173")

print("="*70)
total = len(RESULTS)
passed = sum(1 for x in RESULTS if x["success"])
print(f" RESUMEN FINAL: {passed}/{total} PRUEBAS APROBADAS ({(passed/total)*100:.1f}%)")
print("="*70)
