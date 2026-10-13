from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comment_app', '0002_seed_reviews'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='comment',
            constraint=models.UniqueConstraint(fields=('user_id', 'product_id'), name='uniq_review_per_user_product'),
        ),
    ]
