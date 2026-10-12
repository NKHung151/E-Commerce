from django.db import models


class Shipment(models.Model):
    STATUS_CHOICES = [
        ('pending_payment', 'Pending Payment'),
        ('processing', 'Processing'),
        ('shipping', 'Shipping'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    order_id = models.IntegerField(unique=True, db_index=True)
    address = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='processing')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['order_id'])]

    def __str__(self):
        return f"Shipment for Order {self.order_id} - {self.status}"
