import requests
from django.conf import settings
from rest_framework import serializers
from .models import (
    Product, Book, Electronics, Fashion,
    HomeLiving, SportsOutdoors, BeautyHealth, ToysGames,
    Automotive, FoodGrocery, OfficeSupplies
)


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.SerializerMethodField()
    details = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'name', 'sku', 'description', 'price', 'discount', 'stock',
            'image_url', 'rating', 'is_available', 'views',
            'category', 'category_name', 'details', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'views', 'created_at', 'updated_at')

    def get_category_name(self, obj):
        if not obj.category:
            return ""
        try:
            resp = requests.get(f"{settings.CATALOG_SERVICE_URL}/api/v1/categories/{obj.category}/", timeout=2)
            if resp.status_code == 200:
                return resp.json().get('name', '')
        except Exception:
            pass
        return ""

    def get_details(self, obj):
        for rel in ['book', 'electronics', 'fashion', 'home_living', 'sports_outdoors', 
                    'beauty_health', 'toys_games', 'automotive', 'food_grocery', 'office_supplies']:
            if hasattr(obj, rel):
                try:
                    related_obj = getattr(obj, rel)
                    if related_obj:
                        data = {}
                        for field in related_obj._meta.fields:
                            if field.name not in ['id', 'product', 'product_id']:
                                data[field.name] = getattr(related_obj, field.name)
                        return data
                except Exception:
                    pass
        return {}

    def update(self, instance, validated_data):
        details = self.initial_data.get('details')
        instance = super().update(instance, validated_data)
        
        if details and isinstance(details, dict):
            for rel in ['book', 'electronics', 'fashion', 'home_living', 'sports_outdoors', 
                        'beauty_health', 'toys_games', 'automotive', 'food_grocery', 'office_supplies']:
                if hasattr(instance, rel):
                    try:
                        related_obj = getattr(instance, rel)
                        if related_obj:
                            for key, val in details.items():
                                if hasattr(related_obj, key):
                                    setattr(related_obj, key, val)
                            related_obj.save()
                            break
                    except Exception:
                        pass
        return instance


class BookSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = Book
        fields = ('id', 'product', 'author', 'publisher', 'isbn')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        book = Book.objects.create(product=product, **validated_data)
        return book


class ElectronicsSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = Electronics
        fields = ('id', 'product', 'brand', 'warranty')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        electronics = Electronics.objects.create(product=product, **validated_data)
        return electronics


class FashionSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = Fashion
        fields = ('id', 'product', 'size', 'color')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        fashion = Fashion.objects.create(product=product, **validated_data)
        return fashion


class HomeLivingSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = HomeLiving
        fields = ('id', 'product', 'material', 'dimensions')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = HomeLiving.objects.create(product=product, **validated_data)
        return item


class SportsOutdoorsSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = SportsOutdoors
        fields = ('id', 'product', 'sport_type', 'weight')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = SportsOutdoors.objects.create(product=product, **validated_data)
        return item


class BeautyHealthSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = BeautyHealth
        fields = ('id', 'product', 'ingredient', 'volume')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = BeautyHealth.objects.create(product=product, **validated_data)
        return item


class ToysGamesSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = ToysGames
        fields = ('id', 'product', 'age_range', 'players')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = ToysGames.objects.create(product=product, **validated_data)
        return item


class AutomotiveSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = Automotive
        fields = ('id', 'product', 'vehicle_type', 'compatibility')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = Automotive.objects.create(product=product, **validated_data)
        return item


class FoodGrocerySerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = FoodGrocery
        fields = ('id', 'product', 'expiry_days', 'weight')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = FoodGrocery.objects.create(product=product, **validated_data)
        return item


class OfficeSuppliesSerializer(serializers.ModelSerializer):
    product = ProductSerializer()

    class Meta:
        model = OfficeSupplies
        fields = ('id', 'product', 'pack_size', 'material')
        read_only_fields = ('id',)

    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        item = OfficeSupplies.objects.create(product=product, **validated_data)
        return item
