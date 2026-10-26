# pyrefly: ignore [missing-import]
from rest_framework import viewsets, permissions, status, filters
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
from rest_framework.response import Response
import os
from decimal import Decimal
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from django.core.exceptions import ValidationError
from .models import (
    TipoInmueble, Inmueble, Publicacion, Multimedia, TipoContrato,
    Contrato, Comision, Favorito, Cita, HorarioDisponible, Hotspot,
    VerificacionTitulo, AccesoRecorrido360,
)
from .serializers import (
    TipoInmuebleSerializer,
    InmuebleSerializer,
    InmuebleListSerializer,
    PublicacionSerializer,
    MultimediaSerializer,
    TipoContratoSerializer,
    ContratoSerializer,
    ComisionSerializer,
    FavoritoSerializer,
    CitaSerializer,
    HorarioDisponibleSerializer,
    HotspotSerializer,
    VerificacionTituloSerializer,
    AccesoRecorrido360Serializer,
)
from django.db import models as dj_models
from .services import (
    get_tipo_contrato_by_id,
    create_tipo_contrato,
    update_tipo_contrato,
    delete_tipo_contrato,
    generate_contract_pdf
)
from .selectors import (
    get_all_tipos_contrato,
    get_tipos_contrato_for_select,
    get_contrato_pdf_data,
    get_contratos_for_user
)
from django_filters.rest_framework import DjangoFilterBackend
import django_filters


class UnaccentSearchFilter(filters.SearchFilter):
    def construct_search(self, field_name, queryset=None):
        lookup = self.lookup_prefixes.get(field_name[0])
        if lookup:
            field_name = field_name[1:]
        else:
            lookup = 'unaccent__icontains'
        return "__".join([field_name, lookup])

    def get_search_terms(self, request):
        terms = super().get_search_terms(request)
        # Omitir conectores/preposiciones muy comunes en español para búsquedas naturales tipo "casa en alquiler" o "departamento con garaje"
        conectores = {'en', 'de', 'y', 'la', 'el', 'un', 'una', 'con', 'para', 'del', 'los', 'las', 'a', 'al'}
        return [t for t in terms if t.lower() not in conectores]


class InmuebleFilter(django_filters.FilterSet):
    precio_min = django_filters.NumberFilter(method='filter_precio_min')
    precio_max = django_filters.NumberFilter(method='filter_precio_max')
    tipo_oferta = django_filters.CharFilter(method='filter_tipo_oferta')
    superficie_min = django_filters.NumberFilter(field_name="superficie", lookup_expr='gte')
    superficie_max = django_filters.NumberFilter(field_name="superficie", lookup_expr='lte')
    ciudad = django_filters.CharFilter(field_name="direccion__ciudad", lookup_expr='icontains')
    zona = django_filters.CharFilter(field_name="direccion__zona", lookup_expr='icontains')
    habitaciones_min = django_filters.NumberFilter(field_name="habitaciones", lookup_expr='gte')
    banos_min = django_filters.NumberFilter(field_name="banos", lookup_expr='gte')
    garaje = django_filters.BooleanFilter(field_name="garaje")

    class Meta:
        model = Inmueble
        fields = ['estado', 'tipo', 'habitaciones', 'banos']

    # Filtros avanzados con relacion cruzada usando distinct() para evitar duplicados en la consulta
    def filter_precio_min(self, queryset, name, value):
        return queryset.filter(publicaciones__precio__gte=value, publicaciones__estado='activa').distinct()

    def filter_precio_max(self, queryset, name, value):
        return queryset.filter(publicaciones__precio__lte=value, publicaciones__estado='activa').distinct()

    def filter_tipo_oferta(self, queryset, name, value):
        return queryset.filter(publicaciones__tipo_oferta=value, publicaciones__estado='activa').distinct()

class TipoInmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de inmueble."""
    queryset = TipoInmueble.objects.all()
    serializer_class = TipoInmuebleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]


class InmuebleViewSet(viewsets.ModelViewSet):
    """CRUD para inmuebles."""
    queryset = Inmueble.objects.select_related('tipo', 'propietario', 'direccion', 'verificacion_titulo').prefetch_related('multimedia', 'publicaciones').all()
    filter_backends = [DjangoFilterBackend, UnaccentSearchFilter]
    filterset_class = InmuebleFilter
    search_fields = [
        'titulo',
        'descripcion',
        'direccion__ciudad',
        'direccion__zona',
        'direccion__calle',
        'direccion__referencia',
        'tipo__nombre',
        'publicaciones__tipo_oferta'
    ]

    def get_permissions(self):
        # Permitir ver inmuebles de forma pública
        if self.action in ['list', 'retrieve', 'ciudades']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Inmueble.objects.select_related('tipo', 'propietario', 'direccion', 'verificacion_titulo').prefetch_related('multimedia', 'publicaciones')
        
        if self.request.path.startswith('/api/inmuebles/panel/'):
            if user.is_authenticated:
                if self.request.query_params.get('personal') == 'true':
                    return qs.filter(propietario=user)
                if user.is_staff or user.rol == 'admin':
                    return qs.all()
                return qs.filter(propietario=user)
            return qs.none()
            
        # Si es staff o propietario editando un inmueble específico
        if user.is_authenticated and self.action in ['update', 'partial_update', 'destroy']:
            return qs.filter(propietario=user) if not (user.is_staff or user.rol == 'admin') else qs.all()

        # Para catálogo público y detalle público general, no mostrar ocultos
        return qs.exclude(estado='oculto')

    def get_serializer_class(self):
        if self.action in ['list', 'mis_inmuebles']:
            return InmuebleListSerializer
        return InmuebleSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        user = self.request.user
        if user.is_authenticated:
            ctx['favoritos_ids'] = set(
                Favorito.objects.filter(usuario=user).values_list('inmueble_id', flat=True)
            )
        return ctx

    @action(detail=False, methods=['get'], url_path='mis_inmuebles', permission_classes=[permissions.IsAuthenticated])
    def mis_inmuebles(self, request):
        """Retorna los inmuebles pertenecientes al usuario autenticado."""
        qs = Inmueble.objects.filter(propietario=request.user).select_related('tipo', 'propietario', 'direccion', 'verificacion_titulo').prefetch_related('multimedia', 'publicaciones')
        serializer = InmuebleListSerializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    @action(detail=False, methods=['get'])
    def ciudades(self, request):
        """Retorna una lista de ciudades únicas disponibles."""
        ciudades_unicas = cache.get('ciudades')
        if ciudades_unicas is None:
            ciudades_qs = Inmueble.objects.exclude(direccion__isnull=True).values_list('direccion__ciudad', flat=True).distinct()
            # Filtrar valores vacíos o nulos
            ciudades = [c.strip() for c in ciudades_qs if c and c.strip()]
            # Eliminar duplicados generados por mayúsculas/minúsculas o espacios extra
            ciudades_unicas = sorted(list(set(c.title() for c in ciudades)))
            cache.set('ciudades', ciudades_unicas, 3600)
        return Response(ciudades_unicas)


class MultimediaViewSet(viewsets.ModelViewSet):
    """CRUD para multimedia de inmuebles."""
    queryset = Multimedia.objects.all()
    serializer_class = MultimediaSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        import cloudinary
        import cloudinary.uploader
        from django.conf import settings

        # Explicit configuration
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
            api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
            api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
        )
        
        file_obj = request.FILES.get('archivo')
        inmueble_id = request.data.get('inmueble')
        es_principal = request.data.get('principal') == 'true' or request.data.get('es_principal') == 'true'
        tipo = request.data.get('tipo', 'imagen')

        if not file_obj or not inmueble_id:
            return Response({'error': 'Archivo e inmueble requeridos'}, status=400)

        # Subir el archivo a Cloudinary
        upload_data = cloudinary.uploader.upload(
            file_obj, 
            resource_type='auto' if tipo == 'video' else 'image'
        )
        url = upload_data.get('secure_url')

        descripcion = request.data.get('descripcion', '')

        # Crear el registro en base de datos con la URL absoluta
        media = Multimedia.objects.create(
            inmueble_id=inmueble_id,
            tipo=tipo,
            principal=es_principal,
            archivo=url,
            descripcion=descripcion
        )
        
        serializer = self.get_serializer(media)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class HotspotViewSet(viewsets.ModelViewSet):
    """CRUD para puntos de transición (hotspots) entre panoramas."""
    queryset = Hotspot.objects.select_related('inmueble', 'escena_origen', 'escena_destino').all()
    serializer_class = HotspotSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_permissions(self):
        # Permitir leer de forma pública
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        # Permitir filtrar por inmueble en consultas públicas
        inmueble_id = self.request.query_params.get('inmueble')
        if inmueble_id:
            return Hotspot.objects.filter(inmueble_id=inmueble_id)
        return Hotspot.objects.all()

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        inmueble = serializer.validated_data['inmueble']
        if inmueble.propietario != self.request.user and not self.request.user.is_staff:
            raise DRFValidationError("No tienes autorización para editar el recorrido de este inmueble.")
        serializer.save()

    def perform_update(self, serializer):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        inmueble = serializer.instance.inmueble
        if inmueble.propietario != self.request.user and not self.request.user.is_staff:
            raise DRFValidationError("No tienes autorización para editar el recorrido de este inmueble.")
        serializer.save()

    def perform_destroy(self, instance):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        if instance.inmueble.propietario != self.request.user and not self.request.user.is_staff:
            raise DRFValidationError("No tienes autorización para eliminar este punto de transición.")
        instance.delete()


class TipoContratoViewSet(viewsets.ModelViewSet):
    """CRUD para tipos de contrato siguiendo arquitectura de 4 capas."""
    serializer_class = TipoContratoSerializer

    def get_queryset(self):
        return get_all_tipos_contrato()

    def perform_create(self, serializer):
        # La vista valida (vía serializer) y el servicio escribe
        create_tipo_contrato(**serializer.validated_data)

    def perform_update(self, serializer):
        # La vista valida y el servicio escribe
        update_tipo_contrato(serializer.instance, **serializer.validated_data)

    def destroy(self, request, *args, **kwargs):
        """Usa el servicio para validar integridad referencial antes de borrar."""
        try:
            delete_tipo_contrato(kwargs.get('pk'))
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': 'Error al eliminar el tipo contrato'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContratoViewSet(viewsets.ModelViewSet):
    """CRUD para contratos con flujo de revisión siguiendo arquitectura de 4 capas."""
    serializer_class = ContratoSerializer

    def get_queryset(self):
        return get_contratos_for_user(self.request.user)


    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'], url_path='enviar')
    def enviar(self, request, pk=None):
        """Propietario envía el contrato al cliente vía chat."""
        contrato = self.get_object()
        if contrato.inmueble.propietario != request.user:
            return Response({'error': 'Solo el propietario puede enviar contratos'}, status=403)

        contrato.estado = 'enviado'
        contrato.save()

        # Enviar mensaje en el chat
        if contrato.chat:
            from usuarios.models import Mensaje
            Mensaje.objects.create(
                chat=contrato.chat,
                remitente=request.user,
                tipo='texto',
                contenido=(
                    f'📋 CONTRATO ENVIADO\n'
                    f'Propiedad: {contrato.inmueble.titulo}\n'
                    f'Tipo: {contrato.tipo_contrato.nombre if contrato.tipo_contrato else "N/A"}\n'
                    f'Monto: ${contrato.monto} {contrato.moneda}\n'
                    f'Período: {contrato.inicio} → {contrato.fin or "Indefinido"}\n'
                    f'───────────────\n'
                    f'CONTRATO_REVIEW:{contrato.id}:END'
                ),
            )
            contrato.chat.save()

            # Notificar al inquilino
            from usuarios.services import crear_notificacion_sistema
            from usuarios.models import Notificacion
            crear_notificacion_sistema(
                usuario=contrato.inquilino,
                titulo='Nuevo contrato para revisar',
                mensaje=f'{request.user.get_full_name()} te ha enviado un contrato para "{contrato.inmueble.titulo}". Revísalo en el chat.',
                tipo=Notificacion.TipoNotificacion.INFO,
            )

        return Response(ContratoSerializer(contrato).data)

    @action(detail=True, methods=['post'], url_path='aceptar')
    def aceptar(self, request, pk=None):
        """Cliente acepta el contrato."""
        contrato = self.get_object()
        if contrato.inquilino != request.user:
            return Response({'error': 'Solo el cliente puede aceptar'}, status=403)
        if contrato.estado not in ['enviado', 'rechazado']:
            return Response({'error': 'El contrato no está en estado de revisión'}, status=400)

        contrato.estado = 'aceptado'
        contrato.motivo_rechazo = ''
        contrato.save()

        if contrato.chat:
            from usuarios.models import Mensaje
            Mensaje.objects.create(
                chat=contrato.chat,
                remitente=request.user,
                tipo='texto',
                contenido=(
                    f'CONTRATO ACEPTADO\n'
                    f'He aceptado el contrato #{contrato.id} para "{contrato.inmueble.titulo}".\n'
                    f'Pendiente de enlace de pago.'
                ),
            )
            contrato.chat.save()

            from usuarios.services import crear_notificacion_sistema
            from usuarios.models import Notificacion
            crear_notificacion_sistema(
                usuario=contrato.inmueble.propietario,
                titulo='Contrato aceptado',
                mensaje=f'{request.user.get_full_name()} ha aceptado el contrato para "{contrato.inmueble.titulo}".',
                tipo=Notificacion.TipoNotificacion.CONFIRMACION,
            )

        return Response(ContratoSerializer(contrato).data)

    @action(detail=True, methods=['post'], url_path='rechazar')
    def rechazar(self, request, pk=None):
        """Cliente rechaza el contrato con motivo."""
        contrato = self.get_object()
        if contrato.inquilino != request.user:
            return Response({'error': 'Solo el cliente puede rechazar'}, status=403)
        if contrato.estado not in ['enviado']:
            return Response({'error': 'El contrato no está en estado de revisión'}, status=400)

        motivo = request.data.get('motivo', '').strip()
        contrato.estado = 'rechazado'
        contrato.motivo_rechazo = motivo
        contrato.save()

        if contrato.chat:
            from usuarios.models import Mensaje
            Mensaje.objects.create(
                chat=contrato.chat,
                remitente=request.user,
                tipo='texto',
                contenido=(
                    f'CONTRATO RECHAZADO\n'
                    f'He rechazado el contrato #{contrato.id} para "{contrato.inmueble.titulo}".\n'
                    f'{("Motivo: " + motivo) if motivo else "Sin motivo especificado."}\n'
                    f'Podemos negociar nuevas condiciones.'
                ),
            )
            contrato.chat.save()

            from usuarios.services import crear_notificacion_sistema
            from usuarios.models import Notificacion
            crear_notificacion_sistema(
                usuario=contrato.inmueble.propietario,
                titulo='Contrato rechazado',
                mensaje=f'{request.user.get_full_name()} ha rechazado el contrato para "{contrato.inmueble.titulo}". Motivo: {motivo or "No especificado"}',
                tipo=Notificacion.TipoNotificacion.ALERTA,
            )

        return Response(ContratoSerializer(contrato).data)

    @action(detail=True, methods=['get'], url_path='pdf')
    def download_pdf(self, request, pk=None):
        """Generate and download PDF for a contract."""
        try:
            contrato = self.get_object()
            pdf_content = generate_contract_pdf(contrato.id)
            if pdf_content:
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="contrato_{contrato.id}.pdf"'
                return response
            else:
                return Response({'error': 'No se pudo generar el PDF'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='generar-ia')
    def generar_contrato_ia(self, request, pk=None):
        """Generate a contract text with AI and download it as PDF.
        
        Accepts optional POST body:
        - instrucciones: str - Natural language instructions from the user
          (e.g. typed text or transcribed audio describing antecedentes,
           clausulas especiales, etc.)
        """
        try:
            from .services import generar_contrato_pdf_con_ia
            
            contrato = self.get_object()
            instrucciones_usuario = request.data.get('instrucciones', '').strip()
            
            # La lógica pesada está en la capa de servicios
            pdf_content = generar_contrato_pdf_con_ia(
                contrato.id, request.user, instrucciones_usuario
            )
            if pdf_content:
                response = HttpResponse(pdf_content, content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Contrato_IA_{contrato.id}.pdf"'
                return response
            else:
                return Response({'error': 'No se pudo generar el PDF con IA'}, status=400)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='editar-con-ia')
    def editar_con_ia(self, request, pk=None):
        """Edita un contrato existente usando la IA para enriquecer las cláusulas
        a partir del historial de chat.

        POST body:
          - tipo_contrato_id (int), monto (str), moneda (str)
          - inicio (YYYY-MM-DD), fin (YYYY-MM-DD, opcional)
          - deposito (str), dia_pago (int)
          - historial_chat: [{role: 'user'|'assistant', content: str}]
        """
        from .services import editar_contrato_con_ia

        contrato = self.get_object()
        if contrato.inmueble.propietario != request.user:
            return Response({'error': 'Solo el propietario del inmueble puede editar contratos.'}, status=403)

        if contrato.estado in ['aceptado', 'activo', 'finalizado', 'cancelado']:
            return Response({'error': f'No se puede editar un contrato en estado {contrato.estado}.'}, status=400)

        try:
            contrato_actualizado = editar_contrato_con_ia(
                contrato=contrato,
                propietario=request.user,
                datos=request.data,
                historial_chat=request.data.get('historial_chat', [])
            )
            return Response(ContratoSerializer(contrato_actualizado).data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'], url_path='chat-ia')
    def chat_asistente_ia(self, request, pk=None):
        """Chat con el asistente IA de contratos (abogado virtual).

        Accepts POST body:
        - mensajes: list of {role: 'user'|'assistant', content: str}
          The full conversation history including the latest user message.

        Returns:
        - { respuesta: str } — The AI assistant's reply
        """
        try:
            from .services import chat_asistente_contrato

            contrato = self.get_object()
            mensajes = request.data.get('mensajes', [])

            if not mensajes:
                return Response({'error': 'Se requiere al menos un mensaje.'}, status=400)

            # Validar estructura básica
            for msg in mensajes:
                if 'role' not in msg or 'content' not in msg:
                    return Response({'error': 'Formato de mensaje inválido. Se requiere {role, content}.'}, status=400)
                if msg['role'] not in ('user', 'assistant'):
                    return Response({'error': f"Rol inválido: {msg['role']}"}, status=400)

            respuesta = chat_asistente_contrato(contrato.id, request.user, mensajes)
            return Response({'respuesta': respuesta})

        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='crear-con-ia')
    def crear_con_ia(self, request):
        """Crea un contrato con ayuda de la IA y lo envía al cliente directamente.

        El propietario chatea con el Asistente Legal IA para definir condiciones,
        luego envía el historial + datos básicos. La IA extrae las cláusulas de
        la conversación y crea el contrato ya en estado 'enviado'.

        POST body:
          - inmueble_id (int), inquilino_id (int), chat_id (int)
          - tipo_contrato_id (int), monto (str), moneda (str)
          - inicio (YYYY-MM-DD), fin (YYYY-MM-DD, opcional)
          - deposito (str), dia_pago (int)
          - historial_chat: [{role: 'user'|'assistant', content: str}]
        """
        from .services import crear_contrato_con_ia

        campos_req = ['inmueble_id', 'inquilino_id', 'tipo_contrato_id', 'monto', 'inicio']
        for campo in campos_req:
            if not request.data.get(campo):
                return Response({'error': f'El campo "{campo}" es obligatorio.'}, status=400)

        # Solo el propietario del inmueble puede crear contratos
        try:
            from .models import Inmueble
            inmueble = Inmueble.objects.get(id=request.data['inmueble_id'])
            if inmueble.propietario != request.user:
                return Response({'error': 'Solo el propietario del inmueble puede crear contratos.'}, status=403)
        except Inmueble.DoesNotExist:
            return Response({'error': 'Inmueble no encontrado.'}, status=404)

        try:
            contrato = crear_contrato_con_ia(
                propietario=request.user,
                datos=request.data,
                historial_chat=request.data.get('historial_chat', [])
            )
            return Response(ContratoSerializer(contrato).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=False, methods=['post'], url_path='chat-creador-ia')
    def chat_creador_ia(self, request):
        """Chat con el Abogado IA para CREAR un contrato (sin contrato existente).

        Permite al propietario consultar condiciones, cláusulas y restricciones
        antes de crear el contrato. No necesita un contrato_id existente.

        POST body:
          - mensajes: [{role, content}] — historial de la conversación
          - contexto: {inmueble_titulo, tipo_contrato, monto, moneda, inicio, fin}
        """
        try:
            import requests as http_requests
            from django.conf import settings

            mensajes = request.data.get('mensajes', [])
            contexto = request.data.get('contexto', {})

            if not mensajes:
                return Response({'error': 'Se requieren mensajes.'}, status=400)

            api_key = settings.GROQ_API_KEY
            if not api_key:
                return Response({'error': 'API Key de Groq no configurada.'}, status=500)

            system_prompt = f"""Eres un abogado especialista en derecho inmobiliario boliviano con 20 años de experiencia.
