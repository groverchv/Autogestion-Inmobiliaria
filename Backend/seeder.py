import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inmuebles.models import Direccion, Inmueble, TipoInmueble
from django.contrib.auth import get_user_model

Usuario = get_user_model()

def run():
    print("Iniciando inyección de datos de prueba...")
    
    # Asegurar que haya un usuario
    user = Usuario.objects.first()
    if not user:
         user = Usuario.objects.create_user(username='admin_seed', email='admin@seed.com', password='adminpassword123', nombre='Admin Seed', apellido='Seed')
         print(f"Usuario creado con ID: {user.id}")

    # Asegurar que haya tipos de inmueble
    tipo_casa, _ = TipoInmueble.objects.get_or_create(nombre='Casa', defaults={'descripcion': 'Vivienda independiente'})
    tipo_depto, _ = TipoInmueble.objects.get_or_create(nombre='Departamento', defaults={'descripcion': 'Vivienda en edificio'})

    data = [
        # La Paz
        {"ciudad": "La Paz", "zona": "Sopocachi", "calle": "Av. 20 de Octubre", "referencia": "Cerca a la Plaza Abaroa", "largo": 20.00, "ancho": 10.00, "superficie": 200.00, "precio": 150000.00},
        {"ciudad": "La Paz", "zona": "Calacoto", "calle": "Av. Ballivián", "referencia": "Frente a la Torre de Cristal", "largo": 30.00, "ancho": 15.00, "superficie": 450.00, "precio": 450000.00},
        {"ciudad": "La Paz", "zona": "Miraflores", "calle": "Av. Saavedra", "referencia": "Lado del Estadio Hernando Siles", "largo": 25.00, "ancho": 12.00, "superficie": 300.00, "precio": 220000.00},
        {"ciudad": "La Paz", "zona": "Obrajes", "calle": "Calle 17", "referencia": "Cerca a la Universidad Católica", "largo": 22.00, "ancho": 11.00, "superficie": 242.00, "precio": 190000.00},
        {"ciudad": "La Paz", "zona": "San Jorge", "calle": "Av. Arce", "referencia": "Edificio Multicine", "largo": 18.00, "ancho": 15.00, "superficie": 270.00, "precio": 310000.00},
        # Santa Cruz
        {"ciudad": "Santa Cruz", "zona": "Equipetrol", "calle": "Av. San Martín", "referencia": "Detrás del Hotel Los Tajibos", "largo": 40.00, "ancho": 20.00, "superficie": 800.00, "precio": 850000.00},
        {"ciudad": "Santa Cruz", "zona": "Las Palmas", "calle": "Av. Los Cusis", "referencia": "Cerca al Country Club", "largo": 50.00, "ancho": 25.00, "superficie": 1250.00, "precio": 1200000.00},
        {"ciudad": "Santa Cruz", "zona": "Urbarí", "calle": "Calle Enrrique Finot", "referencia": "A media cuadra del 2do Anillo", "largo": 30.00, "ancho": 12.00, "superficie": 360.00, "precio": 350000.00},
        {"ciudad": "Santa Cruz", "zona": "Sirari", "calle": "Calle Los Claveles", "referencia": "Zona residencial exclusiva", "largo": 28.00, "ancho": 14.00, "superficie": 392.00, "precio": 380000.00},
        {"ciudad": "Santa Cruz", "zona": "Plan 3000", "calle": "Av. Paurito", "referencia": "Frente al Obelisco", "largo": 30.00, "ancho": 10.00, "superficie": 300.00, "precio": 150000.00},
    ]

    for item in data:
        print(f"Insertando: {item['zona']}, {item['ciudad']}...")
        
        # 1. Crear direccion
        direccion = Direccion.objects.create(
            ciudad=item['ciudad'],
            zona=item['zona'],
            calle=item['calle'],
            referencia=item['referencia']
        )
        
        # 2. Crear inmueble
        # Alternar entre Casa y Depto y asignar titulo lógico
        tipoAsignado = tipo_casa if item['superficie'] > 300 else tipo_depto
        tipo_nombre = 'Espectacular Casa' if tipoAsignado == tipo_casa else 'Hermoso Departamento'

        inmueble = Inmueble.objects.create(
            titulo=f"{tipo_nombre} en {item['zona']}",
            descripcion=f"Ubicado en {item['calle']}. {item['referencia']}. Ideal para vivir comodamente.",
            tipo=tipoAsignado,
            direccion_fk=direccion,
            propietario=user,
            precio=item['precio'],
            largo=item['largo'],
            ancho=item['ancho'],
            habitaciones=3,
            banos=2,
            estado='disponible'
        )
        # El hook save de inmueble ya calculará la superficie por su cuenta basandose en largo x ancho,
        # esto pondrá a prueba la característica que implementamos.

    print("✅ Inserción finalizada exitosamente. 10 registros agregados.")

if __name__ == '__main__':
    run()
