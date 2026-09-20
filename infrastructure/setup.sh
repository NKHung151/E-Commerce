#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# E-COMMERCE MICROSERVICES - COMPLETE SETUP GUIDE
# ═══════════════════════════════════════════════════════════════════
# Hướng dẫn từng bước để khởi chạy toàn bộ hệ thống

echo "════════════════════════════════════════════════════════════════════"
echo "  E-COMMERCE MICROSERVICES - SETUP GUIDE"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 0: Kiểm tra các công cụ cần thiết
# ═══════════════════════════════════════════════════════════════════
echo "📋 BƯỚC 0: Kiểm tra các công cụ cần thiết"
echo "─────────────────────────────────────────────────────────────────"

echo "✓ Kiểm tra Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker không được cài đặt"
    exit 1
fi
echo "✅ Docker: $(docker --version)"

echo ""
echo "✓ Kiểm tra Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose không được cài đặt"
    exit 1
fi
echo "✅ Docker Compose: $(docker-compose --version)"

echo ""
echo "✓ Kiểm tra MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL CLI không được cài đặt (có thể dùng docker mysql client)"
else
    echo "✅ MySQL: $(mysql --version)"
fi

echo ""
echo "✓ Kiểm tra PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL CLI không được cài đặt"
else
    echo "✅ PostgreSQL: $(psql --version)"
fi

echo ""
echo "✓ Kiểm tra Python..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 không được cài đặt"
    exit 1
fi
echo "✅ Python: $(python3 --version)"

echo ""
read -p "Nhấn Enter để tiếp tục..."

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 1: Khởi tạo các Databases
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "📊 BƯỚC 1: Khởi tạo các Databases"
echo "════════════════════════════════════════════════════════════════════"

echo ""
echo "🔹 Tạo MySQL Database..."
mysql -h localhost -u root -p123456 << EOF
CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES LIKE 'user_db';
EOF

if [ $? -eq 0 ]; then
    echo "✅ MySQL database user_db tạo thành công"
else
    echo "⚠️  Lỗi tạo MySQL database - Tiếp tục với DB khác"
fi

echo ""
echo "🔹 Tạo PostgreSQL Databases..."
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS product_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS catalog_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS comment_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS cart_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS order_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS payment_db;" 2>/dev/null
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS shipping_db;" 2>/dev/null

psql -h localhost -U admin -c "\l" | grep -E "product_db|catalog_db|comment_db|cart_db|order_db|payment_db|shipping_db"

if [ $? -eq 0 ]; then
    echo "✅ PostgreSQL databases tạo thành công"
else
    echo "⚠️  Lỗi tạo PostgreSQL databases"
fi

echo ""
read -p "Nhấn Enter để tiếp tục..."

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 2: Khởi chạy Docker Compose
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "🐳 BƯỚC 2: Khởi chạy Docker Compose"
echo "════════════════════════════════════════════════════════════════════"

echo ""
echo "📍 Thay đổi thư mục sang infrastructure..."
cd "$(dirname "${BASH_SOURCE[0]}")/infrastructure" || exit 1

echo "🚀 Khởi chạy tất cả services..."
echo "   (Chức năng: Xây dựng images, chạy migrations, khởi động services)"
echo ""

docker-compose up -d

# Kiểm tra status
echo ""
echo "✓ Kiểm tra trạng thái containers..."
docker-compose ps

echo ""
echo "⏳ Đợi services khởi động (30 giây)..."
sleep 30

echo ""
echo "✓ Kiểm tra logs..."
docker-compose logs --tail=20

echo ""
read -p "Nhấn Enter để tiếp tục..."

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 3: Kiểm tra Services
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "🔍 BƯỚC 3: Kiểm tra Services"
echo "════════════════════════════════════════════════════════════════════"

echo ""
echo "🔹 Kiểm tra Gateway (Nginx)..."
curl -s http://localhost:8080/health || echo "❌ Gateway chưa sẵn sàng"

echo ""
echo "🔹 Kiểm tra User Service..."
curl -s http://localhost:8001/health || echo "❌ User Service chưa sẵn sàng"

