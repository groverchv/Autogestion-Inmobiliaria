from datetime import datetime, timedelta
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncMonth, TruncYear
from django.utils import timezone
from pagos.models import Pago, TransaccionStripe
from inmuebles.models import Comision, Contrato, Inmueble

def parsear_fechas(filtros: dict):
    """Extrae y parsea fechas desde los filtros."""
    rango = filtros.get('rango')
    fecha_inicio = filtros.get('fecha_inicio')
    fecha_fin = filtros.get('fecha_fin')
    anio = filtros.get('anio')
    
    hoy = timezone.now().date()
    
    if anio:
        try:
            anio_int = int(anio)
            fecha_inicio = datetime(anio_int, 1, 1).date()
            fecha_fin = datetime(anio_int, 12, 31).date()
        except ValueError:
            pass
    elif rango:
        if rango == 'mes_actual':
            fecha_inicio = hoy.replace(day=1)
            fecha_fin = hoy
        elif rango == 'ultimos_3_meses':
            fecha_inicio = hoy - timedelta(days=90)
            fecha_fin = hoy
        elif rango == 'ultimos_6_meses':
            fecha_inicio = hoy - timedelta(days=180)
            fecha_fin = hoy
        elif rango == 'ultimos_12_meses':
            fecha_inicio = hoy - timedelta(days=365)
            fecha_fin = hoy
    else:
        if fecha_inicio:
            fecha_inicio = datetime.strptime(fecha_inicio, '%Y-%m-%d').date()
        if fecha_fin:
            fecha_fin = datetime.strptime(fecha_fin, '%Y-%m-%d').date()
            
    return fecha_inicio, fecha_fin

def obtener_estadisticas_admin(filtros: dict) -> dict:
    """Devuelve las ganancias totales de la plataforma por comisiones."""
    fecha_inicio, fecha_fin = parsear_fechas(filtros)
    tipo_contrato = filtros.get('tipo_contrato')

    comisiones_qs = Comision.objects.filter(pagada=True)
    
    if fecha_inicio:
        comisiones_qs = comisiones_qs.filter(fecha__gte=fecha_inicio)
    if fecha_fin:
        comisiones_qs = comisiones_qs.filter(fecha__lte=fecha_fin)
    if tipo_contrato:
        comisiones_qs = comisiones_qs.filter(contrato__tipo_contrato__id=tipo_contrato)

    # Total generado
    total_comisiones = comisiones_qs.aggregate(total=Sum('monto'))['total'] or 0.0

    # Agrupación por mes para el gráfico
    evolucion_mensual = (
        comisiones_qs
        .annotate(mes=TruncMonth('fecha'))
        .values('mes')
        .annotate(ingreso=Sum('monto'))
        .order_by('mes')
    )

    data_grafico = [
        {"fecha": item['mes'].strftime('%Y-%m'), "ingreso": float(item['ingreso'])}
        for item in evolucion_mensual
    ]

    # KPIs extra
    total_pagos_exitosos = Pago.objects.filter(estado='completado').count()
    contratos_activos = Contrato.objects.filter(estado='activo').count()

    return {
        "kpis": {
            "total_ingreso_comisiones": float(total_comisiones),
            "total_pagos_exitosos": total_pagos_exitosos,
            "contratos_activos": contratos_activos
        },
        "grafico_evolucion": data_grafico
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
