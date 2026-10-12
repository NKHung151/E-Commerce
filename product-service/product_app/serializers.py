import logging
import requests
from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import serializers
from .models import (
    Product, Book, Electronics, Fashion,
    HomeLiving, SportsOutdoors, BeautyHealth, ToysGames,
    Automotive, FoodGrocery, OfficeSupplies
)

logger = logging.getLogger(__name__)

# Reverse one-to-one relations from Product to its category-specific detail model.
DETAIL_RELATIONS = (
    'book', 'electronics', 'fashion', 'home_living', 'sports_outdoors',
    'beauty_health', 'toys_games', 'automotive', 'food_grocery', 'office_supplies',
)

CATEGORY_NAME_CACHE_TTL = 300
CATEGORY_NAME_FAILURE_TTL = 30


def get_detail_object(product):
    """Return the category-specific detail row of a product, or None."""
    for rel in DETAIL_RELATIONS:
        try:
            return getattr(product, rel)
        except ObjectDoesNotExist:
            continue
    return None


def fetch_category_name(category_id):
    """Resolve a category name from catalog-service, cached to avoid one HTTP call per product."""
    cache_key = f'catalog:category_name:{category_id}'
    name = cache.get(cache_key)
    if name is not None:
        return name
    try:
        resp = requests.get(f"{settings.CATALOG_SERVICE_URL}/api/v1/categories/{category_id}/", timeout=2)
        if resp.status_code == 200:
            name = resp.json().get('name', '')
            cache.set(cache_key, name, CATEGORY_NAME_CACHE_TTL)
            return name
    except requests.RequestException as e:
        logger.warning(f'[product-service] Could not reach catalog-service: {e}')
    # Short negative cache so an unavailable catalog-service is not hammered.
    cache.set(cache_key, '', CATEGORY_NAME_FAILURE_TTL)
    return ''


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

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('Stock cannot be negative')
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError('Price cannot be negative')
        return value

    def get_category_name(self, obj):
        if not obj.category:
            return ""
        return fetch_category_name(obj.category)

    def get_details(self, obj):
        detail = get_detail_object(obj)
        if detail is None:
            return {}
        return {
            field.name: getattr(detail, field.name)
            for field in detail._meta.fields
            if field.name not in ('id', 'product')
        }

    @transaction.atomic
    def update(self, instance, validated_data):
        details = self.initial_data.get('details')
        instance = super().update(instance, validated_data)

        if details and isinstance(details, dict):
            detail = get_detail_object(instance)
            if detail is not None:
                editable = {f.name for f in detail._meta.fields if f.name not in ('id', 'product')}
                for key, val in details.items():
                    if key in editable:
                        setattr(detail, key, val)
                detail.save()
        return instance


class ProductDetailSerializer(serializers.ModelSerializer):
    """Base serializer for category-specific models nesting a writable Product."""
    product = ProductSerializer()

    @transaction.atomic
    def create(self, validated_data):
        product_data = validated_data.pop('product')
        product = Product.objects.create(**product_data)
        return self.Meta.model.objects.create(product=product, **validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        product_data = validated_data.pop('product', None)
        if product_data:
            for key, val in product_data.items():
                setattr(instance.product, key, val)
            instance.product.save()
        return super().update(instance, validated_data)


class BookSerializer(ProductDetailSerializer):
    class Meta:
        model = Book
        fields = ('id', 'product', 'author', 'publisher', 'isbn')
        read_only_fields = ('id',)


class ElectronicsSerializer(ProductDetailSerializer):
    class Meta:
        model = Electronics
        fields = ('id', 'product', 'brand', 'warranty')
        read_only_fields = ('id',)


class FashionSerializer(ProductDetailSerializer):
    class Meta:
        model = Fashion
        fields = ('id', 'product', 'size', 'color')
        read_only_fields = ('id',)


class HomeLivingSerializer(ProductDetailSerializer):
    class Meta:
        model = HomeLiving
        fields = ('id', 'product', 'material', 'dimensions')
        read_only_fields = ('id',)


class SportsOutdoorsSerializer(ProductDetailSerializer):
    class Meta:
        model = SportsOutdoors
        fields = ('id', 'product', 'sport_type', 'weight')
        read_only_fields = ('id',)


class BeautyHealthSerializer(ProductDetailSerializer):
    class Meta:
        model = BeautyHealth
        fields = ('id', 'product', 'ingredient', 'volume')
        read_only_fields = ('id',)


class ToysGamesSerializer(ProductDetailSerializer):
    class Meta:
        model = ToysGames
        fields = ('id', 'product', 'age_range', 'players')
        read_only_fields = ('id',)


class AutomotiveSerializer(ProductDetailSerializer):
    class Meta:
        model = Automotive
        fields = ('id', 'product', 'vehicle_type', 'compatibility')
        read_only_fields = ('id',)


class FoodGrocerySerializer(ProductDetailSerializer):
    class Meta:
        model = FoodGrocery
        fields = ('id', 'product', 'expiry_days', 'weight')
        read_only_fields = ('id',)


class OfficeSuppliesSerializer(ProductDetailSerializer):
    class Meta:
        model = OfficeSupplies
        fields = ('id', 'product', 'pack_size', 'material')
        read_only_fields = ('id',)
