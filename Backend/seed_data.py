import os
import django
from decimal import Decimal
from datetime import date, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from usuarios.models import Rol, Usuario
from inmuebles.models import TipoInmueble, Inmueble, TipoContrato, Contrato
from pagos.models import TipoPago, Pago, TipoPlan, Plan

def create_seed_data():
    print("Creando datos semilla...")

    # Roles
    rol_admin, _ = Rol.objects.get_or_create(nombre='Admin', descripcion='Administrador del sistema')
    rol_prop, _ = Rol.objects.get_or_create(nombre='Propietario', descripcion='Propietario de inmuebles')
    rol_inq, _ = Rol.objects.get_or_create(nombre='Inquilino', descripcion='Inquilino de inmuebles')

    # Usuarios
    if not Usuario.objects.filter(username='admin').exists():
        admin = Usuario.objects.create_superuser('admin', 'admin@example.com', 'admin123', rol=rol_admin)
        print("Superuser creado: admin / admin123")
    else:
        admin = Usuario.objects.get(username='admin')

    propietario, created_prop = Usuario.objects.get_or_create(
        username='propietario1',
        defaults={
            'email': 'propietario@example.com',
            'first_name': 'Juan',
            'last_name': 'Perez',
            'rol': rol_prop
        }
    )
    if created_prop:
        propietario.set_password('usuario123')
        propietario.save()
        print("Propietario creado: propietario1 / usuario123")

    inquilino, created_inq = Usuario.objects.get_or_create(
        username='inquilino1',
        defaults={
            'email': 'inquilino@example.com',
            'first_name': 'Maria',
            'last_name': 'Gomez',
            'rol': rol_inq
        }
    )
    if created_inq:
        inquilino.set_password('usuario123')
        inquilino.save()
        print("Inquilino creado: inquilino1 / usuario123")

    # Tipos de Inmueble
    tipo_casa, _ = TipoInmueble.objects.get_or_create(nombre='Casa')
    tipo_depa, _ = TipoInmueble.objects.get_or_create(nombre='Departamento')

    # Inmuebles
    inmueble1, _ = Inmueble.objects.get_or_create(
        titulo='Hermosa Casa en Zona Sur',
        defaults={
            'propietario': propietario,
            'tipo': tipo_casa,
            'descripcion': 'Casa amplia con 3 cuartos y piscina.',
            'direccion': 'Av. Principal 123',
            'ciudad': 'La Paz',
            'zona': 'Sur',
            'precio': Decimal('150000.00'),
            'superficie': Decimal('250.00'),
            'habitaciones': 3,
            'banos': 2,
            'garaje': True,
            'estado': 'disponible'
        }
    )

    inmueble2, _ = Inmueble.objects.get_or_create(
        titulo='Departamento Centrico',
        defaults={
            'propietario': propietario,
            'tipo': tipo_depa,
            'descripcion': 'Lindo departamento tipo estudio.',
            'direccion': 'San Jorge 456',
            'ciudad': 'La Paz',
            'zona': 'Centro',
            'precio': Decimal('85000.00'),
            'superficie': Decimal('70.00'),
            'habitaciones': 1,
            'banos': 1,
            'garaje': False,
            'estado': 'disponible'
        }
    )

    # Tipos de contrato y otros
    tipo_venta, _ = TipoContrato.objects.get_or_create(nombre='Venta')
    tipo_alq, _ = TipoContrato.objects.get_or_create(nombre='Alquiler')
    tipo_pago_efectivo, _ = TipoPago.objects.get_or_create(nombre='Efectivo')

    # Contrato (Alquiler para el inquilino1 en inmueble2)
    contrato1, created_cont = Contrato.objects.get_or_create(
        inmueble=inmueble2,
        inquilino=inquilino,
        defaults={
            'tipo_contrato': tipo_alq,
            'fecha_inicio': date.today(),
            'fecha_fin': date.today() + timedelta(days=365),
            'monto': Decimal('2500.00'),
            'deposito': Decimal('2500.00'),
            'estado': 'activo',
        }
    )
    if created_cont:
        inmueble2.estado = 'ocupado'
        inmueble2.save()
        print("Contrato creado para Departamento Centrico")

    # Pago
    if created_cont:
        Pago.objects.create(
            contrato=contrato1,
            tipo_pago=tipo_pago_efectivo,
            usuario=inquilino,
            monto=Decimal('2500.00'),
            fecha_pago=date.today(),
            estado='completado'
        )
        print("Pago inicial de alquiler registrado.")

    print("✅ Datos semilla creados exitosamente.")

if __name__ == '__main__':
    create_seed_data()