Estás ayudando a un PROPIETARIO a crear o editar un contrato para su inmueble.

CONTEXTO DEL CONTRATO:
- Inmueble: {contexto.get('inmueble_titulo', 'No especificado')}
- Tipo de contrato: {contexto.get('tipo_contrato', 'No definido aún')}
- Monto base: {contexto.get('monto', 'No definido')} {contexto.get('moneda', 'BOB')}
- Vigencia: desde {contexto.get('inicio', 'No definido')} hasta {contexto.get('fin', 'Indefinido')}
- Depósito de Garantía: {contexto.get('deposito', '0')} {contexto.get('moneda', 'BOB')}
- Día de pago mensual: {contexto.get('dia_pago', '5')}
"""
            if contexto.get('clausulas'):
                system_prompt += f"\n- Cláusulas del Contrato Existente:\n{contexto.get('clausulas')}"
            if contexto.get('condiciones_uso'):
                system_prompt += f"\n- Condiciones de uso existentes:\n{contexto.get('condiciones_uso')}"
            if contexto.get('penalidades'):
                system_prompt += f"\n- Penalidades existentes:\n{contexto.get('penalidades')}"
            if contexto.get('restricciones'):
                system_prompt += f"\n- Restricciones existentes:\n{contexto.get('restricciones')}"
            if contexto.get('incluye_servicios'):
                system_prompt += f"\n- Servicios incluidos existentes:\n{contexto.get('incluye_servicios')}"

            system_prompt += """

