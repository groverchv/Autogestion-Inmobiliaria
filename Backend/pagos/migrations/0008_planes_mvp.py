"""Alinea los planes operativos con los publicados en el sitio corporativo.

Gratis (Bs 0, 1 propiedad, 8 fotos) — Profesional (Bs 190, 10 propiedades,
360+destacados+estadísticas) — Inmobiliaria (Bs 490, 50 propiedades, multi-usuario).
"""
from django.db import migrations


def alinear(apps, schema_editor):
    Plan = apps.get_model('pagos', 'Plan')
    TipoPlan = apps.get_model('pagos', 'TipoPlan')

    mensual = TipoPlan.objects.filter(nombre__iexact='mensual').first() or TipoPlan.objects.first()

    # Plan 1 → Gratis
    p = Plan.objects.order_by('id').first()
    if p:
        p.nombre = 'Gratis'
        p.precio = 0
        p.duracion = 1
        p.max_inmuebles = 1
        p.max_usuarios = 1
        p.max_fotos = 8
        p.permite_360 = False
        p.permite_destacado = False
        p.permite_estadisticas = False
        p.descripcion = 'Para empezar a publicar sin costo.'
        p.activo = True
        if mensual:
            p.tipo_plan = mensual
        p.save()
    else:
        Plan.objects.create(
            nombre='Gratis', precio=0, duracion=1, max_inmuebles=1,
            max_usuarios=1, max_fotos=8, tipo_plan=mensual,
            descripcion='Para empezar a publicar sin costo.', activo=True,
        )

    # Plan 2 → Profesional
    resto = Plan.objects.exclude(nombre='Gratis').order_by('id').first()
    datos_prof = dict(
        nombre='Profesional', precio=190, duracion=1, max_inmuebles=10,
        max_usuarios=1, max_fotos=0, permite_360=True, permite_destacado=True,
        permite_estadisticas=True, descripcion='Para agentes que venden en serio.',
        activo=True,
    )
    if resto:
        for k, v in datos_prof.items():
            setattr(resto, k, v)
        if mensual:
            resto.tipo_plan = mensual
        resto.save()
    else:
        Plan.objects.create(tipo_plan=mensual, **datos_prof)

    # Plan 3 → Inmobiliaria (crear si no existe)
    if not Plan.objects.filter(nombre='Inmobiliaria').exists():
        Plan.objects.create(
            nombre='Inmobiliaria', precio=490, duracion=1, max_inmuebles=50,
            max_usuarios=5, max_fotos=0, permite_360=True, permite_destacado=True,
            permite_estadisticas=True, tipo_plan=mensual,
            descripcion='Para equipos y agencias con cartera amplia.', activo=True,
        )


def revertir(apps, schema_editor):
    Plan = apps.get_model('pagos', 'Plan')
    Plan.objects.filter(nombre='Inmobiliaria').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pagos', '0007_pagosuscripcion_suscripcion_and_more'),
    ]

    operations = [
        migrations.RunPython(alinear, revertir),
    ]