echo ""
echo "🔹 Kiểm tra Product Service..."
curl -s http://localhost:8002/health || echo "❌ Product Service chưa sẵn sàng"

echo ""
read -p "Nhấn Enter để tiếp tục..."

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 4: Insert Sample Data
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "📝 BƯỚC 4: Insert Sample Data (Thủ công)"
echo "════════════════════════════════════════════════════════════════════"

echo ""
echo "ℹ️  Để insert sample data, chạy các lệnh sau:"
echo ""
echo "═══ MYSQL (Users) ═══════════════════════════════════════════════"
echo "mysql -h localhost -u root -p123456 -D user_db << 'EOF'"
echo "INSERT IGNORE INTO auth_user (username, email, password, first_name, last_name, is_staff, is_superuser, role, is_active, date_joined, created_at, updated_at)"
echo "VALUES"
echo "('admin', 'admin@ecommerce.com', 'pbkdf2_sha256\$260000\$abcd\$hashedpass', 'Admin', 'User', 1, 1, 'admin', 1, NOW(), NOW(), NOW()),"
echo "('customer1', 'customer1@example.com', 'pbkdf2_sha256\$260000\$abcd\$hashedpass', 'John', 'Doe', 0, 0, 'customer', 1, NOW(), NOW(), NOW());"
echo "EOF"

echo ""
echo "═══ POSTGRESQL (Products) ═══════════════════════════════════════════"
echo "psql -h localhost -U admin -d product_db"
echo "# Chạy SQL queries từ insert-sample-data.sql"

echo ""
echo "⚠️  Hoặc dùng Django API để tạo users an toàn hơn:"
echo "docker exec <user-service-container-id> python manage.py createsuperuser"

echo ""
read -p "Nhấn Enter để kết thúc..."

# ═══════════════════════════════════════════════════════════════════
# BƯỚC 5: Hướng dẫn tiếp theo
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo "✅ SETUP HOÀN TẤT!"
echo "════════════════════════════════════════════════════════════════════"

echo ""
echo "📌 TRẠNG THÁI HỆ THỐNG:"
docker-compose ps

echo ""
echo "🌐 GATEWAY ENDPOINTS:"
echo "   http://localhost:8080  - API Gateway"
echo "   http://localhost:8001  - User Service"
echo "   http://localhost:8002  - Product Service"
echo "   http://localhost:8003  - Cart Service"
echo "   http://localhost:8004  - Order Service"
echo "   http://localhost:8005  - Payment Service"
echo "   http://localhost:8006  - Shipping Service"
echo "   http://localhost:8008  - Catalog Service"
echo "   http://localhost:8009  - Comment-Rate Service"

echo ""
echo "📚 DANH SÁCH DATABASE:"
echo "   MySQL:"
echo "     • user_db (User Service)"
echo "   PostgreSQL:"
echo "     • product_db (Product Service)"
echo "     • catalog_db (Catalog Service)"
echo "     • comment_db (Comment-Rate Service)"
echo "     • cart_db (Cart Service)"
echo "     • order_db (Order Service)"
echo "     • payment_db (Payment Service)"
echo "     • shipping_db (Shipping Service)"

echo ""
echo "🛠️  LỆNH HỮU ÍCH:"
echo "   # Xem logs"
echo "   docker-compose logs -f"
echo ""
echo "   # Xem logs của 1 service"
echo "   docker-compose logs -f user-service"
echo ""
echo "   # Dừng services"
echo "   docker-compose down"
echo ""
echo "   # Reset databases (xóa dữ liệu)"
echo "   docker-compose down -v"
echo ""
echo "   # Truy cập MySQL"
echo "   mysql -h localhost -u root -p123456 -D user_db"
echo ""
echo "   # Truy cập PostgreSQL"
echo "   psql -h localhost -U admin -d product_db"

echo ""
echo "📖 XEM DOCUMENTATION:"
echo "   Xem file: PROJECT_DOCUMENTATION.md"

echo ""
echo "════════════════════════════════════════════════════════════════════"