TU ROL Y MEMORIA:
- Eres el Abogado del PROPIETARIO: oriéntalo para proteger sus intereses.
- Analiza y recuerda con precisión toda la conversación. Si el propietario te dice un dato (ej. "quiero 2 meses de garantía" o "el día de pago será el 5"), reconócelo, confírmalo y detállalo.
- Informa activamente que el sistema extraerá automáticamente estos datos del chat para rellenar los campos del contrato final.
- Sugiere cláusulas concretas, restricciones y penalidades apropiadas.
- Ayúdalo a definir condiciones de uso, servicios incluidos y el monto de garantía (ej. recomendar 1 o 2 meses de alquiler como depósito de garantía estándar).
- Cuando el usuario te pida redactar una cláusula, hazlo en formato legal formal boliviano.
- Responde de forma concisa (máximo 250 palabras), directa y estructurada.
- No inventar datos, basarte en lo que el propietario te dice."""

            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(mensajes)

            payload = {
                "model": "llama-3.3-70b-versatile",
                "messages": messages,
                "temperature": 0.6,
                "max_tokens": 800,
            }
            headers_req = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            resp = http_requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload, headers=headers_req, timeout=30
            )
            resp.raise_for_status()
            respuesta = resp.json()['choices'][0]['message']['content']
            return Response({'respuesta': respuesta})

        except Exception as e:
            return Response({'error': str(e)}, status=500)


class ComisionViewSet(viewsets.ModelViewSet):
    """CRUD para comisiones."""
    queryset = Comision.objects.select_related('contrato').all()
    serializer_class = ComisionSerializer


class FavoritoViewSet(viewsets.ModelViewSet):
    """CRUD para favoritos del usuario."""
    serializer_class = FavoritoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorito.objects.filter(usuario=self.request.user)

    def perform_create(self, serializer):
        # Si ya existe, no lo duplica por el constraint unique_together
        serializer.save(usuario=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        inmueble_id = request.data.get('inmueble')
        if not inmueble_id:
            return Response({'error': 'Falta el ID del inmueble'}, status=400)
        
        fav, created = Favorito.objects.get_or_create(
            usuario=request.user, inmueble_id=inmueble_id
        )
        if not created:
            fav.delete()
            return Response({'is_favorito': False, 'status': 'Quitado de favoritos'})
        
        return Response({'is_favorito': True, 'status': 'Agregado a favoritos'})

# ─────────────────────────────────────────────────────────────────────────────
#  CITAS Y HORARIOS
# ─────────────────────────────────────────────────────────────────────────────
from datetime import datetime, timedelta, date as date_type


class HorarioDisponibleViewSet(viewsets.ModelViewSet):
    """CRUD de horarios de disponibilidad del propietario."""
    serializer_class   = HorarioDisponibleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user          = self.request.user
        inmueble_id   = self.request.query_params.get('inmueble')
        propietario_id = self.request.query_params.get('propietario')

        # Consulta pública: slots para un propietario+inmueble concreto
        if propietario_id:
            qs = HorarioDisponible.objects.filter(
                propietario_id=propietario_id, activo=True,
            )
            if inmueble_id:
                qs = qs.filter(
                    dj_models.Q(inmueble_id=inmueble_id) |
                    dj_models.Q(inmueble__isnull=True)
                )
            return qs

        if (user.is_staff or user.rol == 'admin') and self.request.query_params.get('personal') != 'true':
            return HorarioDisponible.objects.all()
        return HorarioDisponible.objects.filter(propietario=user)

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    @action(detail=False, methods=['get'], url_path='slots-disponibles',
            permission_classes=[permissions.AllowAny])
    def slots_disponibles(self, request):
        """
        Devuelve los slots de 1 hora disponibles para una fecha+inmueble.
        Query params: inmueble_id, fecha (YYYY-MM-DD), propietario_id
        """
        inmueble_id    = request.query_params.get('inmueble_id')
        fecha_str      = request.query_params.get('fecha')
        propietario_id = request.query_params.get('propietario_id')

        if not all([inmueble_id, fecha_str, propietario_id]):
            return Response(
                {'error': 'Se requieren inmueble_id, fecha y propietario_id'},
                status=400,
            )

        try:
            fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}, status=400)

        if fecha < date_type.today():
            return Response(
                {'error': 'No se pueden agendar citas en fechas pasadas'}, status=400
            )

        dia_semana = fecha.weekday()  # 0=Lunes … 6=Domingo

        horarios = HorarioDisponible.objects.filter(
            propietario_id=propietario_id,
            dia_semana=dia_semana,
            activo=True,
        ).filter(
            dj_models.Q(inmueble_id=inmueble_id) |
            dj_models.Q(inmueble__isnull=True)
        )

        if not horarios.exists():
            return Response({
                'slots': [],
                'mensaje': 'El propietario no tiene horarios disponibles para ese día.',
            })

        # Generar slots de 1 hora dentro de cada franja
        slots_posibles = []
        for h in horarios:
            current = datetime.combine(fecha, h.hora_inicio)
            fin     = datetime.combine(fecha, h.hora_fin)
            while current + timedelta(hours=1) <= fin:
                slots_posibles.append({
                    'hora_inicio': current.strftime('%H:%M'),
                    'hora_fin':   (current + timedelta(hours=1)).strftime('%H:%M'),
                })
                current += timedelta(hours=1)

        # Marcar slots ocupados
        citas_ocupadas = Cita.objects.filter(
            inmueble_id=inmueble_id,
            fecha=fecha,
            estado__in=['pendiente', 'confirmada'],
        ).values_list('hora_inicio', flat=True)

        horas_ocupadas = {c.strftime('%H:%M') for c in citas_ocupadas}

        for slot in slots_posibles:
            slot['disponible'] = slot['hora_inicio'] not in horas_ocupadas

        return Response({'slots': slots_posibles, 'fecha': fecha_str})


class CitaViewSet(viewsets.ModelViewSet):
    """CRUD de citas de visita."""
    serializer_class   = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if (user.is_staff or user.rol == 'admin') and self.request.query_params.get('personal') != 'true':
            return Cita.objects.select_related(
                'inmueble', 'cliente', 'propietario'
            ).all()
        return Cita.objects.filter(
            dj_models.Q(cliente=user) | dj_models.Q(propietario=user)
        ).select_related('inmueble', 'cliente', 'propietario')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from usuarios.services import crear_notificacion_sistema
        from usuarios.models import Notificacion
        from datetime import time as dt_time, datetime as dt_datetime, timedelta as dt_timedelta

        inmueble    = serializer.validated_data['inmueble']
        hora_inicio = serializer.validated_data.get('hora_inicio') or serializer.validated_data.get('hora')
        if not hora_inicio:
            hora_inicio = dt_time(10, 0)
        
        hora_fin = (
            dt_datetime.combine(dt_datetime.today(), hora_inicio) + dt_timedelta(hours=1)
        ).time()

        # Un cliente solo puede tener UNA cita activa por inmueble
        if Cita.objects.filter(
            inmueble=inmueble,
            cliente=self.request.user,
            estado__in=['pendiente', 'confirmada'],
        ).exists():
            raise DRFValidationError(
                {'detail': 'Ya tienes una cita activa para este inmueble.'}
            )

        prop = inmueble.propietario or self.request.user
        serializer.save(
            cliente=self.request.user,
            propietario=prop,
            hora_fin=hora_fin,
        )

        # Notificar al propietario si existe
        if inmueble.propietario:
            try:
                crear_notificacion_sistema(
                    usuario=inmueble.propietario,
                    titulo='Nueva cita agendada',
                    mensaje=(
                        f'{self.request.user.get_full_name() or self.request.user.email} '
                        f'agendó una visita para el {serializer.validated_data["fecha"]} '
                        f'a las {hora_inicio.strftime("%H:%M")} en "{inmueble.titulo}".'
                    ),
                    tipo=Notificacion.TipoNotificacion.INFO,
                )
            except Exception:
                pass

    @action(detail=True, methods=['patch'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        """Propietario confirma/completa; cualquier parte puede cancelar."""
        cita          = self.get_object()
        nuevo_estado  = request.data.get('estado')
        estados_validos = ['confirmada', 'cancelada', 'completada']

        if nuevo_estado not in estados_validos:
            return Response(
                {'error': f'Estado inválido. Use: {", ".join(estados_validos)}'},
                status=400,
            )

        es_propietario = cita.propietario == request.user
        es_cliente     = cita.cliente == request.user
        es_admin       = request.user.is_staff or request.user.rol == 'admin'

        # Solo el propietario (o admin) puede confirmar/completar
        if nuevo_estado in ['confirmada', 'completada'] and not (es_propietario or es_admin):
            return Response({'error': 'Solo el propietario puede realizar esta acción.'}, status=403)

        # Cualquiera de los dos puede cancelar
        if nuevo_estado == 'cancelada' and not (es_propietario or es_cliente or es_admin):
            return Response({'error': 'No autorizado.'}, status=403)

        cita.estado = nuevo_estado
        cita.save()

        # Notificar a la otra parte
        from usuarios.services import crear_notificacion_sistema
        from usuarios.models import Notificacion

        hora_fmt = cita.hora_inicio.strftime('%H:%M')
        textos   = {
            'confirmada': f'Tu cita del {cita.fecha} a las {hora_fmt} en "{cita.inmueble.titulo}" fue confirmada.',
            'cancelada':  f'Tu cita del {cita.fecha} a las {hora_fmt} en "{cita.inmueble.titulo}" fue cancelada.',
            'completada': f'Tu cita del {cita.fecha} a las {hora_fmt} en "{cita.inmueble.titulo}" fue marcada como completada.',
        }
        notificar_a = cita.cliente if es_propietario else cita.propietario
        crear_notificacion_sistema(
            usuario=notificar_a,
            titulo=f'Cita {nuevo_estado}',
            mensaje=textos[nuevo_estado],
            tipo=Notificacion.TipoNotificacion.INFO,
        )

        return Response(self.get_serializer(cita).data)

    @action(detail=False, methods=['get'], url_path='mis-citas-agenda')
    def mis_citas_agenda(self, request):
        """Lista todas las citas del usuario (como cliente o propietario)."""
        citas = Cita.objects.filter(
            dj_models.Q(cliente=request.user) | dj_models.Q(propietario=request.user)
        ).select_related('inmueble', 'cliente', 'propietario').order_by('-fecha', '-hora_inicio')
        return Response(self.get_serializer(citas, many=True).data)



class PublicacionViewSet(viewsets.ModelViewSet):
    """CRUD para ofertas comerciales (publicaciones)."""
    queryset = Publicacion.objects.select_related('inmueble__direccion', 'inmueble__tipo').prefetch_related('inmueble__multimedia').all()
    serializer_class = PublicacionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Publicacion.objects.select_related('inmueble__direccion', 'inmueble__tipo').prefetch_related('inmueble__multimedia')
        
        # Filtros opcionales
        inmueble_id = self.request.query_params.get('inmueble')
        if inmueble_id:
            qs = qs.filter(inmueble_id=inmueble_id)
            
        estado = self.request.query_params.get('estado')
        if estado:
            qs = qs.filter(estado=estado)
            
        return qs

    def perform_create(self, serializer):
        # Asegurar que el usuario que crea la publicación sea el propietario del inmueble
        inmueble = serializer.validated_data['inmueble']
        if inmueble.propietario != self.request.user and not self.request.user.is_staff:
            raise ValidationError("No eres el propietario de este inmueble.")
        serializer.save()

class VerificacionTituloViewSet(viewsets.ModelViewSet):
    """ViewSet para la verificación legal automatizada de títulos de propiedad."""
    serializer_class = VerificacionTituloSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if (self.request.user.is_staff or self.request.user.rol == 'admin') and self.request.query_params.get('personal') != 'true':
            return VerificacionTitulo.objects.all()
        return VerificacionTitulo.objects.filter(inmueble__propietario=self.request.user)

    def create(self, request, *args, **kwargs):
        """Sube un documento y ejecuta la verificación legal por IA."""
        import cloudinary
        import cloudinary.uploader
        from django.conf import settings
        from .services import verificar_titulo_con_ia

        inmueble_id = request.data.get('inmueble')
        archivo = request.FILES.get('archivo')

        if not inmueble_id or not archivo:
            return Response({'error': 'Se requiere el ID del inmueble y el archivo del título.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            inmueble = Inmueble.objects.get(id=inmueble_id)
        except Inmueble.DoesNotExist:
            return Response({'error': 'El inmueble especificado no existe.'}, status=status.HTTP_404_NOT_FOUND)

        if inmueble.propietario != request.user and not (request.user.is_staff or request.user.rol == 'admin'):
            return Response({'error': 'No tienes permisos para verificar este inmueble.'}, status=status.HTTP_403_FORBIDDEN)

        cloudinary.config(
            cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
            api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
            api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
        )

        try:
            # Leer los bytes locales del archivo para procesarlo sin descargar de nuevo (bypasseando restricciones de Cloudinary raw)
            archivo.seek(0)
            file_bytes = archivo.read()
            archivo.seek(0)
        except Exception:
            file_bytes = None

        try:
            is_pdf = archivo.name.lower().endswith('.pdf')
            upload_data = cloudinary.uploader.upload(
                archivo,
                resource_type='raw' if is_pdf else 'image',
                folder='titulos_propiedad'
            )
            archivo_url = upload_data.get('secure_url')
        except Exception as upload_err:
            return Response({'error': f'Error al subir archivo a Cloudinary: {str(upload_err)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            verificacion = verificar_titulo_con_ia(inmueble.id, archivo_url, request.user, file_bytes=file_bytes)
            serializer = self.get_serializer(verificacion)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as ocr_err:
            return Response({'error': f'Error al procesar la verificación del documento: {str(ocr_err)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='resultado/(?P<inmueble_id>[0-9]+)')
    def resultado(self, request, inmueble_id=None):
        """Retorna el resultado actual de la verificación de un inmueble."""
        try:
            inmueble = Inmueble.objects.get(id=inmueble_id)
        except Inmueble.DoesNotExist:
            return Response({'error': 'El inmueble especificado no existe.'}, status=status.HTTP_404_NOT_FOUND)

        if inmueble.propietario != request.user and not (request.user.is_staff or request.user.rol == 'admin'):
            return Response({'error': 'No tienes permisos para ver esta verificación.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            verificacion = VerificacionTitulo.objects.get(inmueble=inmueble)
            serializer = self.get_serializer(verificacion)
            return Response(serializer.data)
        except VerificacionTitulo.DoesNotExist:
            return Response({'estado': 'no_solicitado', 'mensaje': 'No se ha solicitado verificación para este inmueble.'})


from rest_framework.views import APIView
from .blockchain_service import BlockchainService

class BlockchainHistorialView(APIView):
    """
    Vista de API para obtener la traza de auditoría inmutable de Blockchain de cualquier activo.
    Exclusivo para usuarios autenticados.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, asset_id, format=None):
        cache_key = f'bc:hist:{asset_id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached, status=status.HTTP_200_OK)
        try:
            historial = BlockchainService.obtener_historial(asset_id)
            cache.set(cache_key, historial, 60)
            return Response(historial, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BlockchainStatsView(APIView):
    """
    Vista de API para obtener las estadísticas generales de la Blockchain para el Admin.
    Exclusivo para administradores.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        try:
            if request.user.rol != 'admin':
                return Response({"error": "No autorizado."}, status=status.HTTP_403_FORBIDDEN)
            stats_data = cache.get('bc:stats')
            if stats_data is None:
                stats_data = BlockchainService.obtener_stats()
                if stats_data:
                    cache.set('bc:stats', stats_data, 30)
            if stats_data:
                return Response(stats_data, status=status.HTTP_200_OK)
            return Response({"error": "No se pudo conectar con el Blockchain Gateway."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from django.utils import timezone
from django.db import models as dj_models

class AccesoRecorrido360ViewSet(viewsets.ModelViewSet):
    serializer_class = AccesoRecorrido360Serializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return AccesoRecorrido360.objects.filter(
            dj_models.Q(propietario=user) | dj_models.Q(cliente=user)
        ).distinct()

    def perform_create(self, serializer):
        inmueble = serializer.validated_data['inmueble']
        if inmueble.propietario != self.request.user and not self.request.user.is_staff:
            raise ValidationError("Solo el propietario del inmueble puede otorgar acceso al recorrido 360°.")
        serializer.save(propietario=self.request.user)

    @action(detail=False, methods=['get'], url_path='check')
    def check_acceso(self, request):
        inmueble_id = request.query_params.get('inmueble_id')
        if not inmueble_id:
            return Response({'error': 'El parámetro inmueble_id es requerido.'}, status=400)

        try:
            inmueble = Inmueble.objects.get(id=inmueble_id)
            if inmueble.propietario == request.user or request.user.is_staff or request.user.rol == 'admin':
                return Response({'tiene_acceso': True, 'propietario': True})
        except Inmueble.DoesNotExist:
            return Response({'error': 'Inmueble no encontrado.'}, status=404)

        ahora = timezone.now()
        acceso = AccesoRecorrido360.objects.filter(
            inmueble_id=inmueble_id,
            cliente=request.user,
            activo=True,
            fecha_expiracion__gt=ahora
        ).first()

        if acceso:
            return Response({
                'tiene_acceso': True,
                'propietario': False,
                'acceso_id': acceso.id,
                'fecha_expiracion': acceso.fecha_expiracion
            })

        return Response({'tiene_acceso': False, 'propietario': False})

    @action(detail=True, methods=['post'], url_path='revocar')
    def revocar_acceso(self, request, pk=None):
        acceso = self.get_object()
        if acceso.propietario != request.user and not request.user.is_staff:
            return Response({'error': 'No tienes permisos para revocar este acceso.'}, status=403)

        acceso.activo = False
        acceso.save()
        return Response({'success': True, 'mensaje': 'Acceso revocado exitosamente.'})

    @action(detail=True, methods=['post'], url_path='ping_visor')
    def ping_visor(self, request, pk=None):
        acceso = self.get_object()
        if acceso.cliente != request.user:
            return Response({'error': 'Solo el cliente autorizado puede enviar latidos de conexión.'}, status=403)
        
        # Validar si el acceso ya expiró o fue revocado
        if not acceso.activo or acceso.fecha_expiracion < timezone.now():
            return Response({'error': 'Acceso inactivo o expirado.'}, status=400)

        # Si es el primer ping de una nueva sesión, incrementamos visitas.
        # Definiremos "nueva sesión" si el último acceso fue hace más de 5 minutos.
        ahora = timezone.now()
        if not acceso.ultimo_acceso_visor or (ahora - acceso.ultimo_acceso_visor).total_seconds() > 300:
            acceso.visitas += 1
            
        acceso.ultimo_acceso_visor = ahora
        acceso.save(update_fields=['visitas', 'ultimo_acceso_visor'])
        return Response({'success': True})


class AIReportView(APIView):
    """
    Genera reportes dinámicos procesados por IA Local (LM Studio).
    - Python detecta columnas del prompt (NLP + sinónimos) — 100% confiable.
    - La IA Local aplica filtros, ordenamiento y genera el resumen textual.
    - Python ejecuta los filtros estructurados devueltos por la IA sobre los datos reales.
    """
    permission_classes = [permissions.IsAuthenticated]

    # ────────────────────────────────────────────────────────────────────────
    # Diccionario de sinónimos para detección de columnas desde el prompt
    # ────────────────────────────────────────────────────────────────────────
    SINONIMOS = {
        'first_name': [
            'nombre', 'nombres', 'nombre completo', 'nombes', 'nombrs',
            'apellido', 'apellidos', 'first_name', 'firstname', 'first name',
            'nombre y apellido', 'nombres y apellidos', 'nombe', 'nomre',
        ],
        'email': [
            'email', 'correo', 'correos', 'correo electronico',
            'correo electrónico', 'mail', 'mails', 'emails', 'emial', 'maill',
        ],
        'ci': [
            'ci', 'c.i', 'cedula', 'cédula', 'documento', 'identificacion',
            'identificación', 'dni', 'carnet',
        ],
        'telefono': [
            'telefono', 'teléfono', 'telefonos', 'celular', 'telf',
            'telfono', 'telefano', 'phone', 'cel',
        ],
        'rol_nombre': [
            'rol', 'roles', 'cargo', 'tipo', 'perfil', 'rol_nombre',
        ],
        'activo': [
            'activo', 'activos', 'estado', 'habilitado', 'activa',
        ],
        'id': [
            'id', 'identificador', 'numero', 'número', 'identificacion',
        ],
        # Extensible para otros módulos (inmuebles, pagos, etc.)
        'titulo': ['titulo', 'título', 'nombre inmueble', 'propiedad'],
        'precio': ['precio', 'precios', 'costo', 'valor', 'monto'],
        'descripcion': ['descripcion', 'descripción', 'detalle'],
        'fecha': ['fecha', 'fechas', 'date'],
        'estado': ['estado', 'estados', 'status'],
    }

    @staticmethod
    def _normalizar(texto):
        import unicodedata
        return ''.join(
            c for c in unicodedata.normalize('NFD', str(texto))
            if unicodedata.category(c) != 'Mn'
        ).lower().strip()

    def _detectar_columnas_del_prompt(self, prompt_norm, available_cols):
        """
        Detecta desde el texto del prompt del usuario qué columnas quiere ver.
        Retorna un set de keys confirmadas en available_cols, o set() si no detectó nada.
        """
        keys_detectadas = set()
        col_keys = {c.get('key') for c in available_cols}

        for canonical_key, variaciones in self.SINONIMOS.items():
            if canonical_key not in col_keys:
                continue
            for var in variaciones:
                if var in prompt_norm:
                    keys_detectadas.add(canonical_key)
                    break

        # También comparar contra labels de las columnas disponibles
        for col in available_cols:
            label_norm = self._normalizar(col.get('label', ''))
            key_norm = self._normalizar(col.get('key', ''))
            if label_norm in prompt_norm or key_norm in prompt_norm:
                keys_detectadas.add(col.get('key'))

        return keys_detectadas

    def _detectar_ordenamiento(self, prompt_norm, available_cols):
        """
        Detecta si el prompt pide ordenar por alguna columna específica.
        Retorna (ordenar_por_key, orden_direccion) o (None, 'asc').
        """
        palabras_orden = ['orden', 'ordenar', 'ordenados', 'ordenada', 'ordenadas', 'ordenamiento', 'ordena', 'sort', 'ascendente', 'descendente']
        quiere_ordenar = any(p in prompt_norm for p in palabras_orden)

        if not quiere_ordenar:
            return None, 'asc'

        orden_direccion = 'asc'
        if any(p in prompt_norm for p in ['descendente', 'desc', 'mayor a menor', 'z a a', 'zaa']):
            orden_direccion = 'desc'
        elif any(p in prompt_norm for p in ['ascendente', 'asc', 'menor a mayor', 'a a z', 'aaz']):
            orden_direccion = 'asc'

        col_keys = {c.get('key') for c in available_cols}

        for canonical_key, variaciones in self.SINONIMOS.items():
            if canonical_key not in col_keys:
                continue
            for var in variaciones:
                if var in prompt_norm:
                    return canonical_key, orden_direccion

        return None, orden_direccion

    def post(self, request, *args, **kwargs):
        import json
        import requests as http_requests
        from django.conf import settings

        prompt = request.data.get('prompt', '').strip()
        data = request.data.get('data', [])
        columns = request.data.get('columns', [])
        title = request.data.get('title', 'Reporte')

        if not prompt:
            return Response({"error": "El prompt es requerido."}, status=400)

        # ── 1. Detectar columnas requeridas DESDE EL PROMPT (Python, 100% fiable) ──
        prompt_norm = self._normalizar(prompt)
        keys_a_conservar = self._detectar_columnas_del_prompt(prompt_norm, columns)

        # ── 2. Llamada a IA Local para procesar los datos directamente ─────────────
        local_ai_url = getattr(settings, 'LOCAL_AI_URL', 'http://192.168.56.1:1234/v1/chat/completions')
        local_ai_model = getattr(settings, 'LOCAL_AI_MODEL', 'meta-llama-3.1-8b-instruct')

        columns_str = json.dumps(
            [{'key': c['key'], 'label': c['label']} for c in columns],
            ensure_ascii=False
        )

        # Limitar datos a procesar para evitar problemas de contexto en la IA Local
        datos_recortados = data[:150]
        datos_str = json.dumps(datos_recortados, ensure_ascii=False)

        system_prompt = """Eres un Asistente Analista de Datos. Tu tarea es procesar un conjunto de datos en JSON según la instrucción del usuario.
Puedes realizar las siguientes acciones sobre los datos:
1. Filtrar filas (eliminar registros que no cumplan la condición).
2. Ordenar filas (por cualquier columna, de forma ascendente o descendente, alfabética o numéricamente).
3. Seleccionar columnas: Si el usuario pide explícitamente ciertos campos (ej: "solo nombres y email"), devuelve únicamente esas claves en los objetos de "datos".
4. Transformar valores: Si el usuario pide transformaciones específicas (ej: "nombres sin apellido", "emails en mayúscula"), modifica los valores directamente en la lista. Por ejemplo, para "nombres sin apellido", si el campo name o first_name contiene nombre y apellido (ej: "Juan Pérez"), transfórmalo a sólo el nombre de pila ("Juan").
5. Realizar cálculos y resúmenes: Si pide contar, sumar, promediar u otra operación, realiza el cálculo sobre los datos y descríbelo detalladamente en el campo "resumen".

Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "datos": [
    // Los registros procesados (filtrados, ordenados, transformados o con las columnas seleccionadas)
  ],
  "resumen": "Resumen detallado de los datos procesados. Si se solicitó un cálculo (conteo, suma, promedio), incluye aquí el resultado de forma clara."
}

