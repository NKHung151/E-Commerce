from django.db import models
from django.utils import timezone


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]
    order_id = models.IntegerField(unique=True, db_index=True)
    # Owner of the order; null for payments created before this field existed.
    user_id = models.IntegerField(null=True, blank=True, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    paid_at = models.DateTimeField(null=True, blank=True)
    items_json = models.TextField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    payment_method = models.CharField(max_length=50, default='card')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=['order_id'])]

    def __str__(self):
        return f"Payment for Order {self.order_id} - {self.status}"
