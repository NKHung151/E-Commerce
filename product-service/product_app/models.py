from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Product(models.Model):
    # Basic Info
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=50, unique=False, default='', help_text='Stock Keeping Unit - unique product code')
    description = models.TextField(blank=True)
    
    # Pricing & Inventory
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=5, decimal_places=2, default=0, 
                                   validators=[MinValueValidator(0), MaxValueValidator(100)],
                                   help_text='Discount percentage (0-100)')
    stock = models.IntegerField(default=0)
    
    # Media
    image_url = models.URLField(max_length=500, blank=True, default='', help_text='Primary product image URL')
    
    # Ratings & Status
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0,
                                validators=[MinValueValidator(0), MaxValueValidator(5)],
                                help_text='Average rating (0-5 stars)')
    is_available = models.BooleanField(default=True, help_text='Is product available for purchase')
    
    # Analytics
    views = models.IntegerField(default=0, help_text='Number of product views')
    
    # Relations & Timestamps
    category = models.IntegerField(null=True, blank=True, help_text='Category ID from catalog-service')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['category']), models.Index(fields=['sku'])]
        ordering = ['-views', '-created_at']

    def __str__(self):
        return f"{self.name} (SKU: {self.sku}) - ${self.price}"


class Book(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='book')
    author = models.CharField(max_length=255)
    publisher = models.CharField(max_length=255)
    isbn = models.CharField(max_length=20, unique=True)

    def __str__(self):
        return f"Book: {self.product.name} by {self.author}"


class Electronics(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='electronics')
    brand = models.CharField(max_length=100)
    warranty = models.IntegerField(help_text='Warranty in months')

    class Meta:
        verbose_name_plural = 'electronics'

    def __str__(self):
        return f"Electronics: {self.product.name} ({self.brand})"


class Fashion(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='fashion')
    size = models.CharField(max_length=10)
    color = models.CharField(max_length=50)

    def __str__(self):
        return f"Fashion: {self.product.name} ({self.color}, {self.size})"


class HomeLiving(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='home_living')
    material = models.CharField(max_length=100)
    dimensions = models.CharField(max_length=100, help_text='e.g. 120x60x75 cm')

    class Meta:
        verbose_name = 'Home & Living'
        verbose_name_plural = 'Home & Living'

    def __str__(self):
        return f"Home & Living: {self.product.name} ({self.material})"


class SportsOutdoors(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='sports_outdoors')
    sport_type = models.CharField(max_length=100)
    weight = models.CharField(max_length=50, help_text='e.g. 1.5 kg')

    class Meta:
        verbose_name = 'Sports & Outdoors'
        verbose_name_plural = 'Sports & Outdoors'

    def __str__(self):
        return f"Sports: {self.product.name} ({self.sport_type})"


class BeautyHealth(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='beauty_health')
    ingredient = models.CharField(max_length=255)
    volume = models.CharField(max_length=50, help_text='e.g. 200ml')

    class Meta:
        verbose_name = 'Beauty & Health'
        verbose_name_plural = 'Beauty & Health'

    def __str__(self):
        return f"Beauty: {self.product.name} ({self.volume})"


class ToysGames(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='toys_games')
    age_range = models.CharField(max_length=20, help_text='e.g. 3-8 years')
    players = models.CharField(max_length=20, help_text='e.g. 2-4 players')

    class Meta:
        verbose_name = 'Toys & Games'
        verbose_name_plural = 'Toys & Games'

    def __str__(self):
        return f"Toys: {self.product.name} (Age {self.age_range})"


class Automotive(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='automotive')
    vehicle_type = models.CharField(max_length=100, help_text='e.g. Car, Motorcycle, Truck')
    compatibility = models.CharField(max_length=255, help_text='Compatible vehicle models')

    class Meta:
        verbose_name_plural = 'automotive'

    def __str__(self):
        return f"Automotive: {self.product.name} ({self.vehicle_type})"


class FoodGrocery(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='food_grocery')
    expiry_days = models.IntegerField(help_text='Shelf life in days')
    weight = models.CharField(max_length=50, help_text='e.g. 500g')

    class Meta:
        verbose_name = 'Food & Grocery'
        verbose_name_plural = 'Food & Grocery'

    def __str__(self):
        return f"Food: {self.product.name} ({self.weight})"


class OfficeSupplies(models.Model):
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='office_supplies')
    pack_size = models.IntegerField(help_text='Number of items in pack')
    material = models.CharField(max_length=100)

    class Meta:
        verbose_name = 'Office Supplies'
        verbose_name_plural = 'Office Supplies'

    def __str__(self):
        return f"Office: {self.product.name} (Pack of {self.pack_size})"


class StockReservation(models.Model):
    order_id = models.IntegerField(unique=True)
    items_json = models.TextField()  # JSON string of product_id and quantity
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Stock reserved for Order {self.order_id}"
