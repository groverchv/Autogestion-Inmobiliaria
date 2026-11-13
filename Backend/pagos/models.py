from django.db import models
from django.conf import settings
from django.utils import timezone
from inmuebles.models import Contrato


class TipoPago(models.Model):
    """Métodos de pago: efectivo, transferencia, QR, tarjeta, etc."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        db_table = 'pagos_tipo_pago'
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
    fecha = models.DateField()
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
        db_table = 'pagos_pago'
        verbose_name = 'Pago'
        verbose_name_plural = 'Pagos'
        ordering = ['-fecha']

    def save(self, *args, **kwargs):
        # Primero guardamos en la base de datos local
        super().save(*args, **kwargs)
        
        # Sincronización asíncrona a Blockchain si fue completado (background)
        if self.estado == 'completado':
            try:
                from inmuebles.blockchain_service import BlockchainService
                BlockchainService.dispatch(self._sync_blockchain_pago)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Error despachando sync blockchain de pago {self.id}: {str(e)}")

    def _sync_blockchain_pago(self):
        """Registra el pago en el ledger — corre en el pool de background."""
        try:
            from inmuebles.blockchain_service import BlockchainService
            BlockchainService.registrar_pago(
                pago_id=self.id,
                contrato_id=self.contrato.id,
                monto=self.monto,
                fecha_str=self.fecha,
                tipo_pago=self.tipo_pago.nombre if self.tipo_pago else "Efectivo",
                transaction_id=self.referencia
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error sincronizando pago {self.id} con Blockchain: {str(e)}")

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
        db_table = 'pagos_detalle_pago'
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
    anterior = models.CharField(max_length=20)
    nuevo = models.CharField(max_length=20)
    comentario = models.TextField(blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='historial_pagos',
    )

    class Meta:
        db_table = 'pagos_historial_pago'
        verbose_name = 'Historial de Pago'
        verbose_name_plural = 'Historial de Pagos'
        ordering = ['-fecha']

    def __str__(self):
        return f'Pago #{self.pago.id}: {self.anterior} → {self.nuevo}'


class TipoPlan(models.Model):
    """Categorías de planes de suscripción."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = 'pagos_tipo_plan'
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
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    duracion = models.PositiveIntegerField(default=1, help_text='Duración en meses')
    max_inmuebles = models.PositiveIntegerField(
        default=5,
        help_text='Cantidad máxima de inmuebles permitidos',
    )
    max_usuarios = models.PositiveIntegerField(
        default=1,
        help_text='Cantidad máxima de usuarios',
    )
    activo = models.BooleanField(default=True)
    permite_360 = models.BooleanField(default=False, help_text='Tours 360 en las propiedades')
    permite_destacado = models.BooleanField(default=False, help_text='Marcar propiedades como destacadas')
    permite_estadisticas = models.BooleanField(default=False, help_text='Ver estadísticas de visitas')
    max_fotos = models.PositiveIntegerField(
        default=8,
        help_text='Máximo de fotos por inmueble (0 = ilimitado)',
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pagos_plan'
        verbose_name = 'Plan'
        verbose_name_plural = 'Planes'
        ordering = ['precio']

    def __str__(self):
        return f'{self.nombre} — {self.precio} Bs/mes'


class Suscripcion(models.Model):
    """Plan contratado por un usuario (una activa a la vez)."""

    class Estado(models.TextChoices):
        ACTIVA = 'activa', 'Activa'
        VENCIDA = 'vencida', 'Vencida'
        CANCELADA = 'cancelada', 'Cancelada'
        PENDIENTE = 'pendiente', 'Pendiente de pago'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='suscripciones',
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='suscripciones',
    )
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    fecha_inicio = models.DateTimeField(auto_now_add=True)
    fecha_vencimiento = models.DateField(
        null=True, blank=True,
        help_text='Null = sin vencimiento (plan gratuito)',
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pagos_suscripcion'
        verbose_name = 'Suscripción'
        verbose_name_plural = 'Suscripciones'
        ordering = ['-creado']
        indexes = [
            models.Index(fields=['usuario', 'estado'], name='sus_user_estado_idx'),
        ]

    def vigente(self):
        return self.estado == self.Estado.ACTIVA and (
            self.fecha_vencimiento is None or self.fecha_vencimiento >= timezone.now().date()
        )

    def __str__(self):
        return f'{self.usuario} — {self.plan.nombre} ({self.estado})'


class PagoSuscripcion(models.Model):
    """Pago de una suscripción. Al completarse, activa el plan."""

    class Metodo(models.TextChoices):
        QR = 'qr', 'QR Bolivia'
        TRANSFERENCIA = 'transferencia', 'Transferencia'
        STRIPE = 'stripe', 'Tarjeta (Stripe)'
        MANUAL = 'manual', 'Manual (admin)'

    class Estado(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        EN_REVISION = 'en_revision', 'Comprobante en revisión'
        COMPLETADO = 'completado', 'Completado'
        RECHAZADO = 'rechazado', 'Rechazado'
        CANCELADO = 'cancelado', 'Cancelado por el usuario'

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pagos_suscripcion',
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name='pagos_suscripcion',
    )
    monto = models.DecimalField(max_digits=10, decimal_places=2)
    metodo = models.CharField(max_length=20, choices=Metodo.choices, default=Metodo.QR)
    referencia = models.CharField(max_length=100, blank=True)
    stripe_session_id = models.CharField(max_length=255, blank=True)
    comprobante = models.FileField(upload_to='pagos/suscripciones/', blank=True, null=True)
    estado = models.CharField(
        max_length=20,
        choices=Estado.choices,
        default=Estado.PENDIENTE,
    )
    creado = models.DateTimeField(auto_now_add=True)
    procesado = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'pagos_pago_suscripcion'
        verbose_name = 'Pago de suscripción'
        verbose_name_plural = 'Pagos de suscripción'
        ordering = ['-creado']

    def save(self, *args, **kwargs):
        completando = (
            self.pk is None and self.estado == self.Estado.COMPLETADO
        ) or (
            self.pk is not None
            and self.estado == self.Estado.COMPLETADO
            and type(self).objects.filter(pk=self.pk).exclude(estado=self.Estado.COMPLETADO).exists()
        )
        if completando and self.procesado is None:
            self.procesado = timezone.now()
        super().save(*args, **kwargs)
        if completando:
            from .services_plan import activar_suscripcion
            activar_suscripcion(self)

    def __str__(self):
        return f'PagoSus #{self.id} — {self.usuario} → {self.plan.nombre} ({self.estado})'


class TransaccionStripe(models.Model):
    """Registro de transacciones de pago procesadas por Stripe."""

    class EstadoTransaccion(models.TextChoices):
        PENDIENTE = 'pendiente', 'Pendiente'
        COMPLETADA = 'completada', 'Completada'
        FALLIDA = 'fallida', 'Fallida'
        CANCELADA = 'cancelada', 'Cancelada'
        REEMBOLSADA = 'reembolsada', 'Reembolsada'

    class TipoOperacion(models.TextChoices):
        COMPRA = 'compra', 'Compra'
        ALQUILER = 'alquiler', 'Alquiler'
        DEPOSITO = 'deposito', 'Depósito'
        MENSUALIDAD = 'mensualidad', 'Mensualidad'

    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name='transacciones_stripe',
    )
    pagador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transacciones_pagadas',
    )
    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transacciones_recibidas',
    )
    tipo_operacion = models.CharField(
        max_length=20,
        choices=TipoOperacion.choices,
        default=TipoOperacion.MENSUALIDAD,
    )
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    moneda = models.CharField(max_length=10, default='usd')
    descripcion = models.TextField(blank=True)
    stripe_session_id = models.CharField(max_length=255, unique=True, db_index=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True)
    estado = models.CharField(
        max_length=20,
        choices=EstadoTransaccion.choices,
        default=EstadoTransaccion.PENDIENTE,
    )
    comprobante_url = models.URLField(blank=True, help_text='URL del recibo de Stripe')
    chat = models.ForeignKey(
        'usuarios.Chat',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transacciones',
    )
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagos_transaccion_stripe'
        verbose_name = 'Transacción Stripe'
        verbose_name_plural = 'Transacciones Stripe'
        ordering = ['-creado']

    def __str__(self):
        return f'Tx #{self.id} — {self.monto} {self.moneda.upper()} ({self.estado})'


class ConfiguracionSistema(models.Model):
    """Configuración global del sistema. Implementa el patrón Singleton."""
    porcentaje_comision_plataforma = models.DecimalField(
        max_digits=5, decimal_places=2, default=5.00,
        help_text='Porcentaje de comisión por transacción (ej. 5.00 para 5%)'
    )
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pagos_configuracion_sistema'
        verbose_name = 'Configuración del Sistema'
        verbose_name_plural = 'Configuraciones del Sistema'

    def save(self, *args, **kwargs):
        """Asegura que solo exista un registro de configuración."""
        if self.__class__.objects.count() > 0 and not self.pk:
            # Si ya existe un registro y se está intentando crear otro, se cancela
            return None
        super().save(*args, **kwargs)

    @classmethod
    def get_config(cls):
        """Devuelve la instancia única o la crea si no existe."""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Configuración Global del Sistema'
