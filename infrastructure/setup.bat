@echo off
REM ═══════════════════════════════════════════════════════════════════
REM E-COMMERCE MICROSERVICES - COMPLETE SETUP GUIDE (WINDOWS)
REM ═══════════════════════════════════════════════════════════════════
REM Hướng dẫn từng bước để khởi chạy toàn bộ hệ thống

setlocal enabledelayedexpansion

cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo   E-COMMERCE MICROSERVICES - SETUP GUIDE (WINDOWS)
echo ════════════════════════════════════════════════════════════════════
echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 0: Kiểm tra các công cụ cần thiết
REM ═══════════════════════════════════════════════════════════════════
echo.
echo 📋 BƯỚC 0: Kiểm tra các công cụ cần thiết
echo ─────────────────────────────────────────────────────────────────

echo Checking Docker...
docker --version
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop.
    pause
    exit /b 1
)
echo ✅ Docker found

echo.
echo Checking Docker Compose...
docker-compose --version
if %errorlevel% neq 0 (
    echo ❌ Docker Compose not found.
    pause
    exit /b 1
)
echo ✅ Docker Compose found

echo.
echo Checking MySQL...
mysql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MySQL CLI found
) else (
    echo ⚠️  MySQL CLI not found (Optional)
)

echo.
echo Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python not found
    pause
    exit /b 1
)
echo ✅ Python found
python --version

echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 1: Khởi tạo các Databases
REM ═══════════════════════════════════════════════════════════════════
cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo 📊 BƯỚC 1: Khởi tạo các Databases
echo ════════════════════════════════════════════════════════════════════

echo.
echo 🔹 Tạo MySQL Database...
echo CREATE DATABASE IF NOT EXISTS user_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | mysql -h localhost -u root -p123456 -v
if %errorlevel% equ 0 (
    echo ✅ MySQL database user_db created successfully
) else (
    echo ⚠️  MySQL database creation skipped (ensure MySQL is running)
)

echo.
echo 🔹 Tạo PostgreSQL Databases...
echo.
echo Tạo product_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS product_db;" 2>nul
echo Tạo catalog_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS catalog_db;" 2>nul
echo Tạo comment_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS comment_db;" 2>nul
echo Tạo cart_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS cart_db;" 2>nul
echo Tạo order_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS order_db;" 2>nul
echo Tạo payment_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS payment_db;" 2>nul
echo Tạo shipping_db...
psql -h localhost -U admin -c "CREATE DATABASE IF NOT EXISTS shipping_db;" 2>nul
echo ✅ PostgreSQL databases created (if PostgreSQL is running)

echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 2: Khởi chạy Docker Compose
REM ═══════════════════════════════════════════════════════════════════
cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo 🐳 BƯỚC 2: Khởi chạy Docker Compose
echo ════════════════════════════════════════════════════════════════════

cd /d "%~dp0infrastructure" || exit /b 1

echo.
echo 🚀 Khởi chạy tất cả services...
echo    (Xây dựng images, chạy migrations, khởi động services)
echo.

docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Error starting Docker Compose
    pause
    exit /b 1
)

echo ✅ Docker Compose started

echo.
echo 📋 Trạng thái containers:
docker-compose ps

echo.
echo ⏳ Đợi services khởi động (30 giây)...
timeout /t 30 /nobreak

echo.
echo ✓ Logs từ containers:
docker-compose logs --tail=15

echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 3: Kiểm tra Services
REM ═══════════════════════════════════════════════════════════════════
cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo 🔍 BƯỚC 3: Kiểm tra Services
echo ════════════════════════════════════════════════════════════════════

echo.
echo 🔹 Kiểm tra Gateway (Nginx) - http://localhost:8080
timeout /t 2 /nobreak

echo 🔹 Kiểm tra User Service - http://localhost:8001
timeout /t 2 /nobreak

echo 🔹 Kiểm tra Product Service - http://localhost:8002
timeout /t 2 /nobreak