NO incluyas bloques markdown (```json ... ```). Devuelve solo el JSON crudo."""

        user_content = f"""Columnas Disponibles: {columns_str}
Datos a Procesar (en JSON):
{datos_str}

Instrucción del Usuario: {prompt}"""

        ai_result = None
        try:
            resp = http_requests.post(
                local_ai_url,
                json={
                    "model": local_ai_model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1500,
                },
                headers={"Authorization": "Bearer lm-studio", "Content-Type": "application/json"},
                timeout=60,
            )
            resp.raise_for_status()
            ai_raw = resp.json()['choices'][0]['message']['content'].strip()

            # Limpiar delimitadores markdown
            for tag in ["```json", "```"]:
                if ai_raw.startswith(tag):
                    ai_raw = ai_raw[len(tag):]
            if ai_raw.endswith("```"):
                ai_raw = ai_raw[:-3]
            ai_result = json.loads(ai_raw.strip())
        except Exception:
            ai_result = None

        # ── 3. Procesar datos (Utilizar resultado de la IA o fallback determinista)
        available_keys = [c.get('key') for c in columns]

        if ai_result and isinstance(ai_result, dict) and "datos" in ai_result:
            datos_filtrados = ai_result.get("datos", [])
            resumen = ai_result.get("resumen", "Reporte procesado con IA Local.")

            # Limpiar claves de datos devueltos para evitar que la IA invente claves extrañas
            final_datos = []
            if isinstance(datos_filtrados, list):
                for item in datos_filtrados:
                    if isinstance(item, dict):
                        row = {k: item[k] for k in item if k in available_keys}
                        final_datos.append(row)

            # Si quedó vacío pero el prompt no pedía explícitamente operaciones de conteo/agregación, fallback
            if not final_datos and data and not any(palabra in prompt_norm for palabra in ['contar', 'suma', 'promedio', 'conteo', 'total']):
                final_datos = self._ejecutar_fallback_python(data, prompt_norm, columns, keys_a_conservar)
        else:
            datos_filtrados = self._ejecutar_fallback_python(data, prompt_norm, columns, keys_a_conservar)
            resumen = "Reporte procesado determinísticamente (la IA Local no respondió en formato esperado)."
            final_datos = datos_filtrados

        return Response({
            "datos": final_datos,
            "resumen": resumen,
        }, status=status.HTTP_200_OK)

    def _ejecutar_fallback_python(self, data, prompt_norm, columns, keys_a_conservar):
        datos_filtrados = list(data)

        # 1. Intentar ordenamiento determinista
        det_ordenar_por, det_orden = self._detectar_ordenamiento(prompt_norm, columns)
        if det_ordenar_por and isinstance(det_ordenar_por, str):
            reverse = (det_orden == 'desc')
            def safe_sort_key(item):
                val = item.get(det_ordenar_por)
                if val is None:
                    return (1, "") if not reverse else (-1, "")
                try:
                    float_val = float(val)
                    return (0, float_val)
                except (ValueError, TypeError):
                    return (2, str(val).lower())
            try:
                datos_filtrados.sort(key=safe_sort_key, reverse=reverse)
            except Exception:
                pass

        # 2. Filtrar columnas
        available_keys = [c.get('key') for c in columns]
        keys_to_use = list(keys_a_conservar) if keys_a_conservar else available_keys

        final_datos = []
        for item in datos_filtrados:
            row = {k: item[k] for k in keys_to_use if k in item}
            final_datos.append(row)

        return final_datos


from .models import AuditoriaCheck, AuditoriaAmbienteFoto
from .serializers import AuditoriaCheckSerializer, AuditoriaAmbienteFotoSerializer
from .services_auditoria import AuditoriaVisionEngine

class AuditoriaCheckViewSet(viewsets.ModelViewSet):
    """
    CRUD y Motor Pericial IA de Auditoría para Check-in y Check-out con Liquidación de Garantías.
    """
    serializer_class = AuditoriaCheckSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and (user.is_staff or user.rol == 'admin'):
            return AuditoriaCheck.objects.all()
        if user.is_authenticated:
            return AuditoriaCheck.objects.filter(
                dj_models.Q(inmueble__propietario=user) | 
                dj_models.Q(contrato__inquilino=user) |
                dj_models.Q(auditor=user)
            ).distinct()
        return AuditoriaCheck.objects.all()

    def perform_create(self, serializer):
        serializer.save(auditor=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=False, methods=['post'], url_path='iniciar-checkin')
    def iniciar_checkin(self, request):
        """Registra el Check-in base, detectando inventario inicial con YOLO y lecturas OCR."""
        try:
            inmueble_id = request.data.get('inmueble')
            contrato_id = request.data.get('contrato')
            fotos_data = request.data.get('fotos', [])
            garantia_base = request.data.get('monto_garantia_base', '3500.0')

            if not inmueble_id:
                return Response({'error': 'Debes seleccionar un inmueble.'}, status=status.HTTP_400_BAD_REQUEST)

            inmueble = get_object_or_404(Inmueble, pk=inmueble_id)

            auditoria = AuditoriaCheck.objects.create(
                inmueble=inmueble,
                contrato_id=contrato_id,
                auditor=request.user if request.user.is_authenticated else None,
                tipo=AuditoriaCheck.TipoCheck.CHECKIN,
                monto_garantia_base=Decimal(str(garantia_base)),
                dictamen_ia="Check-in inicial registrado satisfactoriamente con inventario base."
            )

            for item in fotos_data:
                ambiente = item.get('ambiente', 'sala')
                foto_url = item.get('foto_url')
                if not foto_url:
                    continue

                # Inferencia YOLOv8
                inventario = AuditoriaVisionEngine.detectar_inventario_yolo(foto_url)
                
                AuditoriaAmbienteFoto.objects.create(
                    auditoria=auditoria,
                    ambiente=ambiente,
                    foto_url=foto_url,
                    inventario_detectado=inventario,
                )

                # Si es medidor, extraer lectura OCR
                if ambiente == 'medidor_luz':
                    lectura = AuditoriaVisionEngine.leer_medidor_ocr(foto_url)
                    auditoria.lectura_luz_kwh = Decimal(str(lectura))
                elif ambiente == 'medidor_agua':
                    lectura = AuditoriaVisionEngine.leer_medidor_ocr(foto_url)
                    auditoria.lectura_agua_m3 = Decimal(str(lectura))

            auditoria.save()
            return Response(AuditoriaCheckSerializer(auditoria).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': f'Error en procesamiento de Check-in: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'], url_path='ejecutar-checkout')
    def ejecutar_checkout(self, request):
        """
        Ejecuta el Check-out pericial:
        1. Compara inventario YOLO vs Check-in previo.
        2. Detecta daños/grietas con OpenCV SSIM.
        3. Compara lecturas de medidores de servicio con OCR.
        4. Calcula la liquidación final de la garantía con deducciones desglosadas.
        """
        try:
            inmueble_id = request.data.get('inmueble')
            contrato_id = request.data.get('contrato')
            checkin_id = request.data.get('checkin_id')
            fotos_data = request.data.get('fotos', [])

            if not inmueble_id:
                return Response({'error': 'Debes seleccionar un inmueble.'}, status=status.HTTP_400_BAD_REQUEST)

            inmueble = get_object_or_404(Inmueble, pk=inmueble_id)

            # Buscar checkin previo
            checkin_previo = None
            if checkin_id:
                checkin_previo = AuditoriaCheck.objects.filter(pk=checkin_id).first()
            if not checkin_previo:
                checkin_previo = AuditoriaCheck.objects.filter(
                    inmueble=inmueble, 
                    tipo=AuditoriaCheck.TipoCheck.CHECKIN
                ).order_by('-creado').first()

            garantia_base = checkin_previo.monto_garantia_base if checkin_previo else Decimal('3500.0')

            # Crear registro de checkout
            checkout = AuditoriaCheck.objects.create(
                inmueble=inmueble,
                contrato_id=contrato_id,
                auditor=request.user if request.user.is_authenticated else None,
                tipo=AuditoriaCheck.TipoCheck.CHECKOUT,
                monto_garantia_base=garantia_base,
            )

            # Map de fotos del checkin para contraste
            fotos_checkin_map = {}
            if checkin_previo:
                for f in checkin_previo.fotos_ambientes.all():
                    fotos_checkin_map[f.ambiente] = f

            faltantes_totales = []
            danos_totales = []
            lectura_luz_checkout = Decimal('0.0')
            lectura_agua_checkout = Decimal('0.0')

            for item in fotos_data:
                ambiente = item.get('ambiente', 'sala')
                foto_url = item.get('foto_url')
                if not foto_url:
                    continue

                foto_in = fotos_checkin_map.get(ambiente)
                
                # 1. Inferencia YOLOv8 en Check-out
                inv_checkout = AuditoriaVisionEngine.detectar_inventario_yolo(foto_url)
                inv_checkin = foto_in.inventario_detectado if foto_in else []

                # 2. Análisis OpenCV de Daños / Fisuras
                foto_in_url = foto_in.foto_url if foto_in else foto_url
                analisis_danos = AuditoriaVisionEngine.comparar_danos_opencv(foto_in_url, foto_url)

                AuditoriaAmbienteFoto.objects.create(
                    auditoria=checkout,
                    ambiente=ambiente,
                    foto_url=foto_url,
                    inventario_detectado=inv_checkout,
                    ssim_score=analisis_danos.get('ssim_score', 1.0),
                    danos_detectados=analisis_danos.get('danos_detectados', []),
                    foto_referencia_checkin=foto_in
                )

                # Comparar faltantes de inventario
                labels_in = [x.get('label') for x in inv_checkin if isinstance(x, dict) and 'label' in x]
                labels_out = [x.get('label') for x in inv_checkout if isinstance(x, dict) and 'label' in x]
                for item_in in labels_in:
                    if item_in not in labels_out:
                        faltantes_totales.append(f"{item_in} en {ambiente}")

                # Registrar daños graves
                if analisis_danos.get('ssim_score', 1.0) < 0.85:
                    danos_totales.append(f"Alteración o fisuras en {ambiente} (Similitud: {analisis_danos.get('ssim_score')})")

                # OCR de medidores
                if ambiente == 'medidor_luz':
                    lectura_luz_checkout = Decimal(str(AuditoriaVisionEngine.leer_medidor_ocr(foto_url)))
                    checkout.lectura_luz_kwh = lectura_luz_checkout
                elif ambiente == 'medidor_agua':
                    lectura_agua_checkout = Decimal(str(AuditoriaVisionEngine.leer_medidor_ocr(foto_url)))
                    checkout.lectura_agua_m3 = lectura_agua_checkout

            # 3. Liquidación Pericial Final
            desglose = AuditoriaVisionEngine.dictamen_liquidacion(
                checkin_obj=checkin_previo,
                checkout_fotos=checkout.fotos_ambientes.all()
            ) if checkin_previo else {
                'deduccion_faltantes': Decimal('0.0'),
                'deduccion_danos': Decimal('0.0'),
                'deduccion_servicios': Decimal('0.0'),
                'total_deducciones': Decimal('0.0'),
                'monto_a_reembolsar': garantia_base,
                'dictamen_texto': "Check-out procesado exitosamente sin observaciones."
            }

            checkout.deduccion_faltantes = desglose['deduccion_faltantes']
            checkout.deduccion_danos = desglose['deduccion_danos']
            checkout.deduccion_servicios = desglose['deduccion_servicios']
            checkout.total_deducciones = desglose['total_deducciones']
            checkout.monto_a_reembolsar = desglose['monto_a_reembolsar']
            checkout.dictamen_ia = desglose['dictamen_texto']
            checkout.estado = AuditoriaCheck.EstadoAuditoria.LIQUIDADO
            checkout.save()

            return Response(AuditoriaCheckSerializer(checkout).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Error en peritaje de Check-out: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


from .services_asistente_espacial import AsistenteEspacialEngine

class AsistenteEspacialViewSet(viewsets.ViewSet):
    """
    Endpoint pericial para consultas de lenguaje natural y medición 360°.
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'], url_path='consultar')
    def consultar(self, request):
        texto = request.data.get('consulta', '').strip()
        inmueble_id = request.data.get('inmueble')

        if not texto:
            return Response({'error': 'Debes enviar una consulta.'}, status=status.HTTP_400_BAD_REQUEST)

        inmueble = None
        if inmueble_id:
            try:
                inmueble = Inmueble.objects.get(id=inmueble_id)
            except Inmueble.DoesNotExist:
                return Response({'error': 'Inmueble no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not inmueble:
            return Response({'error': 'Debes indicar el inmueble sobre el que preguntas.'}, status=status.HTTP_400_BAD_REQUEST)

        resultado = AsistenteEspacialEngine.procesar_consulta(
            texto,
            inmueble,
            foto_360_url=request.data.get('foto_360_url'),
            panorama_id=request.data.get('panorama_id'),
            yaw=request.data.get('yaw'),
            pitch=request.data.get('pitch'),
        )
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='iniciar-tour')
    def iniciar_tour(self, request):
        inmueble_id = request.data.get('inmueble')
        inmueble = None
        if inmueble_id:
            try:
                inmueble = Inmueble.objects.get(id=inmueble_id)
            except Inmueble.DoesNotExist:
                return Response({'error': 'Inmueble no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if not inmueble:
            return Response({'error': 'Debes indicar el inmueble del recorrido.'}, status=status.HTTP_400_BAD_REQUEST)

        tour_data = AsistenteEspacialEngine.generar_tour_narrado(
            inmueble,
            foto_360_url=request.data.get('foto_360_url'),
            usar_vision=True,
        )
        return Response(tour_data, status=status.HTTP_200_OK)


from .services_calidad_vida import CalidadVidaEngine

class CalidadVidaViewSet(viewsets.ViewSet):
    """
    Endpoint para el cálculo del Índice de Calidad de Vida (Barrio), Walk Score
    y puntos de interés cercanos (POIs).
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get', 'post'], url_path='evaluar')
    def evaluar(self, request):
        inmueble_id = request.query_params.get('inmueble') or request.data.get('inmueble')
        lat = None
        lng = None

        if inmueble_id:
            try:
                inmueble = Inmueble.objects.get(id=inmueble_id)
                if inmueble.gps and ',' in inmueble.gps:
                    parts = inmueble.gps.split(',')
                    lat = float(parts[0].strip())
                    lng = float(parts[1].strip())
            except Exception:
                pass

        # Coordenadas por defecto (Santa Cruz de la Sierra centro / Equipetrol) si no tiene GPS
        if lat is None or lng is None:
            lat = float(request.query_params.get('lat') or request.data.get('lat') or -17.7833)
            lng = float(request.query_params.get('lng') or request.data.get('lng') or -63.1821)

        resultado = CalidadVidaEngine.calcular_indice_barrio(lat, lng)
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='metaverso-datos')
    def metaverso_datos(self, request):
        """
        Súper Endpoint Unificado: Retorna en un solo payload ultrarrápido (<50ms):
        1. Panoramas 360° y Hotspots.
        2. Tour narrado con coordenadas esféricas del Guía Virtual.
        3. Cotas y catálogo métrico de Realidad Aumentada.
        4. Walk Score y POIs geolocalizados del barrio para pines AR.
        5. Modelo 3D / AR para inserción de mobiliario virtual.
        """
        inmueble_id = request.query_params.get('inmueble')
        inmueble = None
        if inmueble_id:
            try:
                inmueble = Inmueble.objects.select_related('direccion', 'tipo').prefetch_related('multimedia', 'hotspots').get(id=inmueble_id)
            except Inmueble.DoesNotExist:
                pass

        if not inmueble:
            inmueble = Inmueble.objects.select_related('direccion', 'tipo').prefetch_related('multimedia', 'hotspots').first()

        if not inmueble:
            return Response({'error': 'No hay inmuebles registrados'}, status=status.HTTP_404_NOT_FOUND)

        cache_key = f'metaverso:{inmueble.id}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        # 1. Panoramas 360°
        panoramas_qs = inmueble.multimedia.filter(tipo='panorama360').order_by('orden')
        panoramas_data = []
        for p in panoramas_qs:
            # Obtener hotspots de salida desde este panorama
            hotspots_list = list(p.hotspots_salida.values('id', 'pitch', 'yaw', 'escena_destino_id', 'texto_ayuda'))
            panoramas_data.append({
                'id': p.id,
                'archivo': p.archivo.url if hasattr(p.archivo, 'url') else str(p.archivo),
                'descripcion': p.descripcion or 'Ambiente 360°',
                'orden': p.orden,
                'hotspots': hotspots_list
            })

        # 2. Tour y Guía Virtual con Voz
        try:
            tour_narrado = AsistenteEspacialEngine.generar_tour_narrado(inmueble)
        except Exception:
            tour_narrado = []


        # 3. Cotas de Realidad Aumentada: solo objetos realmente detectados
        # por visión en los panoramas (analisis_visual cacheado), marcadas
        # siempre como estimación. Sin análisis -> lista vacía, nunca
        # dimensiones inventadas.
        _POS_A_YAW = {
            'izquierda': -60.0, 'centro-izquierda': -30.0, 'centro': 0.0,
            'centro-derecha': 30.0, 'derecha': 60.0,
        }
        cotas_ar = []
        for p in panoramas_qs:
            analisis = getattr(p, 'analisis_visual', None)
            if not analisis:
                continue
            for obj in analisis.get('objetos', []):
                dim = obj.get('dimension_aprox')
                if not dim:
                    continue
                cotas_ar.append({
                    'elemento': obj.get('nombre', 'Objeto'),
                    'panorama_id': p.id,
                    'yaw': _POS_A_YAW.get((obj.get('posicion') or 'centro').lower(), 0.0),
                    'pitch': 0.0,
                    'cota': f"{dim} (aprox.)",
                    'estimado': True,
                })
            if len(cotas_ar) >= 8:
                break
        cotas_ar = cotas_ar[:8]

        # 4. Calidad de Vida, Walk Score y Pines AR del Barrio
        lat = -17.7833
        lng = -63.1821
        if inmueble.gps and ',' in inmueble.gps:
            try:
                parts = inmueble.gps.split(',')
                lat = float(parts[0].strip())
                lng = float(parts[1].strip())
            except Exception:
                pass

        calidad_vida = CalidadVidaEngine.calcular_indice_barrio(lat, lng)

        # Pines AR flotantes con orientación esférica en la ventana (-35° yaw)
        pines_ar_barrio = []
        for poi in calidad_vida.get('puntos_de_interes', [])[:6]:
            pines_ar_barrio.append({
                'nombre': poi['nombre'],
                'tipo': poi['tipo'],
                'categoria': poi['categoria'],
                'distancia_m': poi['distancia_metros'],
                'minutos_a_pie': poi['minutos_a_pie'],
                'yaw': round(-35.0 + (poi['distancia_metros'] % 50) - 25, 1),
                'pitch': round(2.0 + (poi['distancia_metros'] % 10), 1)
            })

        payload = {
            'inmueble_id': inmueble.id,
            'titulo': inmueble.titulo,
            'direccion': str(inmueble.direccion) if inmueble.direccion else 'Zona Norte, Santa Cruz',
            'modelo_3d_url': inmueble.modelo_3d or '',
            'panoramas': panoramas_data,
            'tour_narrado': tour_narrado,
            'cotas_ar': cotas_ar,
            'calidad_vida': calidad_vida,
            'pines_ar_barrio': pines_ar_barrio
        }
        cache.set(cache_key, payload, 900)
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'], url_path='estimar-precio-ml')
    def estimar_precio_ml(self, request):
        """
        Valuador Inteligente con Machine Learning:
        Calcula precio sugerido de alquiler/venta usando Gradient Boosting y Random Forest.
        """
        from .services_valuador_ml import ValuadorInmobiliarioEngine

        params = request.query_params if request.method == 'GET' else request.data
        superficie = float(params.get('superficie_m2') or 85.0)
        dormitorios = int(params.get('dormitorios') or 2)
        banios = int(params.get('banios') or 2)
        parqueos = int(params.get('parqueos') or 1)
        walk_score = float(params.get('walk_score') or 85.0)
        distancia = float(params.get('distancia_centro_km') or 3.5)
        tiene_360 = str(params.get('tiene_360', 'true')).lower() in ['true', '1']
        es_estreno = str(params.get('es_estreno', 'false')).lower() in ['true', '1']

        estimacion = ValuadorInmobiliarioEngine.estimar_precio(
            superficie_m2=superficie,
            dormitorios=dormitorios,
            banios=banios,
            parqueos=parqueos,
            walk_score=walk_score,
            distancia_centro_km=distancia,
            tiene_360=tiene_360,
            es_estreno=es_estreno
        )
        return Response(estimacion, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='medir-distancia-3d')
    def medir_distancia_3d(self, request):
        """
        Estimador de Profundidad Monocular 360°:
        Calcula la distancia métrica tridimensional (X, Y, Z) en metros
        entre dos puntos (u1, v1) y (u2, v2) sobre el panorama esférico.
        """
        from .services_depth_360 import DepthEstimation360Engine
        import numpy as np
        import cv2

        u1 = float(request.data.get('u1', 0.2))
        v1 = float(request.data.get('v1', 0.5))
        u2 = float(request.data.get('u2', 0.5))
        v2 = float(request.data.get('v2', 0.5))

        # La medición debe hacerse sobre la imagen real del panorama, no
        # sobre una imagen de prueba. Sin panorama real -> error honesto.
        inmueble_id = request.data.get('inmueble')
        panorama_id = request.data.get('panorama_id')
        foto_360_url = request.data.get('foto_360_url')

        pano = None
        if panorama_id:
            pano = Multimedia.objects.filter(id=panorama_id, tipo='panorama360').first()
        if pano is None and inmueble_id:
            pano = Multimedia.objects.filter(
                inmueble_id=inmueble_id, tipo='panorama360'
            ).order_by('orden').first()

        url = str(pano.archivo) if pano else foto_360_url
        if not url:
            return Response(
                {'error': 'No hay un panorama 360° real para medir. La medición requiere la imagen del ambiente.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if url.startswith('http://') or url.startswith('https://'):
                import requests as _requests
                img_bytes = _requests.get(url, timeout=15).content
            else:
                rel = url.lstrip('/')
                if rel.startswith('media/'):
                    rel = rel[len('media/'):]
                from django.conf import settings as _settings
                import os as _os
                with open(_os.path.join(str(_settings.MEDIA_ROOT), rel), 'rb') as f:
                    img_bytes = f.read()

            arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError('imagen no decodificable')
        except Exception:
            return Response(
                {'error': 'No se pudo cargar la imagen 360° para medir.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reducir para acelerar el cálculo de profundidad
        img = cv2.resize(img, (640, 320))
        depth_map = DepthEstimation360Engine.estimar_profundidad_esferica(img)

        medicion = DepthEstimation360Engine.medir_distancia_3d(
            depth_map,
            (u1, v1),
            (u2, v2)
        )
        medicion['fuente'] = 'estimacion'
        medicion['nota'] = 'Medición aproximada calculada sobre la imagen real; puede variar respecto a la medida física.'
        medicion['panorama_id'] = pano.id if pano else None
        return Response(medicion, status=status.HTTP_200_OK)







