from django.db import transaction
from django.db.models import Q
from .models import TipoContrato, Contrato
from django.core.exceptions import ValidationError


def get_tipo_contrato_by_id(tipo_contrato_id):
    """Get a tipo contrato by ID."""
    try:
        return TipoContrato.objects.get(id=tipo_contrato_id)
    except TipoContrato.DoesNotExist:
        return None


# def get_all_tipos_contrato() moved to selectors.py


def create_tipo_contrato(*, nombre, descripcion=''):
    """Create a new tipo contrato."""
    return TipoContrato.objects.create(
        nombre=nombre,
        descripcion=descripcion
    )


def update_tipo_contrato(tipo_contrato, *, nombre, descripcion=''):
    """Update an existing tipo contrato."""
    tipo_contrato.nombre = nombre
    tipo_contrato.descripcion = descripcion
    tipo_contrato.save()
    return tipo_contrato


@transaction.atomic
def delete_tipo_contrato(tipo_contrato_id):
    """Delete a tipo contrato, checking for referential integrity.
    
    Raises:
        ValidationError: If the tipo contrato is referenced by existing contracts.
    """
    tipo_contrato = get_tipo_contrato_by_id(tipo_contrato_id)
    if not tipo_contrato:
        raise ValidationError("Tipo de contrato no encontrado.")
    
    # Check if there are any contracts referencing this tipo contrato
    contracts_count = Contrato.objects.filter(tipo_contrato=tipo_contrato).count()
    if contracts_count > 0:
        raise ValidationError(
            f"No se puede eliminar este tipo de contrato porque está referenciado "
            f"por {contracts_count} contrato(s) existente(s)."
        )
    
    tipo_contrato.delete()


from django.template.loader import render_to_string
import tempfile
from .selectors import get_contrato_pdf_data

def generate_contract_pdf(contrato_id):
    """Generate a PDF for a contract using xhtml2pdf.
    
    Args:
        contrato_id: ID of the contract to generate PDF for
        
    Returns:
        bytes: PDF content as bytes
    """
    from xhtml2pdf import pisa
    from io import BytesIO
    
    context = get_contrato_pdf_data(contrato_id)
    html_string = render_to_string('contratos/pdf_template.html', context)
    
    result = BytesIO()
    pdf = pisa.pisaDocument(BytesIO(html_string.encode("UTF-8")), result)
    
    if not pdf.err:
        return result.getvalue()
    else:
        raise Exception(f"Error generando PDF: {pdf.err}")


import json
import requests
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from .selectors import get_datos_contrato_para_ia

