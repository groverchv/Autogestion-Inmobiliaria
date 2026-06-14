# pyrefly: ignore [missing-import]
from rest_framework import viewsets, permissions, status, filters
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
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
    queryset = Inmueble.objects.select_related('tipo', 'propietario').prefetch_related('multimedia').all()
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
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Inmueble.objects.select_related('tipo', 'propietario').prefetch_related('multimedia')
        
        if self.request.path.startswith('/api/inmuebles/panel/'):
            if user.is_authenticated:
                if self.request.query_params.get('personal') == 'true':
                    return qs.filter(propietario=user)
                if user.is_staff or user.rol == 'admin':
                    return qs.all()
                return qs.filter(propietario=user)
            return qs.none()
            
        # Para catálogo público, no mostrar ocultos
        return qs.exclude(estado='oculto')

    def get_serializer_class(self):
        if self.action == 'list':
            return InmuebleListSerializer
        return InmuebleSerializer

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)

    @action(detail=False, methods=['get'])
    def ciudades(self, request):
        """Retorna una lista de ciudades únicas disponibles."""
        ciudades_qs = Inmueble.objects.exclude(direccion__isnull=True).values_list('direccion__ciudad', flat=True).distinct()
        # Filtrar valores vacíos o nulos
        ciudades = [c.strip() for c in ciudades_qs if c and c.strip()]
        # Eliminar duplicados generados por mayúsculas/minúsculas o espacios extra
        ciudades_unicas = sorted(list(set(c.title() for c in ciudades)))
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
Estás ayudando a un PROPIETARIO a crear un contrato para su inmueble.

CONTEXTO DEL CONTRATO:
- Inmueble: {contexto.get('inmueble_titulo', 'No especificado')}
- Tipo de contrato: {contexto.get('tipo_contrato', 'No definido aún')}
- Monto base: {contexto.get('monto', 'No definido')} {contexto.get('moneda', 'BOB')}
- Vigencia: desde {contexto.get('inicio', 'No definido')} hasta {contexto.get('fin', 'Indefinido')}

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

        inmueble    = serializer.validated_data['inmueble']
        hora_inicio = serializer.validated_data['hora_inicio']
        hora_fin    = (
            datetime.combine(datetime.today(), hora_inicio) + timedelta(hours=1)
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

        serializer.save(
            cliente=self.request.user,
            propietario=inmueble.propietario,
            hora_fin=hora_fin,
        )

        # Notificar al propietario
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
    queryset = Publicacion.objects.select_related('inmueble').all()
    serializer_class = PublicacionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Publicacion.objects.select_related('inmueble')
        
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
        try:
            historial = BlockchainService.obtener_historial(asset_id)
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
            stats_data = BlockchainService.obtener_stats()
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
    Genera reportes dinámicos procesados por IA. Recibe el prompt del usuario, las columnas
    y el listado completo de datos en JSON, y retorna los registros filtrados/ordenados
    junto con un resumen textual analítico.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        import json
        import requests
        from django.conf import settings

        prompt = request.data.get('prompt', '').strip()
        data = request.data.get('data', [])
        columns = request.data.get('columns', [])
        title = request.data.get('title', 'Reporte')

        if not prompt:
            return Response({"error": "El prompt es requerido."}, status=400)

        # Configurar llamada a Groq
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        if not api_key:
            return Response({"error": "La API Key de Groq no está configurada en el servidor."}, status=500)

        # Formatear el contexto para la IA
        context_data_str = json.dumps(data, ensure_ascii=False)
        columns_str = json.dumps(columns, ensure_ascii=False)

        system_prompt = """
Eres un Analista de Datos Inteligente experto en gestión inmobiliaria.
Tu tarea es analizar un listado de datos en formato JSON en base a la instrucción (prompt) del usuario.
Debes realizar dos acciones:
1. Filtrar, buscar o reordenar los registros del JSON según la instrucción del usuario. Retorna los registros modificados/filtrados exactos del JSON original.
2. Escribir un resumen textual analítico breve y profesional (de 2 a 4 líneas) sobre los registros seleccionados (ej. cantidad de elementos, totales, porcentajes relevantes o conclusiones rápidas de negocio).

CRITICAL RULE:
- DEBES conservar todas las propiedades y llaves (keys) originales de cada objeto JSON (por ejemplo: username, email, first_name, last_name, rol_nombre, activo, etc.).
- NO elimines, alteres ni dejes vacías ninguna de las propiedades que ya tenían los registros originales. Tu única función es decidir qué filas conservar o cómo ordenar el array, sin modificar la estructura interna de los objetos.

Tu respuesta DEBE ser un objeto JSON válido con la siguiente estructura exacta:
{
  "datos": [ ...lista de registros JSON filtrados/ordenados con todas sus llaves originales... ],
  "resumen": "Tu resumen textual descriptivo aquí."
}

NO agregues introducciones, explicaciones, ni bloques de código markdown (```json). Retorna únicamente el objeto JSON crudo listo para ser parseado.
"""

        user_content = f"""
Título del Reporte: {title}
Columnas Disponibles: {columns_str}
Registros Originales (JSON): {context_data_str}

Instrucción del usuario: {prompt}
"""

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.2,
            "max_tokens": 3000
        }

        try:
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=60)
            resp.raise_for_status()
            ai_content = resp.json()['choices'][0]['message']['content'].strip()

            # Limpiar posibles delimitadores markdown
            if ai_content.startswith("```json"):
                ai_content = ai_content[7:]
            if ai_content.startswith("```"):
                ai_content = ai_content[3:]
            if ai_content.endswith("```"):
                ai_content = ai_content[:-3]
            ai_content = ai_content.strip()

            result = json.loads(ai_content)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error al procesar el reporte con IA: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
