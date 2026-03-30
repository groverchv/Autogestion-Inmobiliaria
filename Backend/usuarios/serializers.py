from rest_framework import serializers
from .models import Rol, Usuario, Agenda, Notificacion


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = '__all__'


class UsuarioSerializer(serializers.ModelSerializer):
    rol_nombre = serializers.CharField(source='rol.nombre', read_only=True)

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


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'
        read_only_fields = ['id', 'creada']
