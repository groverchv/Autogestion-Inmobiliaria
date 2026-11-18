from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count

from .models import Usuario, Agenda, Notificacion, Chat, Mensaje, Bloqueo, Resena
from .services import crear_notificacion_sistema, crear_notificacion_usuario
from .serializers import (
    UsuarioSerializer,
    UsuarioCreateSerializer,
    AgendaSerializer,
    NotificacionSerializer,
    ChatSerializer,
    MensajeSerializer,
    BloqueoSerializer,
    ResenaSerializer,
)


class UsuarioViewSet(viewsets.ModelViewSet):
    """CRUD para usuarios."""
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me', permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Retorna o actualiza el perfil del usuario autenticado."""
        if request.method in ['PUT', 'PATCH']:
            serializer = UsuarioSerializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = UsuarioSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='actualizar-fcm-token', permission_classes=[permissions.IsAuthenticated])
    def actualizar_fcm_token(self, request):
        """Registra el token de Firebase Cloud Messaging del navegador o móvil."""
        token = request.data.get('fcm_token')
        if not token:
            return Response({'error': 'fcm_token requerido'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        user.fcm_token = token
        user.save(update_fields=['fcm_token'])
        return Response({'ok': True, 'mensaje': 'Token FCM actualizado correctamente'})

    @action(detail=False, methods=['get'], url_path='badges')
    def badges(self, request):
        """Contadores de cosas no leídas para el navbar."""
        user = request.user
        notif_count = Notificacion.objects.filter(usuario=user, leida=False).count()
        notif_sistema = Notificacion.objects.filter(
            usuario=user,
            leida=False,
            origen=Notificacion.OrigenNotificacion.SISTEMA,
        ).count()
        notif_usuario = Notificacion.objects.filter(
            usuario=user,
            leida=False,
            origen=Notificacion.OrigenNotificacion.USUARIO,
        ).count()
        
        # Mensajes no leídos en todos los chats del usuario
        chats = Chat.objects.filter(Q(participante1=user) | Q(participante2=user))
        msg_count = Mensaje.objects.filter(
            chat__in=chats,
            leido=False
        ).exclude(remitente=user).count()
        
        return Response({
            'notificaciones': notif_count,
            'notificaciones_sistema': notif_sistema,
            'notificaciones_usuario': notif_usuario,
            'mensajes': msg_count,
        })


class RegistroView(viewsets.GenericViewSet):
    """Endpoint público para registro de usuarios."""
    serializer_class = UsuarioCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        if not request.data.get('acepta_terminos'):
            return Response(
                {'acepta_terminos': ['Debes aceptar los Términos y Condiciones para crear tu cuenta.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        from django.utils import timezone
        user.acepto_terminos_at = timezone.now()
        user.terminos_version = 'v1.0'
        user.save(update_fields=['acepto_terminos_at', 'terminos_version'])

        # Enviar correo de bienvenida al nuevo usuario
        try:
            from inmuebles.services_notificaciones import send_email_notification
            nombre_mostrar = user.first_name or user.email.split('@')[0]
            asunto = "¡Bienvenido a Inmobiliaria 360!"
            mensaje_texto = (
                f"Hola {nombre_mostrar},\n\n"
                f"Te damos la bienvenida a Inmobiliaria 360, tu plataforma de autogestión inmobiliaria con IA y Realidad Aumentada.\n\n"
                f"Tu cuenta ha sido creada exitosamente con el correo: {user.email}.\n\n"
                f"Ya puedes acceder a publicar propiedades, agendar visitas, evaluar cotizaciones y explorar el metaverso 360°.\n\n"
                f"Atentamente,\nEquipo de Inmobiliaria 360"
            )
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #0f172a; padding: 24px 32px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 22px;">Inmobiliaria <span style="color: #38bdf8;">360</span></h2>
                </div>
                <div style="padding: 32px;">
                    <h3 style="color: #0f172a; margin-top: 0;">¡Hola, {nombre_mostrar}!</h3>
                    <p style="color: #334155; line-height: 1.6;">
                        Te damos la más cordial bienvenida a <strong>Inmobiliaria 360</strong>. Tu cuenta ha sido creada con éxito.
                    </p>
                    <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0;">
                        <p style="margin: 0; color: #475569; font-size: 14px;"><strong>Email registrado:</strong> {user.email}</p>
                    </div>
                    <p style="color: #334155; line-height: 1.6;">
                        A partir de ahora podrás disfrutar de:
                    </p>
                    <ul style="color: #334155; line-height: 1.8;">
                        <li>Tours virtuales inmersivos en 360° y Realidad Aumentada.</li>
                        <li>Valuación predictiva inteligente de propiedades con IA.</li>
                        <li>Auditoría y peritaje automatizado de ambientes.</li>
                    </ul>
                </div>
                <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">Inmobiliaria 360 &copy; 2026. Todos los derechos reservados.</p>
                </div>
            </div>
            """
            send_email_notification(
                to_email=user.email,
                subject=asunto,
                message=mensaje_texto,
                html_message=html_content
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error enviando correo de bienvenida: {e}")

        # Crear notificación en plataforma
        crear_notificacion_sistema(
            usuario=user,
            titulo="¡Bienvenido a Inmobiliaria 360!",
            mensaje="Tu cuenta fue creada con éxito. Explora propiedades y descubre el visor 360° con Inteligencia Artificial.",
            tipo=Notificacion.TipoNotificacion.CONFIRMACION
        )

        return Response(
            UsuarioSerializer(user).data,
            status=status.HTTP_201_CREATED,
        )


class AgendaViewSet(viewsets.ModelViewSet):
    """CRUD para eventos de agenda."""
    serializer_class = AgendaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if (user.is_staff or user.rol == 'admin') and self.request.query_params.get('personal') != 'true':
            return Agenda.objects.all()
        return Agenda.objects.filter(usuario=user)

    def perform_create(self, serializer):
        if 'usuario' not in serializer.validated_data:
            serializer.save(usuario=self.request.user)
        else:
            serializer.save()


class NotificacionViewSet(viewsets.ModelViewSet):
    """CRUD para notificaciones."""
    serializer_class = NotificacionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Notificacion.objects.all() if ((user.is_staff or user.rol == 'admin') and self.request.query_params.get('personal') != 'true') else Notificacion.objects.filter(usuario=user)
        
        # Filtrar por origen si se especifica
        origen = self.request.query_params.get('origen')
        if origen in ['sistema', 'usuario']:
            qs = qs.filter(origen=origen)
        return qs

    def perform_create(self, serializer):
        if 'usuario' not in serializer.validated_data:
            serializer.save(
                usuario=self.request.user,
                origen=Notificacion.OrigenNotificacion.USUARIO,
            )
        else:
            serializer.save(origen=Notificacion.OrigenNotificacion.SISTEMA)

    @action(detail=False, methods=['get'], url_path='sistema')
    def sistema(self, request):
        qs = self.get_queryset().filter(origen=Notificacion.OrigenNotificacion.SISTEMA)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='usuario')
    def usuario(self, request):
        qs = self.get_queryset().filter(origen=Notificacion.OrigenNotificacion.USUARIO)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='usuario-confirmacion')
    def usuario_confirmacion(self, request):
        titulo = (request.data.get('titulo') or '').strip()
        mensaje = (request.data.get('mensaje') or '').strip()
        if not titulo or not mensaje:
            return Response({'error': 'titulo y mensaje son requeridos'}, status=400)

        notif = crear_notificacion_usuario(
            usuario=request.user,
            titulo=titulo,
            mensaje=mensaje,
            tipo=Notificacion.TipoNotificacion.CONFIRMACION,
        )
        serializer = self.get_serializer(notif)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='sistema-alerta')
    def sistema_alerta(self, request):
        if not (request.user.is_staff or request.user.rol == 'admin'):
            return Response({'error': 'No autorizado'}, status=403)

        usuario_id = request.data.get('usuario')
        titulo = (request.data.get('titulo') or '').strip()
        mensaje = (request.data.get('mensaje') or '').strip()
        tipo = request.data.get('tipo') or Notificacion.TipoNotificacion.ALERTA
        if not usuario_id or not titulo or not mensaje:
            return Response({'error': 'usuario, titulo y mensaje son requeridos'}, status=400)

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=404)

        notif = crear_notificacion_sistema(
            usuario=usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
        )
        serializer = self.get_serializer(notif)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='marcar-leidas')
    def marcar_leidas(self, request):
        """Marca todas las notificaciones como leídas."""
        origen = request.data.get('origen')
        qs = self.get_queryset().filter(leida=False)
        if origen in ['sistema', 'usuario']:
            qs = qs.filter(origen=origen)
        qs.update(leida=True)
        return Response({'status': 'Notificaciones marcadas como leídas'})


class ChatViewSet(viewsets.ModelViewSet):
    """CRUD para Chats."""
    serializer_class = ChatSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        user = self.request.user
        qs = Chat.objects.filter(Q(participante1=user) | Q(participante2=user)).distinct()
        return qs

    def create(self, request, *args, **kwargs):
        part1 = request.data.get('participante1') or request.user.id
        part2 = request.data.get('participante2')
        inm = request.data.get('inmueble')

        if not part2:
            return Response({'error': 'participante2 es requerido'}, status=400)

        # Verificar bloqueos
        if Bloqueo.objects.filter(
            Q(bloqueador_id=part1, bloqueado_id=part2) | 
            Q(bloqueador_id=part2, bloqueado_id=part1)
        ).exists():
            return Response({'error': 'No puedes chatear con este usuario'}, status=403)

        # Buscar chat existente en cualquier dirección
        chat = Chat.objects.filter(
            (Q(participante1_id=part1) & Q(participante2_id=part2)) |
            (Q(participante1_id=part2) & Q(participante2_id=part1))
        ).first()

        if chat:
            serializer = self.get_serializer(chat)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Crear nuevo chat
        chat = Chat.objects.create(
            participante1_id=part1,
            participante2_id=part2,
            inmueble_id=inm
        )
        serializer = self.get_serializer(chat)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='mensajes')
    def listar_mensajes(self, request, pk=None):
        chat = self.get_object()
        mensajes = chat.mensajes.all().order_by('creado')
        # Marcar como leídos los que no son míos
        mensajes.exclude(remitente=request.user).filter(leido=False).update(leido=True)
        serializer = MensajeSerializer(mensajes, many=True)
        return Response(serializer.data)


class MensajeViewSet(viewsets.ModelViewSet):
    """CRUD para Mensajes con soporte de archivos."""
    serializer_class = MensajeSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        return Mensaje.objects.filter(Q(chat__participante1=user) | Q(chat__participante2=user)).distinct()

    def create(self, request, *args, **kwargs):
        tipo = request.data.get('tipo') or request.data.get('tipo_mensaje') or 'texto'
        chat_id = request.data.get('chat')
        contenido = request.data.get('contenido', '')
        archivo_file = request.FILES.get('archivo')
        ubicacion_val = request.data.get('ubicacion') or request.data.get('ubicacion_gps') or ''
        
        # Verificar bloqueos
        try:
            chat = Chat.objects.get(id=chat_id)
        except Chat.DoesNotExist:
            return Response({'error': 'Chat no encontrado'}, status=404)
        
        other_user = chat.participante2 if chat.participante1 == request.user else chat.participante1
        if Bloqueo.objects.filter(
            Q(bloqueador=request.user, bloqueado=other_user) |
            Q(bloqueador=other_user, bloqueado=request.user)
        ).exists():
            return Response({'error': 'Bloqueado: no puedes enviar mensajes'}, status=403)

        archivo_url = ''
        if archivo_file and tipo in ['imagen', 'video']:
            import cloudinary
            import cloudinary.uploader
            from django.conf import settings
            
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
                api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
                api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
            )
            upload_data = cloudinary.uploader.upload(
                archivo_file,
                resource_type='auto' if tipo == 'video' else 'image'
            )
            archivo_url = upload_data.get('secure_url', '')

        if tipo == 'whatsapp' and not contenido:
            return Response({'error': 'Debes enviar un número de WhatsApp válido'}, status=400)

        if tipo == 'recorrido360':
            if not chat.inmueble:
                return Response({'error': 'Este chat no está asociado a ningún inmueble.'}, status=400)
            if chat.inmueble.propietario != request.user and not request.user.is_staff:
                return Response({'error': 'Solo el propietario de este inmueble puede otorgar acceso al recorrido 360°.'}, status=403)

        msg = Mensaje.objects.create(

            chat_id=chat_id,
            remitente=request.user,
            tipo=tipo,
            contenido=contenido,
            archivo=archivo_url,
            ubicacion=ubicacion_val,
        )
        
        # Actualizar timestamp del chat
        chat.save()  # triggers auto_now on actualizado

        receptor = chat.participante2 if chat.participante1 == request.user else chat.participante1
        if receptor != request.user:
            crear_notificacion_usuario(
                usuario=receptor,
                titulo='Nuevo mensaje recibido',
                mensaje=f'Tienes un nuevo mensaje de {request.user.get_full_name() or request.user.email}.',
                tipo=Notificacion.TipoNotificacion.CONFIRMACION,
            )

        serializer = MensajeSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BloqueoViewSet(viewsets.ModelViewSet):
    """Gestión de bloqueos entre usuarios."""
    serializer_class = BloqueoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Bloqueo.objects.filter(bloqueador=self.request.user)

    def perform_create(self, serializer):
        serializer.save(bloqueador=self.request.user)

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle(self, request):
        """Bloquear/Desbloquear un usuario."""
        bloqueado_id = request.data.get('bloqueado')
        if not bloqueado_id:
            return Response({'error': 'Falta el ID del usuario'}, status=400)
        
        bloqueo = Bloqueo.objects.filter(bloqueador=request.user, bloqueado_id=bloqueado_id).first()
        if bloqueo:
            bloqueo.delete()
            return Response({'bloqueado': False, 'status': 'Usuario desbloqueado'})
        
        Bloqueo.objects.create(bloqueador=request.user, bloqueado_id=bloqueado_id)
        return Response({'bloqueado': True, 'status': 'Usuario bloqueado'})
    
    @action(detail=False, methods=['get'], url_path='check/(?P<user_id>[^/.]+)')
    def check(self, request, user_id=None):
        """Verificar si un usuario está bloqueado."""
        is_blocked = Bloqueo.objects.filter(bloqueador=request.user, bloqueado_id=user_id).exists()
        blocked_me = Bloqueo.objects.filter(bloqueador_id=user_id, bloqueado=request.user).exists()
        return Response({'bloqueado_por_mi': is_blocked, 'me_bloqueo': blocked_me})


class ResenaViewSet(viewsets.ModelViewSet):
    """CRUD para reseñas de inmuebles."""
    serializer_class = ResenaSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        inmueble_id = self.request.query_params.get('inmueble')
        qs = Resena.objects.select_related('usuario', 'inmueble')
        # El público solo ve reseñas aprobadas; staff/admin las ven todas (moderación)
        if not (self.request.user.is_authenticated and (self.request.user.is_staff or self.request.user.rol == 'admin')):
            qs = qs.filter(aprobada=True)
        if inmueble_id:
            qs = qs.filter(inmueble_id=inmueble_id)
        return qs

    def perform_create(self, serializer):
        # Anti reseñas falsas: solo usuarios con interacción real (cita completada o contrato)
        inmueble = serializer.validated_data.get('inmueble')
        user = self.request.user
        if not (user.is_staff or user.rol == 'admin'):
            from inmuebles.models import Cita, Contrato
            tiene_interaccion = (
                Cita.objects.filter(inmueble=inmueble, cliente=user, estado='completada').exists()
                or Contrato.objects.filter(inmueble=inmueble, inquilino=user, estado__in=['aceptado', 'activo', 'finalizado']).exists()
                or inmueble.propietario_id == user.id
            )
            if not tiene_interaccion:
                from rest_framework.exceptions import ValidationError
                raise ValidationError('Solo puedes reseñar inmuebles con los que hayas tenido una cita completada o contrato.')
        serializer.save(usuario=user)

    @action(detail=False, methods=['get'], url_path='promedio/(?P<inmueble_id>[^/.]+)')
    def promedio(self, request, inmueble_id=None):
        """Obtener promedio de calificación de un inmueble (solo reseñas aprobadas)."""
        from django.db.models import Avg
        result = Resena.objects.filter(inmueble_id=inmueble_id, aprobada=True).aggregate(
            promedio=Avg('calificacion'),
            total=Count('id')
        )
        return Response({
            'promedio': round(result['promedio'] or 0, 1),
            'total': result['total']
        })


from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vista personalizada para retornar tokens y datos del usuario.
    """
    serializer_class = CustomTokenObtainPairSerializer


from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

class GoogleLoginView(APIView):
    """
    Endpoint para autenticación con Google (Firebase ID Token).
    Verifica el token de Google, registra al usuario si es nuevo
    y devuelve los tokens JWT de acceso para la plataforma.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        id_token = request.data.get('id_token')
        if not id_token:
            return Response({'error': 'id_token es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from inmuebles.services_notificaciones import initialize_firebase
            import firebase_admin.auth as fb_auth

            if not initialize_firebase():
                return Response({'error': 'Servicio Firebase no disponible'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Verificar el token con Firebase Admin
            decoded_token = fb_auth.verify_id_token(id_token)
            email = decoded_token.get('email')
            if not email:
                return Response({'error': 'El token de Google no contiene un email válido'}, status=status.HTTP_400_BAD_REQUEST)

            nombre = decoded_token.get('name', '')
            foto = decoded_token.get('picture', '')

            # Obtener o crear el usuario en Django
            user, created = Usuario.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': nombre.split(' ')[0] if nombre else '',
                    'last_name': ' '.join(nombre.split(' ')[1:]) if (nombre and len(nombre.split(' ')) > 1) else '',
                    'rol': Usuario.RolesConfig.USUARIO,
                    'activo': True,
                }
            )

            # Si es nuevo, enviar correo de bienvenida y registrar términos
            if created:
                from django.utils import timezone
                user.acepto_terminos_at = timezone.now()
                user.terminos_version = 'v1.0 (Google Sign-In)'
                user.set_unusable_password()
                user.save()

                try:
                    from inmuebles.services_notificaciones import send_email_notification
                    send_email_notification(
                        to_email=user.email,
                        subject="¡Bienvenido a Inmobiliaria 360 con Google!",
                        message=f"Hola {user.first_name or user.email},\n\nTu cuenta ha sido creada exitosamente mediante Google en Inmobiliaria 360.",
                    )
                except Exception:
                    pass

                crear_notificacion_sistema(
                    usuario=user,
                    titulo="¡Bienvenido a Inmobiliaria 360!",
                    mensaje="Tu cuenta fue creada con éxito a través de Google.",
                    tipo=Notificacion.TipoNotificacion.CONFIRMACION
                )

            # Generar tokens JWT de sesión
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UsuarioSerializer(user).data,
                'is_new_user': created,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': f'Token inválido o expirado: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

