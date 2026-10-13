"""Seed reviews written by customers who bought the product (comment_app/seed/reviews.json).

Generated from the AI service's behaviour log by infrastructure/seed/generate_seed_data.py;
the products' seeded `rating` is the Bayesian average of exactly these reviews.
Skipped when the table already holds reviews.
"""
import json
from datetime import datetime, timezone
from pathlib import Path

from django.db import migrations

SEED_FILE = Path(__file__).resolve().parent.parent / 'seed' / 'reviews.json'


def seed_reviews(apps, schema_editor):
    Comment = apps.get_model('comment_app', 'Comment')
    if Comment.objects.exists():
        return
    rows = json.loads(SEED_FILE.read_text(encoding='utf-8'))
    created = Comment.objects.bulk_create([
        Comment(product_id=r['product_id'], user_id=r['user_id'], username=r['username'],
                rating=r['rating'], comment_text=r['comment_text'])
        for r in rows
    ])
    # created_at is auto_now_add, so the review dates are written afterwards.
    for comment, r in zip(created, rows):
        stamp = datetime.fromisoformat(r['created_at']).replace(tzinfo=timezone.utc)
        Comment.objects.filter(pk=comment.pk).update(created_at=stamp, updated_at=stamp)


class Migration(migrations.Migration):

    dependencies = [
        ('comment_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_reviews, migrations.RunPython.noop),
    ]
