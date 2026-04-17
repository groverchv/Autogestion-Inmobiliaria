from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class TipoInmueble(models.Model):
    """Categorías de inmuebles: casa, departamento, terreno, oficina, etc."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = 'inmuebles_tipo_inmueble'
        verbose_name = 'Tipo de Inmueble'
        verbose_name_plural = 'Tipos de Inmueble'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Direccion(models.Model):
    """Normalización de datos de ubicación geográfica."""
    ciudad = models.CharField(max_length=100)
    zona = models.CharField(max_length=100, blank=True)
    calle = models.CharField(max_length=200, blank=True)
    referencia = models.TextField(blank=True)

    class Meta:
        db_table = 'inmuebles_direccion'
        verbose_name = 'Dirección'
        verbose_name_plural = 'Direcciones'

    def __str__(self):
        return f'{self.ciudad}, {self.zona} - {self.calle}'


class Inmueble(models.Model):
    """Propiedad inmobiliaria."""

    class EstadoInmueble(models.TextChoices):
        DISPONIBLE = 'disponible', 'Disponible'
        OCUPADO = 'ocupado', 'Ocupado'
        EN_MANTENIMIENTO = 'mantenimiento', 'En Mantenimiento'
        RESERVADO = 'reservado', 'Reservado'
        OCULTO = 'oculto', 'Oculto'

    propietario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='inmuebles',
    )
    tipo = models.ForeignKey(
        TipoInmueble,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inmuebles',
    )
    direccion = models.OneToOneField(
        'Direccion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='inmueble'
    )
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    precio = models.DecimalField(
        max_digits=12, decimal_places=2, db_index=True,
        validators=[MinValueValidator(0)]
    )
    largo = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    ancho = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    superficie = models.DecimalField(
        max_digits=10, decimal_places=2,
        help_text='Superficie en metros cuadrados',
        null=True, blank=True,
        db_index=True
    )
    habitaciones = models.PositiveIntegerField(default=0, db_index=True)
    banos = models.PositiveIntegerField(default=0, db_index=True)
    garaje = models.BooleanField(default=False)
    estado = models.CharField(
        max_length=20,
        choices=EstadoInmueble.choices,
        default=EstadoInmueble.DISPONIBLE,
        db_index=True
    )
    # Coordenadas GPS
    gps = models.CharField(max_length=100, null=True, blank=True, help_text="Coordenadas GPS (ej. -17.7898, -63.1939)")
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'inmuebles_inmueble'
        verbose_name = 'Inmueble'
        verbose_name_plural = 'Inmuebles'
        ordering = ['-creado']

    def save(self, *args, **kwargs):
        if self.largo is not None and self.ancho is not None:
            self.superficie = self.largo * self.ancho
        super().save(*args, **kwargs)

    def __str__(self):
        ciudad_str = self.direccion.ciudad if self.direccion else 'Sin ciudad'
        return f'{self.titulo} — {ciudad_str}'


class Multimedia(models.Model):
    """Imágenes y videos de un inmueble."""

    class TipoArchivo(models.TextChoices):
        IMAGEN = 'imagen', 'Imagen'
        VIDEO = 'video', 'Video'

    inmueble = models.ForeignKey(
        Inmueble,
        on_delete=models.CASCADE,
        related_name='multimedia',
    )
    tipo = models.CharField(
        max_length=10,
        choices=TipoArchivo.choices,
        default=TipoArchivo.IMAGEN,
    )
    archivo = models.CharField(max_length=500, help_text='URL de Cloudinary o ruta')
    descripcion = models.CharField(max_length=200, blank=True)
    principal = models.BooleanField(default=False)
    subido = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inmuebles_multimedia'
        verbose_name = 'Multimedia'
        verbose_name_plural = 'Multimedia'
        ordering = ['-principal', '-subido']

    def __str__(self):
        return f'{self.tipo} — {self.inmueble.titulo}'


class TipoContrato(models.Model):
    """Tipos de contrato: alquiler, venta, anticrético, etc."""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = 'inmuebles_tipo_contrato'
        verbose_name = 'Tipo de Contrato'
        verbose_name_plural = 'Tipos de Contrato'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre


class Contrato(models.Model):
    """Contrato que vincula un inmueble con un inquilino/comprador."""

    class EstadoContrato(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        FINALIZADO = 'finalizado', 'Finalizado'
        CANCELADO = 'cancelado', 'Cancelado'
        PENDIENTE = 'pendiente', 'Pendiente'

    inmueble = models.ForeignKey(
        Inmueble,
        on_delete=models.CASCADE,
        related_name='contratos',
    )
    tipo_contrato = models.ForeignKey(
        TipoContrato,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contratos',
    )
    inquilino = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contratos_inquilino',
    )
    inicio = models.DateField()
    fin = models.DateField(null=True, blank=True)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    deposito = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estado = models.CharField(
        max_length=20,
        choices=EstadoContrato.choices,
        default=EstadoContrato.PENDIENTE,
    )
    observaciones = models.TextField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inmuebles_contrato'
        verbose_name = 'Contrato'
        verbose_name_plural = 'Contratos'
        ordering = ['-creado']

    def __str__(self):
        return f'Contrato {self.id} — {self.inmueble.titulo}'


class Comision(models.Model):
    """Comisiones generadas por contratos."""
    contrato = models.ForeignKey(
        Contrato,
        on_delete=models.CASCADE,
        related_name='comisiones',
    )
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2)
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateField(auto_now_add=True)
    pagada = models.BooleanField(default=False)
    descripcion = models.TextField(blank=True)

    class Meta:
        db_table = 'inmuebles_comision'
        verbose_name = 'Comisión'
        verbose_name_plural = 'Comisiones'
        ordering = ['-fecha']

    def __str__(self):
        return f'Comisión {self.porcentaje}% — Contrato {self.contrato.id}'


class Favorito(models.Model):
    """Inmuebles marcados como favoritos por los usuarios."""
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoritos',
    )
    inmueble = models.ForeignKey(
        Inmueble,
        on_delete=models.CASCADE,
        related_name='favoritos_por_usuarios',
    )
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'inmuebles_favorito'
        verbose_name = 'Favorito'
        verbose_name_plural = 'Favoritos'
        unique_together = ('usuario', 'inmueble')
        ordering = ['-creado']

    def __str__(self):
        return f'{self.usuario.username} — {self.inmueble.titulo}'
