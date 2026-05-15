from datetime import datetime, timedelta
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth, TruncYear
from django.utils import timezone
from pagos.models import Pago, TransaccionStripe
from inmuebles.models import Comision, Contrato, Inmueble

import calendar

def parsear_fechas(filtros: dict):
    """Extrae y parsea fechas desde los filtros de manera robusta."""
    rango = filtros.get('rango')
    fecha_inicio = filtros.get('fecha_inicio')
    fecha_fin = filtros.get('fecha_fin')
    anio = filtros.get('anio')
    mes = filtros.get('mes')
    
    hoy = timezone.now().date()
    
    # Prioridad 1: Año (y opcionalmente mes)
    if anio and str(anio).strip():
        try:
            anio_int = int(anio)
            # Verificar si el mes es válido y numérico
            if mes and str(mes).isdigit():
                mes_int = int(mes)
                if 1 <= mes_int <= 12:
                    _, ultimo_dia = calendar.monthrange(anio_int, mes_int)
                    return (
                        datetime(anio_int, mes_int, 1).date(),
                        datetime(anio_int, mes_int, ultimo_dia).date()
                    )
            
            # Si no hay mes válido, filtrar todo el año
            return (
                datetime(anio_int, 1, 1).date(),
                datetime(anio_int, 12, 31).date()
            )
        except (ValueError, TypeError):
            pass

    # Prioridad 2: Rangos predefinidos
    if rango:
        if rango == 'mes_actual':
            return hoy.replace(day=1), hoy
        elif rango == 'ultimos_3_meses':
            return hoy - timedelta(days=90), hoy
        elif rango == 'ultimos_6_meses':
            return hoy - timedelta(days=180), hoy
        elif rango == 'ultimos_12_meses':
            return hoy - timedelta(days=365), hoy
            
    # Prioridad 3: Fechas explícitas
    try:
        if fecha_inicio and isinstance(fecha_inicio, str):
            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        if fecha_fin and isinstance(fecha_fin, str):
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None, None
            
    return fecha_inicio, fecha_fin

