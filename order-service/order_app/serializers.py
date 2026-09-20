from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('id', 'product_id', 'quantity', 'unit_price', 'created_at')
        read_only_fields = ('id', 'created_at')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'user_id', 'total_price', 'status', 'address', 'payment_method', 'items', 'created_at', 'updated_at')
        read_only_fields = ('id', 'user_id', 'created_at', 'updated_at')
