import os
import django
import sys

# Añadir el directorio del proyecto al sys.path
sys.path.append('d:\\HDD\\DOCS\\docs\\Universidad\\ING SOFTWARE 1\\PROYECTO INMOBILIARIO\\Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from pagos.services.reportes_service import obtener_estadisticas_admin

def test():
    print("Testing with current year...")
    filtros = {'anio': '2026'}
    try:
        res = obtener_estadisticas_admin(filtros)
        print("Success:", res)
    except Exception as e:
        print("Error with anio:", e)
        import traceback
        traceback.print_exc()

    print("\nTesting with range...")
    filtros = {'rango': 'ultimos_12_meses'}
    try:
        res = obtener_estadisticas_admin(filtros)
        print("Success:", res)
    except Exception as e:
        print("Error with rango:", e)
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test()
