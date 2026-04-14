import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from inmuebles.models import Inmueble

def run_migration():
    data = {
        20: (10.00, 9.50),
        19: (11.00, 10.00),
        18: (8.00, 5.00),
        17: (40.00, 20.00),
        16: (20.00, 15.00),
        15: (12.00, 10.00),
        14: (10.00, 9.50),
        13: (20.00, 12.00),
        12: (9.00, 5.00),
        11: (20.00, 15.00),
        10: (20.00, 10.00),
        9: (20.00, 14.00),
        8: (10.00, 11.00),
        7: (7.00, 5.00),
        6: (10.00, 9.00),
        5: (21.00, 20.00),
        4: (10.00, 6.00),
        3: (25.00, 20.00),
        2: (10.00, 8.50),
        1: (25.00, 14.00),
    }

    print("Iniciando actualización de dimensiones...")
    for uid, (largo, ancho) in data.items():
        try:
            inm = Inmueble.objects.get(id=uid)
            inm.largo = largo
            inm.ancho = ancho
            # superficie se recalcula automáticamente en el save() del modelo
            inm.save()
            print(f"ID {uid} actualizado: {largo} x {ancho}")
        except Inmueble.DoesNotExist:
            print(f"ID {uid} no encontrado, saltando...")

if __name__ == "__main__":
    run_migration()
