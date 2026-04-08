import os
import django
from decimal import Decimal
from datetime import date, timedelta, datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from usuarios.models import Usuario, Agenda, Notificacion, Chat, Mensaje, Bloqueo, Resena
from inmuebles.models import TipoInmueble, Inmueble, TipoContrato, Contrato, Multimedia, Direccion
from pagos.models import TipoPago, Pago, HistorialPago

def create_seed_data():
    print("Creando datos semilla completos...")

    # ═══════════════════════════════════════════════════════════
    #  USUARIOS
    # ═══════════════════════════════════════════════════════════
    if not Usuario.objects.filter(username='admin').exists():
        admin = Usuario.objects.create_superuser(
            'admin', 'admin@autogestion.bo', 'admin123',
            rol='admin', first_name='Carlos', last_name='Mendoza',
            ci='9876543', telefono='71234567',
        )
        print("  Superuser: admin / admin123")
    else:
        admin = Usuario.objects.get(username='admin')

    usuarios_data = [
        ('jpropietario', 'juan@mail.com', 'Juan', 'Pérez', 'usuario', '1234567', '70011001', date(1985, 3, 15)),
        ('mpropietaria', 'maria@mail.com', 'María', 'Torres', 'usuario', '2345678', '70022002', date(1990, 7, 22)),
        ('ragente', 'roberto@mail.com', 'Roberto', 'Flores', 'usuario', '3456789', '70033003', date(1988, 1, 10)),
        ('ccliente', 'carla@mail.com', 'Carla', 'Gutiérrez', 'usuario', '4567890', '70044004', date(1995, 5, 28)),
        ('dcliente', 'diego@mail.com', 'Diego', 'Quispe', 'usuario', '5678901', '70055005', date(1992, 11, 3)),
        ('ainquilino', 'ana@mail.com', 'Ana', 'Morales', 'usuario', '6789012', '70066006', date(1993, 9, 12)),
        ('linquilino', 'luis@mail.com', 'Luis', 'Choque', 'usuario', '7890123', '70077007', date(1991, 4, 8)),
        ('emoderador', 'elena@mail.com', 'Elena', 'Vargas', 'usuario', '8901234', '70088008', date(1987, 6, 20)),
        ('ssoporte', 'sofia@mail.com', 'Sofía', 'Salazar', 'usuario', '9012345', '70099009', date(1994, 2, 14)),
        ('pagente', 'pedro@mail.com', 'Pedro', 'Mamani', 'usuario', '0123456', '70100010', date(1986, 8, 1)),
    ]
    users = {'admin': admin}
    for uname, email, fn, ln, rol_n, ci, tel, fnac in usuarios_data:
        user, created = Usuario.objects.get_or_create(
            username=uname,
            defaults={
                'email': email, 'first_name': fn, 'last_name': ln,
                'rol': rol_n, 'ci': ci, 'telefono': tel,
                'fecha_nacimiento': fnac,
            }
        )
        if created:
            user.set_password('usuario123')
            user.save()
        users[uname] = user
    print(f"  Usuarios creados: {len(users)}")

    # ═══════════════════════════════════════════════════════════
    #  TIPOS DE INMUEBLE (Categorías)
    # ═══════════════════════════════════════════════════════════
    categorias_data = [
        ('Casa', 'Vivienda unifamiliar independiente.'),
        ('Departamento', 'Unidad habitacional dentro de un edificio.'),
        ('Terreno', 'Lote de tierra sin construcción.'),
        ('Oficina', 'Espacio comercial para actividades empresariales.'),
        ('Local Comercial', 'Espacio para tiendas, restaurantes o negocios.'),
        ('Loft', 'Espacio abierto con diseño industrial moderno.'),
        ('Garzoniere', 'Departamento tipo estudio pequeño.'),
    ]
    tipos = {}
    for nombre, desc in categorias_data:
        tipo, _ = TipoInmueble.objects.get_or_create(nombre=nombre, defaults={'descripcion': desc})
        tipos[nombre] = tipo
    print(f"  Categorías: {len(tipos)}")

    # ═══════════════════════════════════════════════════════════
    #  20 INMUEBLES
    # ═══════════════════════════════════════════════════════════
    inmuebles_data = [
        ('Casa Moderna Zona Sur', 'jpropietario', 'Casa', 'Amplia casa moderna con acabados premium, piscina y jardín.', 'Av. Los Sauces 120, Calacoto', 'La Paz', 'Sur', 285000, 350, 4, 3, True, 'disponible', '-16.5300, -68.0800'),
        ('Depto Miraflores 2 Hab', 'jpropietario', 'Departamento', 'Departamento céntrico con vista a la ciudad, 2 dormitorios.', 'Calle Indaburo 456', 'La Paz', 'Miraflores', 95000, 85, 2, 1, False, 'disponible', '-16.5020, -68.1280'),
        ('Terreno Mallasa 500m²', 'mpropietaria', 'Terreno', 'Terreno plano con acceso a agua y electricidad, ideal para construcción.', 'Camino a Mallasa Km 5', 'La Paz', 'Mallasa', 45000, 500, 0, 0, False, 'disponible', '-16.5500, -68.0900'),
        ('Oficina Prado Centro', 'mpropietaria', 'Oficina', 'Oficina ejecutiva en el corazón del Prado, amoblada.', 'Av. 16 de Julio 1234', 'La Paz', 'Centro', 120000, 60, 0, 1, False, 'disponible', '-16.4978, -68.1340'),
        ('Casa Colonial San Jorge', 'jpropietario', 'Casa', 'Hermosa casa colonial restaurada con patio interno.', 'Calle Rosendo Gutiérrez 789', 'La Paz', 'San Jorge', 350000, 420, 5, 4, True, 'ocupado', '-16.5035, -68.1290'),
        ('Local Comercial Sopocachi', 'mpropietaria', 'Local Comercial', 'Local con vitrina amplia y alto tráfico peatonal.', 'Av. 6 de Agosto 2345', 'La Paz', 'Sopocachi', 180000, 90, 0, 1, False, 'disponible', '-16.5080, -68.1250'),
        ('Garzoniere Estudiantil', 'ragente', 'Garzoniere', 'Departamento pequeño ideal para estudiantes universitarios.', 'Calle Landaeta 567', 'La Paz', 'San Pedro', 38000, 35, 1, 1, False, 'disponible', '-16.4980, -68.1380'),
        ('Loft Industrial El Alto', 'ragente', 'Loft', 'Loft con techos altos y grandes ventanales, estilo industrial.', 'Av. Juan Pablo II 890', 'El Alto', 'Distrito 1', 65000, 110, 1, 1, True, 'disponible', '-16.5100, -68.1600'),
        ('Casa Familiar Achumani', 'jpropietario', 'Casa', 'Casa espaciosa en urbanización cerrada con seguridad 24h.', 'Calle 21 de Achumani 234', 'La Paz', 'Achumani', 220000, 280, 4, 3, True, 'disponible', '-16.5350, -68.0650'),
        ('Depto Penthouse Calacoto', 'mpropietaria', 'Departamento', 'Penthouse de lujo con terraza panorámica y jacuzzi.', 'Av. Ballivián 3456', 'La Paz', 'Calacoto', 450000, 200, 3, 3, True, 'reservado', '-16.5280, -68.0780'),
        ('Terreno Urbanización Norte', 'pagente', 'Terreno', 'Terreno en nueva urbanización con todos los servicios básicos.', 'Urbanización Los Álamos, Lote 15', 'La Paz', 'Norte', 32000, 300, 0, 0, False, 'disponible', '-16.4800, -68.1400'),
        ('Oficina Coworking Centro', 'pagente', 'Oficina', 'Espacio de coworking con internet de alta velocidad y salas de reunión.', 'Calle Comercio 678', 'La Paz', 'Centro', 55000, 45, 0, 1, False, 'disponible', '-16.4960, -68.1350'),
        ('Casa con Jardín Seguencoma', 'jpropietario', 'Casa', 'Casa con amplio jardín trasero, cocina americana y lavandería.', 'Calle 8 de Seguencoma 345', 'La Paz', 'Seguencoma', 195000, 240, 3, 2, True, 'disponible', '-16.5250, -68.0850'),
        ('Depto Nuevo San Miguel', 'mpropietaria', 'Departamento', 'Departamento a estrenar en edificio con ascensor y parqueo.', 'Av. Montenegro 1234', 'La Paz', 'San Miguel', 130000, 95, 2, 2, True, 'disponible', '-16.5200, -68.0750'),
        ('Local Gastronómico El Prado', 'ragente', 'Local Comercial', 'Local con cocina industrial instalada, perfecto para restaurante.', 'Av. Mariscal Santa Cruz 456', 'La Paz', 'Centro', 200000, 120, 0, 2, False, 'disponible', '-16.4970, -68.1330'),
        ('Casa Minimalista Obrajes', 'pagente', 'Casa', 'Casa de diseño minimalista con eficiencia energética solar.', 'Calle 14 de Obrajes 567', 'La Paz', 'Obrajes', 310000, 300, 3, 2, True, 'disponible', '-16.5180, -68.1100'),
        ('Terreno Esquina Comercial', 'mpropietaria', 'Terreno', 'Terreno en esquina, ideal para proyecto comercial o multifamiliar.', 'Av. Panorámica Km 3', 'El Alto', 'Distrito 4', 78000, 800, 0, 0, False, 'disponible', '-16.5150, -68.1650'),
        ('Garzoniere Premium Centro', 'ragente', 'Garzoniere', 'Garzoniere totalmente amoblada con vista al Illimani.', 'Calle Mercado 890', 'La Paz', 'Centro', 52000, 40, 1, 1, False, 'ocupado', '-16.4990, -68.1320'),
        ('Depto Familiar Irpavi', 'jpropietario', 'Departamento', 'Departamento familiar cerca de colegios y supermercados.', 'Calle 3 de Irpavi 123', 'La Paz', 'Irpavi', 115000, 110, 3, 2, True, 'disponible', '-16.5380, -68.0600'),
        ('Loft Artístico Sopocachi', 'pagente', 'Loft', 'Loft de estilo artístico con galería incorporada.', 'Calle Guachalla 456', 'La Paz', 'Sopocachi', 88000, 95, 2, 1, False, 'disponible', '-16.5090, -68.1240'),
    ]
    inmuebles = {}
    for titulo, prop, tipo_n, desc, dir_, ciudad, zona, precio, sup, hab, banos, garaje, estado, gps in inmuebles_data:
        direccion_obj = Direccion.objects.create(
            ciudad=ciudad,
            zona=zona,
            calle=dir_
        )

        inm, _ = Inmueble.objects.get_or_create(
            titulo=titulo,
            defaults={
                'propietario': users[prop], 'tipo': tipos[tipo_n],
                'descripcion': desc,
                'direccion_fk': direccion_obj,
                'precio': Decimal(str(precio)),
                'superficie': Decimal(str(sup)), 'habitaciones': hab,
                'banos': banos, 'garaje': garaje, 'estado': estado,
                'gps': gps
            }
        )
        inmuebles[titulo] = inm
    print(f"  Inmuebles: {len(inmuebles)}")

    # ═══════════════════════════════════════════════════════════
    #  TIPOS DE CONTRATO
    # ═══════════════════════════════════════════════════════════
    tipos_contrato_data = [
        ('Alquiler', 'Contrato de arrendamiento mensual o anual.'),
        ('Venta', 'Contrato de compraventa de inmueble.'),
        ('Anticrético', 'Contrato de anticresis con depósito como garantía.'),
        ('Contrato Mixto', 'Combinación de alquiler con opción de compra.'),
    ]
    t_contratos = {}
    for nombre, desc in tipos_contrato_data:
        tc, _ = TipoContrato.objects.get_or_create(nombre=nombre, defaults={'descripcion': desc})
        t_contratos[nombre] = tc
    print(f"  Tipos de Contrato: {len(t_contratos)}")

    # ═══════════════════════════════════════════════════════════
    #  CONTRATOS
    # ═══════════════════════════════════════════════════════════
    contratos_data = [
        ('Casa Colonial San Jorge', 'ainquilino', 'Alquiler', 0, 365, 3500, 7000, 'activo'),
        ('Garzoniere Premium Centro', 'linquilino', 'Alquiler', -30, 335, 1800, 3600, 'activo'),
        ('Depto Miraflores 2 Hab', 'ccliente', 'Anticrético', -60, 305, 0, 25000, 'activo'),
        ('Casa Moderna Zona Sur', 'dcliente', 'Venta', -90, 0, 285000, 0, 'pendiente'),
        ('Depto Penthouse Calacoto', 'ainquilino', 'Contrato Mixto', -15, 350, 5000, 15000, 'activo'),
    ]
    contratos = {}
    for inm_titulo, inq_uname, tipo_c, offset_ini, dur, monto, dep, estado in contratos_data:
        c, created = Contrato.objects.get_or_create(
            inmueble=inmuebles[inm_titulo], inquilino=users[inq_uname],
            defaults={
                'tipo_contrato': t_contratos[tipo_c],
                'fecha_inicio': date.today() + timedelta(days=offset_ini),
                'fecha_fin': date.today() + timedelta(days=offset_ini + dur) if dur > 0 else None,
                'monto': Decimal(str(monto)), 'deposito': Decimal(str(dep)),
                'estado': estado,
            }
        )
        contratos[inm_titulo] = c
    print(f"  Contratos: {len(contratos)}")

    # ═══════════════════════════════════════════════════════════
    #  TIPOS DE PAGO
    # ═══════════════════════════════════════════════════════════
    tipos_pago_data = [
        ('Efectivo', 'Pago en efectivo en oficina.', True),
        ('Transferencia Bancaria', 'Transferencia a cuenta del propietario.', True),
        ('QR', 'Pago mediante código QR.', True),
        ('Tarjeta de Crédito', 'Pago con tarjeta de crédito o débito.', True),
        ('Cheque', 'Pago mediante cheque bancario.', False),
    ]
    t_pagos = {}
    for nombre, desc, activo in tipos_pago_data:
        tp, _ = TipoPago.objects.get_or_create(nombre=nombre, defaults={'descripcion': desc, 'activo': activo})
        t_pagos[nombre] = tp
    print(f"  Tipos de Pago: {len(t_pagos)}")

    # ═══════════════════════════════════════════════════════════
    #  PAGOS
    # ═══════════════════════════════════════════════════════════
    pagos_data = [
        ('Casa Colonial San Jorge', 'ainquilino', 'Efectivo', 3500, 0, 'completado', 'Pago mes 1'),
        ('Casa Colonial San Jorge', 'ainquilino', 'Transferencia Bancaria', 3500, -30, 'completado', 'Pago mes 2'),
        ('Casa Colonial San Jorge', 'ainquilino', 'QR', 3500, -60, 'completado', 'Pago mes 3'),
        ('Garzoniere Premium Centro', 'linquilino', 'Efectivo', 1800, 0, 'completado', 'Primer mes'),
        ('Garzoniere Premium Centro', 'linquilino', 'Transferencia Bancaria', 1800, -30, 'pendiente', 'Segundo mes'),
        ('Depto Penthouse Calacoto', 'ainquilino', 'Tarjeta de Crédito', 5000, -5, 'completado', 'Cuota mensual'),
        ('Depto Penthouse Calacoto', 'ainquilino', 'QR', 5000, -35, 'completado', 'Cuota anterior'),
        ('Casa Moderna Zona Sur', 'dcliente', 'Transferencia Bancaria', 50000, -10, 'completado', 'Adelanto venta'),
    ]
    pagos = []
    for inm_titulo, usr, tp_nombre, monto, offset, estado, obs in pagos_data:
        if inm_titulo in contratos:
            pago, created = Pago.objects.get_or_create(
                contrato=contratos[inm_titulo],
                usuario=users[usr],
                fecha_pago=date.today() + timedelta(days=offset),
                monto=Decimal(str(monto)),
                defaults={
                    'tipo_pago': t_pagos[tp_nombre], 'estado': estado,
                    'observaciones': obs,
                }
            )
            pagos.append(pago)
    print(f"  Pagos: {len(pagos)}")

    # ═══════════════════════════════════════════════════════════
    #  HISTORIAL DE PAGOS
    # ═══════════════════════════════════════════════════════════
    for pago in pagos[:4]:
        HistorialPago.objects.get_or_create(
            pago=pago, estado_anterior='pendiente', estado_nuevo='completado',
            defaults={'comentario': 'Pago verificado y aprobado.', 'usuario': admin}
        )
    print("  Historial de pagos generado.")

    # ═══════════════════════════════════════════════════════════
    #  AGENDA
    # ═══════════════════════════════════════════════════════════
    from django.utils import timezone
    agenda_data = [
        ('admin', 'Reunión con propietarios', 'Reunión mensual de revisión de propiedades.', 1, 2, 'Oficina Central', False),
        ('admin', 'Inspección casa Achumani', 'Verificar estado del inmueble antes de publicar.', 3, 4, 'Achumani, La Paz', False),
        ('ragente', 'Visita con cliente a Depto Miraflores', 'Carla Gutiérrez quiere ver el departamento.', 2, 3, 'Calle Indaburo 456, Miraflores', False),
        ('jpropietario', 'Firmar contrato alquiler', 'Firma de contrato con nuevo inquilino para casa colonial.', 5, 6, 'Notaría San Jorge', False),
        ('ainquilino', 'Pago alquiler mensual', 'Recordatorio de pago del alquiler.', 0, 0, 'Banco Unión', False),
        ('pagente', 'Sesión fotográfica Loft', 'Tomar fotos profesionales del loft en Sopocachi.', 4, 5, 'Calle Guachalla 456', False),
        ('emoderador', 'Revisión publicaciones pendientes', 'Revisar 5 inmuebles nuevos por aprobar.', 1, 2, 'Remoto', False),
        ('admin', 'Capacitación nuevo agente', 'Capacitar a nuevo agente en el uso del sistema.', 7, 9, 'Oficina Central', False),
    ]
    for usr, titulo, desc, di, df, ubic, comp in agenda_data:
        Agenda.objects.get_or_create(
            usuario=users[usr], titulo=titulo,
            defaults={
                'descripcion': desc,
                'fecha_inicio': timezone.now() + timedelta(days=di, hours=9),
                'fecha_fin': timezone.now() + timedelta(days=df, hours=11),
                'ubicacion': ubic, 'completado': comp,
            }
        )
    print(f"  Eventos de agenda: {len(agenda_data)}")

    # ═══════════════════════════════════════════════════════════
    #  NOTIFICACIONES
    # ═══════════════════════════════════════════════════════════
    notif_data = [
        ('ainquilino', 'pago', 'Pago de alquiler pendiente', 'Tu pago de alquiler de Bs. 3,500 vence en 3 días.'),
        ('linquilino', 'recordatorio', 'Vence tu contrato', 'Tu contrato de alquiler vence el próximo mes. Contacta al propietario.'),
        ('jpropietario', 'info', 'Nueva solicitud de visita', 'Carla Gutiérrez solicita visitar tu propiedad en Miraflores.'),
        ('mpropietaria', 'info', 'Inmueble destacado', 'Tu Depto Penthouse Calacoto fue destacado en el portal esta semana.'),
        ('ccliente', 'alerta', 'Precio actualizado', 'El inmueble Casa Moderna Zona Sur actualizó su precio.'),
        ('dcliente', 'info', 'Documentación pendiente', 'Necesitas subir tu CI y comprobante de ingresos para completar la compra.'),
        ('ragente', 'recordatorio', 'Visita programada mañana', 'Tienes una visita programada con Carla al Depto Miraflores.'),
        ('admin', 'alerta', 'Nuevo usuario registrado', 'Se registró un nuevo usuario: Pedro Mamani (pagente).'),
        ('emoderador', 'info', 'Publicaciones por revisar', 'Hay 3 nuevos inmuebles pendientes de aprobación.'),
        ('ssoporte', 'alerta', 'Ticket de soporte', 'Luis Choque reportó un problema al subir imágenes.'),
    ]
    for usr, tipo, titulo, mensaje in notif_data:
        Notificacion.objects.get_or_create(
            usuario=users[usr], titulo=titulo,
            defaults={'tipo': tipo, 'mensaje': mensaje, 'leida': False}
        )
    print(f"  Notificaciones: {len(notif_data)}")

    # ═══════════════════════════════════════════════════════════
    #  CHATS Y MENSAJES
    # ═══════════════════════════════════════════════════════════
    chats_data = [
        ('ccliente', 'jpropietario', 'Casa Moderna Zona Sur', [
            ('ccliente', 'texto', 'Hola, me interesa la casa en Zona Sur. ¿Está disponible para visita?', ''),
            ('jpropietario', 'texto', '¡Hola Carla! Sí, la casa está disponible. ¿Cuándo te gustaría visitarla?', ''),
            ('ccliente', 'texto', '¿Puede ser este sábado por la mañana?', ''),
            ('jpropietario', 'texto', 'Perfecto, te espero a las 10:00 AM. Te comparto la ubicación:', ''),
            ('jpropietario', 'ubicacion', 'Ubicación de la propiedad', '-16.5300, -68.0800'),
            ('ccliente', 'emoji', '👍 ¡Genial, ahí estaré!', ''),
        ]),
        ('ainquilino', 'jpropietario', 'Casa Colonial San Jorge', [
            ('ainquilino', 'texto', 'Buenas tardes, quería consultar sobre el pago del próximo mes.', ''),
            ('jpropietario', 'texto', 'Buenas Ana, sí. El pago vence el día 15. ¿Hay algún inconveniente?', ''),
            ('ainquilino', 'texto', 'No, solo quería confirmar la fecha. ¿Puedo pagar por QR?', ''),
            ('jpropietario', 'texto', 'Claro, te envío el código QR por WhatsApp. Sin problema.', ''),
        ]),
        ('dcliente', 'mpropietaria', 'Depto Penthouse Calacoto', [
            ('dcliente', 'texto', 'Hola María, vi el penthouse en Calacoto y es espectacular.', ''),
            ('mpropietaria', 'texto', 'Gracias Diego, es una de nuestras mejores propiedades. ¿Te interesa agendar una visita?', ''),
            ('dcliente', 'texto', '¡Sí! ¿Tienen disponibilidad esta semana?', ''),
        ]),
        ('linquilino', 'ragente', 'Garzoniere Premium Centro', [
            ('linquilino', 'texto', 'Hola Roberto, tengo un problema con la cerradura de la puerta.', ''),
            ('ragente', 'texto', 'Hola Luis, lamento eso. Enviaré un cerrajero mañana temprano.', ''),
            ('linquilino', 'texto', 'Gracias, estaré en la garzoniere hasta las 12:00.', ''),
            ('ragente', 'texto', '👌 Perfecto, el cerrajero llegará entre 9 y 10 AM.', ''),
        ]),
    ]
    for p1_uname, p2_uname, inm_titulo, msgs in chats_data:
        inm = inmuebles.get(inm_titulo)
        chat, _ = Chat.objects.get_or_create(
            participante1=users[p1_uname],
            participante2=users[p2_uname],
            defaults={'inmueble': inm}
        )
        for rem_uname, tipo_msg, contenido, ubicacion in msgs:
            Mensaje.objects.get_or_create(
                chat=chat,
                remitente=users[rem_uname],
                contenido=contenido,
                defaults={
                    'tipo_mensaje': tipo_msg,
                    'ubicacion_gps': ubicacion,
                }
            )
    print(f"  Chats: {len(chats_data)}")

    # ═══════════════════════════════════════════════════════════
    #  RESEÑAS
    # ═══════════════════════════════════════════════════════════
    resenas_data = [
        ('ccliente', 'Casa Moderna Zona Sur', 5, 'Increíble propiedad, muy bien mantenida y con excelente ubicación.'),
        ('dcliente', 'Casa Moderna Zona Sur', 4, 'Muy buena casa, pero el acceso es un poco complicado en hora pico.'),
        ('ainquilino', 'Casa Colonial San Jorge', 5, 'Hermosa casa colonial, perfecta para vivir. Los techos altos le dan mucho carácter.'),
        ('linquilino', 'Garzoniere Premium Centro', 4, 'Buena ubicación y departamento cómodo. Solo le falta un poco de luz natural.'),
        ('ccliente', 'Depto Penthouse Calacoto', 5, 'El penthouse es increíble, la vista panorámica no tiene comparación.'),
        ('dcliente', 'Depto Miraflores 2 Hab', 3, 'Departamento funcional pero un poco pequeño. La ubicación es buena.'),
        ('ainquilino', 'Loft Artístico Sopocachi', 4, 'Un espacio muy creativo y bien diseñado. Me encantó la galería.'),
        ('emoderador', 'Casa Familiar Achumani', 5, 'Excelente zona residencial, muy tranquila y segura. La casa es perfecta.'),
        ('ssoporte', 'Oficina Prado Centro', 4, 'Oficina bien ubicada, ideal para negocios. Tiene buen mobiliario.'),
        ('pagente', 'Depto Nuevo San Miguel', 5, 'Departamento nuevo y moderno. El edificio tiene muy buenas áreas comunes.'),
    ]
    for usr, inm_titulo, calif, com in resenas_data:
        Resena.objects.get_or_create(
            usuario=users[usr],
            inmueble=inmuebles[inm_titulo],
            defaults={'calificacion': calif, 'comentario': com}
        )
    print(f"  Reseñas: {len(resenas_data)}")

    # ═══════════════════════════════════════════════════════════
    #  BLOQUEOS (ejemplo)
    # ═══════════════════════════════════════════════════════════
    Bloqueo.objects.get_or_create(
        bloqueador=users['ssoporte'],
        bloqueado=users['emoderador']
    )
    print("  Bloqueos de ejemplo: 1")

    print("\n  Datos semilla creados exitosamente.")
    print("  ──────────────────────────────────────────────")
    print("  Acceso Admin:  admin / admin123")
    print("  Otros usuarios: usuario123")
    print("  ──────────────────────────────────────────────")


if __name__ == '__main__':
    create_seed_data()
