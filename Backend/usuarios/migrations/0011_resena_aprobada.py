from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0010_usuario_acepto_terminos'),
    ]

    operations = [
        migrations.AddField(
            model_name='resena',
            name='aprobada',
            field=models.BooleanField(default=False),
        ),
    ]
