"""Seed the demo catalogue (product_app/seed/products.json, 300 products).

Ids are fixed because the AI service's behaviour log and the seeded reviews refer
to them; the file is produced by infrastructure/seed/generate_seed_data.py.
Products that already exist (same id) are left untouched.
"""
import json
from pathlib import Path

from django.core.management.color import no_style
from django.db import migrations

SEED_FILE = Path(__file__).resolve().parent.parent / 'seed' / 'products.json'

DETAIL_MODELS = {
    'book': 'Book',
    'electronics': 'Electronics',
    'fashion': 'Fashion',
    'home_living': 'HomeLiving',
    'sports_outdoors': 'SportsOutdoors',
    'beauty_health': 'BeautyHealth',
    'toys_games': 'ToysGames',
    'automotive': 'Automotive',
    'food_grocery': 'FoodGrocery',
    'office_supplies': 'OfficeSupplies',
}
PRODUCT_FIELDS = ('id', 'name', 'sku', 'description', 'price', 'discount', 'stock', 'rating', 'views', 'category')


def seed_products(apps, schema_editor):
    Product = apps.get_model('product_app', 'Product')
    rows = json.loads(SEED_FILE.read_text(encoding='utf-8'))
    existing = set(Product.objects.values_list('id', flat=True))
    rows = [r for r in rows if r['id'] not in existing]

    Product.objects.bulk_create([Product(**{f: r[f] for f in PRODUCT_FIELDS}) for r in rows])
    details = {}
    for r in rows:
        details.setdefault(r['detail_type'], []).append(r)
    for relation, items in details.items():
        model = apps.get_model('product_app', DETAIL_MODELS[relation])
        model.objects.bulk_create([model(product_id=r['id'], **r['details']) for r in items])

    # Explicit ids do not advance the PostgreSQL sequence: move it past them so
    # products created later from the back office get fresh ids.
    with schema_editor.connection.cursor() as cursor:
        for sql in schema_editor.connection.ops.sequence_reset_sql(no_style(), [Product]):
            cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('product_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_products, migrations.RunPython.noop),
    ]