def generar_contrato_pdf_con_ia(contrato_id: int, usuario) -> bytes:
    """Genera un PDF del contrato con IA (Groq) y diseño profesional tipo notarial."""

    # 1. Obtener datos
    datos = get_datos_contrato_para_ia(contrato_id, usuario)

    # 2. Construir Prompt
    prompt = f"""
Actúa como un Abogado Inmobiliario Boliviano experto. Redacta el texto legal completo para un {datos['tipo_contrato']}.
Usa estrictamente los siguientes datos, sin inventar ni agregar información extra:

- Propietario: {datos['propietario']['nombre']} (CI: {datos['propietario']['ci']})
- Inquilino/Cliente: {datos['inquilino']['nombre']} (CI: {datos['inquilino']['ci']})
- Inmueble: {datos['inmueble']['titulo']} ubicado en {datos['inmueble']['direccion']} (Superficie: {datos['inmueble']['superficie']} m2)
- Fecha de Inicio: {datos['fecha_inicio']}
- Fecha de Fin: {datos['fecha_fin']}
- Monto: {datos['monto']} {datos['moneda']}
- Día de pago: {datos['dia_pago']} de cada mes
- Depósito de Garantía: {datos['deposito']} {datos['moneda']}
- Cláusulas Adicionales: {datos['clausulas_adicionales']}
- Penalidades: {datos['penalidades']}

El contrato debe tener las secciones: ANTECEDENTES, OBJETO DEL CONTRATO, DURACIÓN, PRECIO Y FORMA DE PAGO, OBLIGACIONES DEL PROPIETARIO, OBLIGACIONES DEL ARRENDATARIO, GARANTÍA, CLÁUSULAS ESPECIALES, RESOLUCIÓN DEL CONTRATO, JURISDICCIÓN.
Devuelve ÚNICAMENTE el texto legal del contrato listo para imprimir. 
NO incluyas saludos, explicaciones, ni bloques de código. NO uses formato Markdown (sin asteriscos, sin numerales).
Usa un tono formal, legal y estructurado en párrafos claros. Separa cada sección con su título en MAYÚSCULAS seguido de dos saltos de línea.
"""

    # 3. Llamar a la API de Groq
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise Exception("La API Key de Groq no está configurada en el servidor.")
    headers_req = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "Eres un Abogado Inmobiliario Boliviano experto en redacción de contratos. Tu objetivo es generar contratos legales precisos, formales y completos."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 4096
    }

    try:
        resp = requests.post(url, json=payload, headers=headers_req, timeout=60)
        resp.raise_for_status()
        texto_contrato = resp.json()['choices'][0]['message']['content']
    except Exception as e:
        error_msg = str(e)
        raise Exception(f"Error al generar contrato con Groq: {error_msg}")

    # Limpiar markdown residual
    texto_contrato = texto_contrato.replace('**', '').replace('##', '').replace('# ', '').replace('#', '')

    # 4. Generar PDF con diseño profesional notarial
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=2.5 * cm,
        leftMargin=2.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,
    )

    # ── Paleta de colores ──────────────────────────────
    COLOR_PRIMARIO = colors.HexColor('#1a237e')   # Azul oscuro institucional
    COLOR_LINEA    = colors.HexColor('#424242')
    COLOR_GRIS     = colors.HexColor('#757575')

    # ── Estilos ────────────────────────────────────────
    styles = getSampleStyleSheet()

    st_encabezado = ParagraphStyle('Encabezado',
        parent=styles['Normal'], alignment=TA_CENTER,
        fontSize=9, textColor=COLOR_GRIS, leading=13)

    st_titulo_doc = ParagraphStyle('TituloDoc',
        parent=styles['Heading1'], alignment=TA_CENTER,
        fontSize=18, fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARIO, spaceAfter=4, leading=22)

    st_subtitulo = ParagraphStyle('Subtitulo',
        parent=styles['Normal'], alignment=TA_CENTER,
        fontSize=10, textColor=COLOR_GRIS, spaceAfter=16, leading=14)

    st_seccion = ParagraphStyle('Seccion',
        parent=styles['Normal'], alignment=TA_LEFT,
        fontSize=10, fontName='Helvetica-Bold',
        textColor=COLOR_PRIMARIO, spaceBefore=14, spaceAfter=4, leading=14)

    st_parrafo = ParagraphStyle('Parrafo',
        parent=styles['Normal'], alignment=TA_JUSTIFY,
        fontSize=10, leading=15, spaceAfter=8, fontName='Helvetica')

    st_firma_nombre = ParagraphStyle('FirmaNombre',
        parent=styles['Normal'], alignment=TA_CENTER,
        fontSize=9, fontName='Helvetica-Bold', leading=13)

    st_firma_dato = ParagraphStyle('FirmaDato',
        parent=styles['Normal'], alignment=TA_CENTER,
        fontSize=8, textColor=COLOR_GRIS, leading=12)

    st_pie = ParagraphStyle('Pie',
        parent=styles['Normal'], alignment=TA_CENTER,
        fontSize=7, textColor=COLOR_GRIS, leading=11)

    # ── Construcción de elementos ──────────────────────
    elementos = []

    # Encabezado institucional
    elementos.append(Paragraph('"AÑO DE LA INTEGRACIÓN DIGITAL DE BOLIVIA"', st_encabezado))
    elementos.append(Spacer(1, 0.3 * cm))
    elementos.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARIO))
    elementos.append(Spacer(1, 0.4 * cm))

    # Título principal
    tipo_upper = datos['tipo_contrato'].upper()
    elementos.append(Paragraph(tipo_upper, st_titulo_doc))
    elementos.append(Paragraph(f'Contrato N.° {contrato_id:04d}', st_subtitulo))
    elementos.append(HRFlowable(width="100%", thickness=1, color=COLOR_LINEA))
    elementos.append(Spacer(1, 0.5 * cm))

    # ── Bloque de datos de las partes ─────────────────
    prop = datos['propietario']
    inq  = datos['inquilino']

    datos_partes = [
        [
            Paragraph('<b>PROPIETARIO</b>', ParagraphStyle('H', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8, fontName='Helvetica-Bold', textColor=COLOR_PRIMARIO)),
            Paragraph('<b>ARRENDATARIO / COMPRADOR</b>', ParagraphStyle('H', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8, fontName='Helvetica-Bold', textColor=COLOR_PRIMARIO))
        ],
        [
            Paragraph(f"{prop['nombre']}<br/><font color='grey' size='8'>CI: {prop['ci']} &nbsp;·&nbsp; Tel: {prop['telefono']}</font>", ParagraphStyle('C', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, leading=14)),
            Paragraph(f"{inq['nombre']}<br/><font color='grey' size='8'>CI: {inq['ci']} &nbsp;·&nbsp; Tel: {inq['telefono']}</font>", ParagraphStyle('C', parent=styles['Normal'], alignment=TA_CENTER, fontSize=9, leading=14)),
        ]
    ]

    tabla_partes = Table(datos_partes, colWidths=['50%', '50%'])
    tabla_partes.setStyle(TableStyle([
        ('BACKGROUND',  (0, 0), (-1, 0), colors.HexColor('#e8eaf6')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9f9f9')]),
        ('BOX',         (0, 0), (-1, -1), 0.8, COLOR_PRIMARIO),
        ('INNERGRID',   (0, 0), (-1, -1), 0.5, colors.HexColor('#c5cae9')),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',  (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    elementos.append(tabla_partes)
    elementos.append(Spacer(1, 0.5 * cm))

    # Datos del inmueble y condiciones
    inmueble = datos['inmueble']
    datos_contrato_tabla = [
        ['Inmueble', inmueble['titulo']],
        ['Dirección', inmueble['direccion']],
        ['Superficie', f"{inmueble['superficie']} m²"],
        ['Vigencia', f"{datos['fecha_inicio']}  →  {datos['fecha_fin']}"],
        ['Monto mensual', f"{datos['monto']} {datos['moneda']}"],
        ['Día de pago', f"Día {datos['dia_pago']} de cada mes"],
        ['Depósito / Garantía', f"{datos['deposito']} {datos['moneda']}"],
    ]

    st_lbl = ParagraphStyle('Lbl', parent=styles['Normal'], fontSize=8, fontName='Helvetica-Bold', textColor=COLOR_PRIMARIO)
    st_val = ParagraphStyle('Val', parent=styles['Normal'], fontSize=9, fontName='Helvetica')

    tabla_info = Table(
        [[Paragraph(r[0], st_lbl), Paragraph(r[1], st_val)] for r in datos_contrato_tabla],
        colWidths=[4 * cm, None]
    )
    tabla_info.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#f5f5f5'), colors.white]),
        ('BOX',       (0, 0), (-1, -1), 0.6, COLOR_LINEA),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#e0e0e0')),
        ('VALIGN',    (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING',   (0, 0), (-1, -1), 8),
    ]))
    elementos.append(tabla_info)
    elementos.append(Spacer(1, 0.6 * cm))
    elementos.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_LINEA))
    elementos.append(Spacer(1, 0.4 * cm))

    # ── Cuerpo del contrato generado por IA ───────────
    lineas = texto_contrato.split('\n')
    for linea in lineas:
        limpia = linea.strip()
        if not limpia:
            continue
        # Detectar títulos de sección (líneas en MAYÚSCULAS o muy cortas)
        if limpia.isupper() and len(limpia) < 80:
            elementos.append(Paragraph(limpia, st_seccion))
        else:
            elementos.append(Paragraph(limpia, st_parrafo))

    # ── Bloque de firmas ───────────────────────────────
    elementos.append(Spacer(1, 1.5 * cm))
    elementos.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_LINEA))
    elementos.append(Spacer(1, 0.3 * cm))
    elementos.append(Paragraph('FIRMAS DE LAS PARTES', st_seccion))
    elementos.append(Spacer(1, 1.8 * cm))

    linea_firma = '.' * 48

    firmas_data = [
        [
            Paragraph(linea_firma, ParagraphStyle('LF', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10)),
            Paragraph(linea_firma, ParagraphStyle('LF', parent=styles['Normal'], alignment=TA_CENTER, fontSize=10)),
        ],
        [
            Paragraph(prop['nombre'].upper(), st_firma_nombre),
            Paragraph(inq['nombre'].upper(), st_firma_nombre),
        ],
        [
            Paragraph(f"CI: {prop['ci']}", st_firma_dato),
            Paragraph(f"CI: {inq['ci']}", st_firma_dato),
        ],
        [
            Paragraph('<b>PROPIETARIO</b>', st_firma_dato),
            Paragraph('<b>ARRENDATARIO / COMPRADOR</b>', st_firma_dato),
        ],
    ]

    tabla_firmas = Table(firmas_data, colWidths=['50%', '50%'])
    tabla_firmas.setStyle(TableStyle([
        ('VALIGN',  (0, 0), (-1, -1), 'BOTTOM'),
        ('ALIGN',   (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING',    (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    elementos.append(KeepTogether(tabla_firmas))

    # Pie de página
    elementos.append(Spacer(1, 1 * cm))
    elementos.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_LINEA))
    elementos.append(Spacer(1, 0.2 * cm))
    elementos.append(Paragraph(
        f'Documento generado electrónicamente por Autogestión Inmobiliaria · Contrato N.° {contrato_id:04d} · {datos["fecha_inicio"]}',
        st_pie
    ))

    # ── Build ──────────────────────────────────────────
    doc.build(elementos)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

