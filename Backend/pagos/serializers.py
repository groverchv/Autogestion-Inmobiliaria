from rest_framework import serializers
from .models import TipoPago, Pago, DetallePago, HistorialPago, TipoPlan, Plan


class TipoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPago
        fields = '__all__'


class DetallePagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetallePago
        fields = '__all__'
        read_only_fields = ['id']


class PagoSerializer(serializers.ModelSerializer):
    tipo_pago_nombre = serializers.CharField(source='tipo_pago.nombre', read_only=True)
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)
    detalles = DetallePagoSerializer(many=True, read_only=True)

    class Meta:
        model = Pago
        fields = '__all__'
        read_only_fields = ['id', 'creado']


class HistorialPagoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='usuario.get_full_name', read_only=True)

    class Meta:
        model = HistorialPago
        fields = '__all__'
        read_only_fields = ['id', 'fecha']


class TipoPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoPlan
        fields = '__all__'


class PlanSerializer(serializers.ModelSerializer):
    tipo_plan_nombre = serializers.CharField(source='tipo_plan.nombre', read_only=True)

    class Meta:
        model = Plan
        fields = '__all__'
        read_only_fields = ['id', 'creado']
