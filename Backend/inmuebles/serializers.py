from rest_framework import serializers
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision


class TipoInmuebleSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoInmueble
        fields = '__all__'


class MultimediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Multimedia
        fields = '__all__'
        read_only_fields = ['id', 'subido']


class InmuebleSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    propietario_nombre = serializers.CharField(
        source='propietario.get_full_name', read_only=True
    )
    multimedia = MultimediaSerializer(many=True, read_only=True)

    class Meta:
        model = Inmueble
        fields = '__all__'
        read_only_fields = ['id', 'creado', 'actualizado']


class InmuebleListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    imagen_principal = serializers.SerializerMethodField()

    class Meta:
        model = Inmueble
        fields = [
            'id', 'titulo', 'tipo_nombre', 'ciudad', 'zona',
            'precio', 'estado', 'habitaciones', 'banos',
            'imagen_principal', 'creado',
        ]

    def get_imagen_principal(self, obj):
        img = obj.multimedia.filter(es_principal=True).first()
        if img:
            return img.archivo.url
        return None


class TipoContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoContrato
        fields = '__all__'


class ContratoSerializer(serializers.ModelSerializer):
    inmueble_titulo = serializers.CharField(source='inmueble.titulo', read_only=True)
    inquilino_nombre = serializers.CharField(
        source='inquilino.get_full_name', read_only=True
    )
    tipo_contrato_nombre = serializers.CharField(
        source='tipo_contrato.nombre', read_only=True
    )

    class Meta:
        model = Contrato
        fields = '__all__'
        read_only_fields = ['id', 'creado']


class ComisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comision
        fields = '__all__'
        read_only_fields = ['id', 'fecha']