def obtener_estadisticas_admin(filtros: dict) -> dict:
    """Devuelve las ganancias totales de la plataforma por comisiones."""
    fecha_inicio, fecha_fin = parsear_fechas(filtros)
    tipo_contrato = filtros.get('tipo_contrato')
    ciudad_filtro = filtros.get('ciudad')
    mes_filtro = filtros.get('mes')

    comisiones_qs = Comision.objects.filter(pagada=True)
    
    if fecha_inicio:
        comisiones_qs = comisiones_qs.filter(fecha__gte=fecha_inicio)
    if fecha_fin:
        comisiones_qs = comisiones_qs.filter(fecha__lte=fecha_fin)
    if tipo_contrato:
        comisiones_qs = comisiones_qs.filter(contrato__tipo_contrato__id=tipo_contrato)
    if ciudad_filtro:
        comisiones_qs = comisiones_qs.filter(contrato__inmueble__direccion__ciudad__icontains=ciudad_filtro)

    # Total generado
    total_comisiones = comisiones_qs.aggregate(total=Sum('monto'))['total'] or 0.0

    data_grafico: list[dict] = []
    
    # Determinar el periodo base para el gráfico desde las fechas ya parseadas
    if fecha_inicio:
        anio_int = fecha_inicio.year
        # Si la fecha_inicio y fecha_fin corresponden al mismo mes, es vista mensual (diaria)
        es_vista_mensual = (fecha_inicio.month == fecha_fin.month and (fecha_fin - fecha_inicio).days < 32) if fecha_fin else False
        mes_int = fecha_inicio.month if es_vista_mensual else None
    else:
        anio_int = datetime.now().year
        mes_int = None

    if mes_int:
        # Vista DIARIA de un mes específico
        from django.db.models.functions import TruncDay
        
        evolucion_diaria = (
            comisiones_qs
            .annotate(dia=TruncDay('fecha'))
            .values('dia')
            .annotate(ingreso=Sum('monto'))
            .order_by('dia')
        )
        
        dict_ingresos = {item['dia'].strftime('%Y-%m-%d'): float(item['ingreso']) for item in evolucion_diaria}
        _, ultimo_dia = calendar.monthrange(anio_int, mes_int)
        
        for d in range(1, ultimo_dia + 1):
            fecha_str = f"{anio_int}-{mes_int:02d}-{d:02d}"
            data_grafico.append({
                "fecha": fecha_str,
                "ingreso": dict_ingresos.get(fecha_str, 0.0)
            })
    else:
        # Vista MENSUAL de un año completo (o rango)
        from django.db.models.functions import TruncMonth
        evolucion_mensual = (
            comisiones_qs
            .annotate(mes_trunc=TruncMonth('fecha'))
            .values('mes_trunc')
            .annotate(ingreso=Sum('monto'))
            .order_by('mes_trunc')
        )

        dict_ingresos = {item['mes_trunc'].strftime('%Y-%m'): float(item['ingreso']) for item in evolucion_mensual}

        for m in range(1, 13):
            mes_str = f"{anio_int}-{m:02d}"
            data_grafico.append({
                "fecha": mes_str,
                "ingreso": dict_ingresos.get(mes_str, 0.0)
            })

    # Agrupación por tipo de contrato para gráfico de torta
    evolucion_contratos = (
        comisiones_qs
        .values(contrato_nombre=F('contrato__tipo_contrato__nombre'))
        .annotate(ingreso=Sum('monto'))
        .order_by('-ingreso')
    )

    data_contratos = [
        {"contrato": item['contrato_nombre'] or 'Desconocido', "ingreso": float(item['ingreso'])}
        for item in evolucion_contratos
    ]

    # Detalles para la tabla dinámica (últimos 100 registros)
    detalles = (
        comisiones_qs
        .select_related('contrato__inmueble__direccion', 'contrato__tipo_contrato', 'pago__usuario')
        .order_by('-fecha')[:100]
    )
    
    tabla_detalles = []
    for c in detalles:
        try:
            ciudad = c.contrato.inmueble.direccion.ciudad if c.contrato and c.contrato.inmueble and hasattr(c.contrato.inmueble, 'direccion') and c.contrato.inmueble.direccion else 'N/A'
        except Exception:
            ciudad = 'N/A'
            
        tabla_detalles.append({
            "id": c.id,
            "fecha": c.fecha.strftime('%Y-%m-%d'),
            "monto": float(c.monto),
            "ciudad": ciudad,
            "tipo_contrato": c.contrato.tipo_contrato.nombre if c.contrato and c.contrato.tipo_contrato else 'N/A',
            "inmueble": c.contrato.inmueble.titulo if c.contrato and c.contrato.inmueble else 'Desconocido',
            "inquilino": c.pago.usuario.first_name + " " + c.pago.usuario.last_name if hasattr(c, 'pago') and c.pago and c.pago.usuario else 'N/A'
        })

    # KPIs extra con filtros aplicados (USAMOS LA VARIABLE 'ciudad' DEL FILTRO)
    from django.db.models import Q
    from pagos.models import Pago
    from inmuebles.models import Contrato
    
    pagos_qs = Pago.objects.filter(estado='completado')
    contratos_qs = Contrato.objects.all()

    if fecha_inicio:
        pagos_qs = pagos_qs.filter(fecha__gte=fecha_inicio)
        contratos_qs = contratos_qs.filter(Q(fin__isnull=True) | Q(fin__gte=fecha_inicio))
    if fecha_fin:
        pagos_qs = pagos_qs.filter(fecha__lte=fecha_fin)
        contratos_qs = contratos_qs.filter(inicio__lte=fecha_fin)
        
    if tipo_contrato:
        pagos_qs = pagos_qs.filter(contrato__tipo_contrato__id=tipo_contrato)
        contratos_qs = contratos_qs.filter(tipo_contrato__id=tipo_contrato)
    if ciudad_filtro:
        pagos_qs = pagos_qs.filter(contrato__inmueble__direccion__ciudad__icontains=ciudad_filtro)
        contratos_qs = contratos_qs.filter(inmueble__direccion__ciudad__icontains=ciudad_filtro)

    return {
        "kpis": {
            "total_ingreso_comisiones": float(total_comisiones),
            "total_pagos_exitosos": pagos_qs.count(),
            "contratos_activos": contratos_qs.filter(estado='activo').count()
        },
        "grafico_evolucion": data_grafico,
        "grafico_contratos": data_contratos,
        "tabla_detalles": tabla_detalles
    }

