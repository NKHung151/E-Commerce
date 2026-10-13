"""Seed the demo customers user03..user550 (ids 3-550).

The AI service's behaviour log (ai-service/data/user_behavior.csv) belongs to these
user ids, so logging in as one of them shows personalised recommendations; the
seeded reviews are signed with the same usernames. Ids 1-2 are the admin and staff
accounts from 0002. Any id, username or email that already exists is skipped.
"""
import random
from datetime import datetime, timezone

from decouple import config
from django.contrib.auth.hashers import make_password
from django.core.management.color import no_style
from django.db import migrations

FIRST_ID, LAST_ID = 3, 550
LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý']
FIRST_NAMES = ['An', 'Bình', 'Chi', 'Dung', 'Giang', 'Hà', 'Hải', 'Hạnh', 'Hiếu', 'Hoa', 'Hùng', 'Huy', 'Khánh', 'Lan',
               'Linh', 'Long', 'Mai', 'Minh', 'My', 'Nam', 'Ngọc', 'Nhung', 'Phong', 'Phương', 'Quân', 'Quỳnh', 'Sơn',
               'Tâm', 'Thảo', 'Thành', 'Trang', 'Trung', 'Tú', 'Tuấn', 'Vy', 'Yến']


def seed_customers(apps, schema_editor):
    User = apps.get_model('user_app', 'User')
    taken_ids = set(User.objects.values_list('id', flat=True))
    taken_usernames = set(User.objects.values_list('username', flat=True))
    taken_emails = set(User.objects.values_list('email', flat=True))

    rng = random.Random(550)
    # One hash for every demo account: hashing 548 passwords separately takes minutes.
    password = make_password(config('SEED_CUSTOMER_PASSWORD', default='customer123'))
    customers = []
    for pk in range(FIRST_ID, LAST_ID + 1):
        username, email = f'user{pk:02d}', f'user{pk:02d}@example.com'
        joined = datetime(2024, rng.randint(1, 12), rng.randint(1, 28), 8, tzinfo=timezone.utc)
        if pk in taken_ids or username in taken_usernames or email in taken_emails:
            continue
        customers.append(User(
            id=pk, username=username, email=email, password=password, role='customer',
            first_name=rng.choice(FIRST_NAMES), last_name=rng.choice(LAST_NAMES),
            is_active=True, date_joined=joined,
        ))
    User.objects.bulk_create(customers, batch_size=200)
    # MySQL moves AUTO_INCREMENT past explicit ids itself; PostgreSQL needs this.
    with schema_editor.connection.cursor() as cursor:
        for sql in schema_editor.connection.ops.sequence_reset_sql(no_style(), [User]):
            cursor.execute(sql)


class Migration(migrations.Migration):

    dependencies = [
        ('user_app', '0002_seed_admin_staff'),
    ]

    operations = [
        migrations.RunPython(seed_customers, migrations.RunPython.noop),
    ]
