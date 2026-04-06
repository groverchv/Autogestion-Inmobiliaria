from rest_framework import serializers
from .models import TipoInmueble, Inmueble, Multimedia, TipoContrato, Contrato, Comision, Favorito


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
        read_only_fields = ['id', 'propietario', 'creado', 'actualizado']


class InmuebleListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    is_favorito = serializers.SerializerMethodField()
    imagen_principal = serializers.SerializerMethodField()

    class Meta:
        model = Inmueble
        fields = [
            'id', 'titulo', 'tipo_nombre', 'ciudad', 'zona',
            'precio', 'estado', 'habitaciones', 'banos',
            'imagen_principal', 'creado', 'is_favorito',
        ]

    def get_is_favorito(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        # Verificación directa por ID para evitar problemas de LazyObjects
        return Favorito.objects.filter(usuario_id=request.user.id, inmueble_id=obj.id).exists()

    def get_imagen_principal(self, obj):
        try:
            img = obj.multimedia.filter(es_principal=True).first()
            if not img:
                img = obj.multimedia.first()
            
            if img and img.archivo:
                return img.archivo
        except Exception:
            pass
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


class FavoritoSerializer(serializers.ModelSerializer):
    inmueble_data = InmuebleListSerializer(source='inmueble', read_only=True)

    class Meta:
        model = Favorito
        fields = ['id', 'inmueble', 'inmueble_data', 'creado']
        read_only_fields = ['id', 'creado']
