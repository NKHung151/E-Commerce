from rest_framework import serializers
from .models import Shipment


class ShipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = ('id', 'order_id', 'address', 'status', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