echo.
echo Mở browser để kiểm tra:
echo   • API Gateway:      http://localhost:8080
echo   • User Service:     http://localhost:8001
echo   • Product Service:  http://localhost:8002
echo   • Cart Service:     http://localhost:8003
echo   • Order Service:    http://localhost:8004
echo   • Payment Service:  http://localhost:8005
echo   • Shipping Service: http://localhost:8006

echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 4: Hướng dẫn Insert Sample Data
REM ═══════════════════════════════════════════════════════════════════
cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo 📝 BƯỚC 4: Insert Sample Data (Thủ công)
echo ════════════════════════════════════════════════════════════════════

echo.
echo ℹ️  Các bảng đã được tạo tự động bằng Django migrate
echo    Để insert dữ liệu, hãy chạy SQL queries dưới đây:

echo.
echo ═══ OPTION 1: Dùng MySQL CLI ════════════════════════════════════
echo.
echo Cú pháp:
echo   mysql -h localhost -u root -p123456 -D user_db
echo.
echo Sau đó chạy INSERT queries...

echo.
echo ═══ OPTION 2: Dùng Django Shell ════════════════════════════════
echo.
echo docker exec user-service-1 python manage.py shell
echo.
echo from django.contrib.auth import get_user_model
echo User = get_user_model()
echo User.objects.create_user(
echo   username='customer1',
echo   email='customer1@example.com',
echo   password='password123',
echo   role='customer'
echo )

echo.
echo ═══ OPTION 3: Dùng Django Admin Tạo User ════════════════════════
echo.
echo docker exec -it user-service-1 python manage.py createsuperuser

echo.
echo ═══ OPTION 4: Dùng API Endpoint ════════════════════════════════
echo.
echo POST http://localhost:8080/api/v1/auth/register/
echo Content-Type: application/json
echo.
echo {
echo   "username": "customer1",
echo   "email": "customer1@example.com",
echo   "password": "password123",
echo   "role": "customer"
echo }

echo.
pause

REM ═══════════════════════════════════════════════════════════════════
REM BƯỚC 5: Thông tin tổng quát
REM ═══════════════════════════════════════════════════════════════════
cls
echo.
echo ════════════════════════════════════════════════════════════════════
echo ✅ SETUP HOÀN TẤT!
echo ════════════════════════════════════════════════════════════════════

echo.
echo 📌 TRẠNG THÁI HỆ THỐNG:
docker-compose ps

echo.
echo 🌐 GATEWAY ENDPOINTS:
echo    http://localhost:8080  - API Gateway
echo    http://localhost:8001  - User Service
echo    http://localhost:8002  - Product Service
echo    http://localhost:8003  - Cart Service
echo    http://localhost:8004  - Order Service
echo    http://localhost:8005  - Payment Service
echo    http://localhost:8006  - Shipping Service
echo    http://localhost:8008  - Catalog Service
echo    http://localhost:8009  - Comment-Rate Service

echo.
echo 📚 DANH SÁCH DATABASES:
echo    MySQL:
echo      • user_db (User Service)
echo    PostgreSQL:
echo      • product_db (Product Service)
echo      • catalog_db (Catalog Service)
echo      • comment_db (Comment-Rate Service)
echo      • cart_db (Cart Service)
echo      • order_db (Order Service)
echo      • payment_db (Payment Service)
echo      • shipping_db (Shipping Service)

echo.
echo 🛠️  LỆNH HỮU ÍCH:
echo    # Xem logs
echo    docker-compose logs -f
echo.
echo    # Xem logs của 1 service
echo    docker-compose logs -f user-service
echo.
echo    # Dừng services
echo    docker-compose down
echo.
echo    # Reset databases
echo    docker-compose down -v
echo.
echo    # Restart services
echo    docker-compose restart

echo.
echo 📖 XEM DOCUMENTATION:
echo    Xem file: PROJECT_DOCUMENTATION.md

echo.
echo ════════════════════════════════════════════════════════════════════
echo.
pause

