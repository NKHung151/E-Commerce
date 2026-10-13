"""Seed the ten shop categories with fixed ids.

product-service's seeded products reference these ids (Product.category), and the
storefront maps the names to icons and Vietnamese labels. Existing rows are kept.
"""
from django.core.management.color import no_style
from django.db import migrations

CATEGORIES = [
    (1, 'Books'),
    (2, 'Electronics'),
    (3, 'Fashion'),
    (4, 'Home & Living'),
    (5, 'Sports & Outdoors'),
    (6, 'Beauty & Health'),
    (7, 'Toys & Games'),
    (8, 'Automotive'),
    (9, 'Food & Grocery'),
    (10, 'Office Supplies'),
]


def seed_categories(apps, schema_editor):
    Category = apps.get_model('catalog_app', 'Category')
    taken_ids = set(Category.objects.values_list('id', flat=True))
    taken_names = set(Category.objects.values_list('name', flat=True))
    Category.objects.bulk_create([
        Category(id=pk, name=name) for pk, name in CATEGORIES
        if pk not in taken_ids and name not in taken_names
    ])
    # Explicit ids do not advance the PostgreSQL sequence: move it past them.
    with schema_editor.connection.cursor() as cursor:
        for sql in schema_editor.connection.ops.sequence_reset_sql(no_style(), [Category]):
            cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('catalog_app', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_categories, migrations.RunPython.noop),
    ]
