from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pagos', '0005_configuracionsistema'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='pago',
            index=models.Index(fields=['contrato', 'estado'], name='pago_con_estado_idx'),
        ),
        migrations.AddIndex(
            model_name='pago',
            index=models.Index(fields=['usuario', 'fecha'], name='pago_user_fecha_idx'),
        ),
    ]
