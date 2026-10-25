from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0009_indexes_rendimiento'),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='acepto_terminos_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='usuario',
            name='terminos_version',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
