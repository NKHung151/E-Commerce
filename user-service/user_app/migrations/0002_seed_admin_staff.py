"""Seed one admin and one staff account when the database is migrated.

Self-registration (/auth/register/) always creates customers, so back-office
accounts come from here. Credentials can be overridden through the environment;
an existing account (same username or email) is left untouched, so re-running
migrations never resets a password that was changed later.
"""
from decouple import config
from django.contrib.auth.hashers import make_password
from django.db import migrations
from django.db.models import Q


SEED_ACCOUNTS = [
    {
        'role': 'admin',
        'username': config('SEED_ADMIN_USERNAME', default='admin_user'),
        'email': config('SEED_ADMIN_EMAIL', default='admin@ecommerce.com'),
        'password': config('SEED_ADMIN_PASSWORD', default='admin123'),
        # Admin may also log into Django's /admin/ site.
        'is_staff': True,
        'is_superuser': True,
    },
    {
        'role': 'staff',
        'username': config('SEED_STAFF_USERNAME', default='staff_user'),
        'email': config('SEED_STAFF_EMAIL', default='staff@ecommerce.com'),
        'password': config('SEED_STAFF_PASSWORD', default='staff123'),
        'is_staff': False,
        'is_superuser': False,
    },
]


def seed_accounts(apps, schema_editor):
    User = apps.get_model('user_app', 'User')
    for account in SEED_ACCOUNTS:
        if User.objects.filter(Q(username=account['username']) | Q(email=account['email'])).exists():
            continue
        User.objects.create(
            username=account['username'],
            email=account['email'],
            password=make_password(account['password']),
            role=account['role'],
            is_staff=account['is_staff'],
            is_superuser=account['is_superuser'],
            is_active=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('user_app', '0001_initial'),
    ]

    operations = [
        # Reverse is a no-op: never delete accounts that may already be in use.
        migrations.RunPython(seed_accounts, migrations.RunPython.noop),
    ]
