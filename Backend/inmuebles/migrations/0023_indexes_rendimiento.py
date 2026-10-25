from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inmuebles', '0022_alter_auditoriacheck_auditor'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='inmueble',
            index=models.Index(fields=['estado'], name='inm_estado_idx'),
        ),
        migrations.AddIndex(
            model_name='inmueble',
            index=models.Index(fields=['propietario', 'estado'], name='inm_prop_estado_idx'),
        ),
        migrations.AddIndex(
            model_name='multimedia',
            index=models.Index(fields=['inmueble', 'tipo'], name='mult_inm_tipo_idx'),
        ),
        migrations.AddIndex(
            model_name='publicacion',
            index=models.Index(fields=['estado', 'tipo_oferta'], name='pub_estado_tipo_idx'),
        ),
        migrations.AddIndex(
            model_name='contrato',
            index=models.Index(fields=['inmueble', 'estado'], name='con_inm_estado_idx'),
        ),
        migrations.AddIndex(
            model_name='cita',
            index=models.Index(fields=['propietario', 'fecha'], name='cita_prop_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='cita',
            index=models.Index(fields=['cliente', 'fecha'], name='cita_cli_fecha_idx'),
        ),
        migrations.AddIndex(
            model_name='accesorecorrido360',
            index=models.Index(fields=['inmueble', 'activo'], name='acc360_inm_act_idx'),
        ),
    ]