def obtener_balance_propietario(usuario, filtros: dict) -> dict:
    """Devuelve Ingresos Brutos, Comisiones Pagadas e Ingreso Neto para un propietario."""
    fecha_inicio, fecha_fin = parsear_fechas(filtros)
    inmueble_id = filtros.get('inmueble_id')
    tipo_contrato = filtros.get('tipo_contrato')

    # Pagos que el propietario recibió
    pagos_qs = Pago.objects.filter(
        estado='completado',
        contrato__inmueble__propietario=usuario
    )
    
    # Comisiones que salieron de esos pagos
    comisiones_qs = Comision.objects.filter(
        pagada=True,
        contrato__inmueble__propietario=usuario
    )

    if fecha_inicio:
        pagos_qs = pagos_qs.filter(fecha__gte=fecha_inicio)
        comisiones_qs = comisiones_qs.filter(fecha__gte=fecha_inicio)
    if fecha_fin:
        pagos_qs = pagos_qs.filter(fecha__lte=fecha_fin)
        comisiones_qs = comisiones_qs.filter(fecha__lte=fecha_fin)
    if inmueble_id:
        pagos_qs = pagos_qs.filter(contrato__inmueble_id=inmueble_id)
        comisiones_qs = comisiones_qs.filter(contrato__inmueble_id=inmueble_id)
    if tipo_contrato:
        pagos_qs = pagos_qs.filter(contrato__tipo_contrato__id=tipo_contrato)
        comisiones_qs = comisiones_qs.filter(contrato__tipo_contrato__id=tipo_contrato)

    ingreso_bruto = pagos_qs.aggregate(total=Sum('monto'))['total'] or 0.0
    total_comisiones = comisiones_qs.aggregate(total=Sum('monto'))['total'] or 0.0
    ingreso_neto = float(ingreso_bruto) - float(total_comisiones)

    # Evolución por mes de pagos
    evolucion_mensual = (
        pagos_qs
        .annotate(mes=TruncMonth('fecha'))
        .values('mes')
        .annotate(ingreso_bruto=Sum('monto'))
        .order_by('mes')
    )
    
    # Mapeo rápido de comisiones por mes
    comisiones_mensual = (
        comisiones_qs
        .annotate(mes=TruncMonth('fecha'))
        .values('mes')
        .annotate(comision=Sum('monto'))
    )
    
    dict_pagos = {item['mes'].strftime('%Y-%m'): float(item['ingreso_bruto']) for item in evolucion_mensual}
    
    data_grafico = []
    anio = filtros.get('anio')
    
    if anio:
        try:
            anio_int = int(anio)
            for mes in range(1, 13):
                mes_str = f"{anio_int}-{mes:02d}"
                bruto = dict_pagos.get(mes_str, 0.0)
                # Since we don't have datetime objects as keys anymore, we use the string
                # Wait, dict_comisiones keys are datetime, let's change it
                
                # dict_comisiones mapped by YYYY-MM
                comision = 0.0
                for c_item in comisiones_mensual:
                    if c_item['mes'].strftime('%Y-%m') == mes_str:
                        comision = float(c_item['comision'])
                        break
                        
                neto = bruto - comision
                data_grafico.append({
                    "fecha": mes_str,
                    "ingreso_bruto": bruto,
                    "comision_descontada": comision,
                    "ingreso_neto": neto
                })
        except ValueError:
            pass
    
    # Si no es por año, mantener el comportamiento original
    if not data_grafico:
        dict_comisiones = {item['mes'].strftime('%Y-%m'): float(item['comision']) for item in comisiones_mensual}
        for item in evolucion_mensual:
            mes_str = item['mes'].strftime('%Y-%m')
            bruto = float(item['ingreso_bruto'])
            comision = dict_comisiones.get(mes_str, 0.0)
            neto = bruto - comision
            data_grafico.append({
                "fecha": mes_str,
                "ingreso_bruto": bruto,
                "comision_descontada": comision,
                "ingreso_neto": neto
            })

    # Calcular promedio mensual
    promedio_mensual = ingreso_neto / 12 if anio else (ingreso_neto / len(data_grafico) if data_grafico else 0.0)

    # Distribución por inmueble (Gráfico de Anillo)
    distribucion_qs = (
        pagos_qs.values(nombre=F('contrato__inmueble__titulo'))
        .annotate(valor=Sum('monto'))
        .order_by('-valor')
    )
    
    dist_data = {item['nombre']: {"name": item['nombre'], "value": float(item['valor'])} for item in distribucion_qs}

    return {
        'kpis': {
            'ingreso_bruto': float(ingreso_bruto),
            'total_comisiones': float(total_comisiones),
            'ingreso_neto': float(ingreso_neto),
            'promedio_mensual': float(ingreso_neto) / 12,
        },
        'grafico_evolucion': data_grafico,
        'distribucion_inmuebles': list(dist_data.values())
    }

