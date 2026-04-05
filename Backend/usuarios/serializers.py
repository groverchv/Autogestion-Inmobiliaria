from rest_framework import serializers
from .models import Usuario, Agenda, Notificacion, Chat, Mensaje


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'rol', 'rol_nombre', 'telefono', 'direccion', 'foto',
            'fecha_nacimiento', 'ci', 'activo', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios con contraseña."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'email', 'password', 'first_name',
            'last_name', 'rol', 'telefono', 'direccion',
            'fecha_nacimiento', 'ci',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = Usuario(**validated_data)
        user.set_password(password)
        user.save()
        return user


class AgendaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agenda
        fields = '__all__'
        read_only_fields = ['id', 'creado']
        extra_kwargs = {'usuario': {'required': False}}


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'
        read_only_fields = ['id', 'creada']
        extra_kwargs = {'usuario': {'required': False}}


class MensajeSerializer(serializers.ModelSerializer):
    remitente_nombre = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Mensaje
        fields = '__all__'
        read_only_fields = ['id', 'creado', 'remitente']

    def get_remitente_nombre(self, obj):
        return f'{obj.remitente.first_name} {obj.remitente.last_name}'


class ChatSerializer(serializers.ModelSerializer):
    participante1_nombre = serializers.CharField(source='participante1.get_full_name', read_only=True)
    participante2_nombre = serializers.CharField(source='participante2.get_full_name', read_only=True)
    inmueble_titulo = serializers.CharField(source='inmueble.titulo', read_only=True)
    ultimo_mensaje = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Chat
        fields = '__all__'
        read_only_fields = ['id', 'creado', 'actualizado', 'participante1', 'participante2']

    def get_ultimo_mensaje(self, obj):
        msg = obj.mensajes.order_by('-creado').first()
        if msg:
            return MensajeSerializer(msg).data
        return None
