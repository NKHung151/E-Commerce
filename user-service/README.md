# User Service

## Overview
The User Service handles user authentication, registration, and user management for the e-commerce platform.
It manages user roles (admin, staff, customer) and issues JWT tokens.

## Port
- **8001** (internal service port)
- Accessed via Nginx gateway at `http://localhost:8080/api/v1/`

## Database
- **MySQL** at `mysql:3306`
- Database: `mydb`
- Credentials: root/123456

## Models
- **User** (extends Django AbstractUser)
  - Fields: id, username, email (unique), password, role (admin/staff/customer), created_at, updated_at
  - Roles: admin, staff, customer

## API Endpoints

### Authentication
- `POST /api/v1/auth/register/` - User registration (AllowAny)
  - Body: `{"username": "...", "email": "...", "password": "...", "role": "customer"}`
  - Returns: User data
  
- `POST /api/v1/auth/login/` - Login & get tokens (AllowAny)
  - Body: `{"username": "...", "password": "..."}`
  - Returns: `{"access": "...", "refresh": "..."}`
  
- `POST /api/v1/auth/refresh/` - Refresh access token (AllowAny)
  - Body: `{"refresh": "..."}`
  - Returns: `{"access": "..."}`

### User Management
- `GET /api/v1/users/` - List all users (IsAdminRole)
  - Returns: Array of users
  
- `GET /api/v1/users/{id}/` - Get user by ID (IsAdminRole)
  - Returns: User data

## JWT Token Structure
The issued JWT tokens include:
- `user_id`: ID of the authenticated user
- `role`: User role (admin, staff, customer)
- `email`: User email
- `exp`: Expiration timestamp (1 hour)
- `iat`: Issued at timestamp
- `iss`: Issuer (ecommerce-user-service)

## Setup & Running

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Start server
python manage.py runserver 0.0.0.0:8001
```

### Docker
```bash
# Build image
docker build -t user-service .

# Run with Docker Compose
cd infrastructure
docker-compose up user-service
```

## Example Requests

### Register
```bash
curl -X POST http://localhost:8080/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "customer"
  }'
```

### Login
```bash
curl -X POST http://localhost:8080/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123!"
  }'
```

### List Users (Admin only)
```bash
curl -X GET http://localhost:8080/api/v1/users/ \
  -H "Authorization: Bearer <access_token>"
```

## Security
- Passwords are hashed using Django's default PBKDF2 algorithm
- JWT tokens are signed with shared secret key
- Token issuer must be 'ecommerce-user-service'
- Access tokens expire after 1 hour
- Refresh tokens expire after 7 days