def obtener_comparativa_propietario(usuario, inmueble_id=None, tipo_contrato=None, num_anios=3, anio_referencia=None):
    """
    Retorna datos comparativos de ingresos netos agrupados por mes para los últimos N años
    contados desde el anio_referencia.
    """
    if anio_referencia:
        anio_actual = int(anio_referencia)
    else:
        hoy = timezone.now().date()
        anio_actual = hoy.year
        
    anios = range(anio_actual - num_anios + 1, anio_actual + 1)
    
    # Query base
    pagos_qs = Pago.objects.filter(
        estado='completado',
        contrato__inmueble__propietario=usuario
    )
    comisiones_qs = Comision.objects.filter(
        pagada=True,
        contrato__inmueble__propietario=usuario
    )

    if inmueble_id:
        pagos_qs = pagos_qs.filter(contrato__inmueble_id=inmueble_id)
        comisiones_qs = comisiones_qs.filter(contrato__inmueble_id=inmueble_id)
    if tipo_contrato:
        pagos_qs = pagos_qs.filter(contrato__tipo_contrato__id=tipo_contrato)
        comisiones_qs = comisiones_qs.filter(contrato__tipo_contrato__id=tipo_contrato)

    # Agrupar por mes y año
    pagos_data = (
        pagos_qs
        .annotate(year=TruncYear('fecha'), month=TruncMonth('fecha'))
        .values('year', 'month')
        .annotate(total=Sum('monto'))
    )
    
    comisiones_data = (
        comisiones_qs
        .annotate(year=TruncYear('fecha'), month=TruncMonth('fecha'))
        .values('year', 'month')
        .annotate(total=Sum('monto'))
    )

    # Mapear a dict para acceso rápido: {(anio, mes): monto}
    map_pagos = {(p['year'].year, p['month'].month): float(p['total']) for p in pagos_data}
    map_comisiones = {(c['year'].year, c['month'].month): float(c['total']) for c in comisiones_data}

    MESES_NOMBRES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    
    comparativa = []
    for mes_idx in range(1, 13):
        item = {'mes': MESES_NOMBRES[mes_idx - 1]}
        for a in anios:
            bruto = map_pagos.get((a, mes_idx), 0.0)
            comision = map_comisiones.get((a, mes_idx), 0.0)
            item[str(a)] = bruto - comision
        comparativa.append(item)

    return {
        'anios': list(anios),
        'data': comparativa
    }
