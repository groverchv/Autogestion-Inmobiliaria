from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Modelo de usuario personalizado que extiende AbstractUser."""
    class RolesConfig(models.TextChoices):
        ADMIN = 'admin', 'Administrador'
        USUARIO = 'usuario', 'Usuario'

    rol = models.CharField(
        max_length=20,
        choices=RolesConfig.choices,
        default=RolesConfig.USUARIO,
    )
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    foto = models.ImageField(upload_to='usuarios/fotos/', blank=True, null=True)
    fecha_nacimiento = models.DateField(null=True, blank=True)
    ci = models.CharField('Cédula de Identidad', max_length=20, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f'{self.get_full_name()} ({self.username})'


class Agenda(models.Model):
    """Eventos y citas del usuario."""
    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='agendas',
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(null=True, blank=True)
    ubicacion = models.CharField(max_length=255, blank=True)
    completado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Agenda'
        verbose_name_plural = 'Agendas'
        ordering = ['-fecha_inicio']

    def __str__(self):
        return f'{self.titulo} — {self.usuario.username}'


class Notificacion(models.Model):
    """Notificaciones del sistema para el usuario."""

    class TipoNotificacion(models.TextChoices):
        INFO = 'info', 'Información'
        ALERTA = 'alerta', 'Alerta'
        RECORDATORIO = 'recordatorio', 'Recordatorio'
        PAGO = 'pago', 'Pago'

    usuario = models.ForeignKey(
        Usuario,
        on_delete=models.CASCADE,
        related_name='notificaciones',
    )
    tipo = models.CharField(
        max_length=20,
        choices=TipoNotificacion.choices,
        default=TipoNotificacion.INFO,
    )
    titulo = models.CharField(max_length=200)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    creada = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notificación'
        verbose_name_plural = 'Notificaciones'
        ordering = ['-creada']

    def __str__(self):
        return f'{self.titulo} → {self.usuario.username}'
