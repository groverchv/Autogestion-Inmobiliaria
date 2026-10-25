from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0008_alter_usuario_options'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='notificacion',
            index=models.Index(fields=['usuario', 'leida'], name='notif_user_leida_idx'),
        ),
        migrations.AddIndex(
            model_name='mensaje',
            index=models.Index(fields=['chat', 'creado'], name='msg_chat_creado_idx'),
        ),
    ]
