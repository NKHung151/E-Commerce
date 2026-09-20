from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Comment(models.Model):
    product_id = models.IntegerField(help_text="Product ID this comment is for")
    user_id = models.IntegerField(help_text="User ID of the reviewer")
    username = models.CharField(max_length=150, help_text="Username of the reviewer")
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating between 1 and 5 stars"
    )
    comment_text = models.TextField(help_text="Review/comment content")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['product_id']),
            models.Index(fields=['user_id']),
        ]

    def __str__(self):
        return f"User {self.username} rated product {self.product_id} with {self.rating} stars"
