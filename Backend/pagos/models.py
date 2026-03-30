from django.db import models
from django.conf import settings
from inmuebles.models import Contrato


class TipoPago(models.Model):
    """Métodos de pago: efectivo, transferencia, QR, tarjeta, etc."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Tipo de Pago'
        verbose_name_plural = 'Tipos de Pago'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Pago(models.Model):
    """Registro de pago vinculado a un contrato."""

    class EstadoPago(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        COMPLETADO = 'completado', 'Completado'
        ANULADO = 'anulado', 'Anulado'
        PARCIAL = 'parcial', 'Parcial'

    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name='pagos',
    )
    tipo_pago = models.ForeignKey(
        TipoPago,
        on_delete=models.SET_NULL,
        null=True,
        related_name='pagos',
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pagos',
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_pago = models.DateField()
    referencia = models.CharField(max_length=100, blank=True)
    comprobante = models.FileField(upload_to='pagos/comprobantes/', blank=True, null=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoPago.choices,
        default=EstadoPago.PENDIENTE,
    )
    observaciones = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha_pago']

    def __str__(self):
        return f'Pago #{self.id} — {self.monto} Bs'


class DetallePago(models.Model):
    """Desglose o conceptos de un pago."""
    pago = models.ForeignKey(
        Pago,
        on_delete=models.CASCADE,
        related_name='detalles',
    )
    concepto = models.CharField(max_length=200)
    monto = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        verbose_name = 'Detalle de Pago'
        verbose_name_plural = 'Detalles de Pago'

    def __str__(self):
        return f'{self.concepto} — {self.monto} Bs'


class HistorialPago(models.Model):
    """Log de cambios de estado en un pago."""
    pago = models.ForeignKey(
        Pago,
        on_delete=models.CASCADE,
        related_name='historial',
    )
    estado_anterior = models.CharField(max_length=20)
    estado_nuevo = models.CharField(max_length=20)
    comentario = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='historial_pagos',
    )

    class Meta:
        verbose_name = 'Historial de Pago'
        verbose_name_plural = 'Historial de Pagos'
        ordering = ['-fecha']

    def __str__(self):
        return f'Pago #{self.pago.id}: {self.estado_anterior} → {self.estado_nuevo}'


class TipoPlan(models.Model):
    """Categorías de planes de suscripción."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Tipo de Plan'
        verbose_name_plural = 'Tipos de Plan'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Plan(models.Model):
    """Plan de servicio/suscripción para el sistema."""
    tipo_plan = models.ForeignKey(
        TipoPlan,
        on_delete=models.SET_NULL,
        null=True,
        related_name='planes',
    )
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    precio_mensual = models.DecimalField(max_digits=10, decimal_places=2)
    duracion_meses = models.PositiveIntegerField(default=1)
    max_inmuebles = models.PositiveIntegerField(
        default=5,
        help_text='Cantidad máxima de inmuebles permitidos',
    )
    max_usuarios = models.PositiveIntegerField(
        default=1,
        help_text='Cantidad máxima de usuarios',
    )
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Planes'
        ordering = ['precio_mensual']

    def __str__(self):
        return f'{self.nombre} — {self.precio_mensual} Bs/mes'
