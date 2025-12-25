#!/bin/bash

echo "========================================"
echo "    راه‌اندازی سیستم تدبیرخوان"
echo "========================================"

# بررسی پیش‌نیازها
echo
echo "مرحله 1: بررسی پیش‌نیازها..."

if ! command -v node &> /dev/null; then
    echo "خطا: Node.js نصب نشده است"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "خطا: npm نصب نشده است"
    exit 1
fi

echo "✓ Node.js و npm نصب شده‌اند"

# نصب dependencies
echo
echo "مرحله 2: نصب dependencies..."

echo "نصب dependencies برای shared..."
cd shared && npm install
if [ $? -ne 0 ]; then
    echo "خطا در نصب dependencies برای shared"
    exit 1
fi
cd ..

echo "نصب dependencies برای services..."
services=("auth" "user-management" "menu-management" "order-management" "notification" "reporting" "payment" "api-gateway")

for service in "${services[@]}"; do
    echo "نصب dependencies برای $service..."
    cd "services/$service" && npm install
    if [ $? -ne 0 ]; then
        echo "خطا در نصب dependencies برای $service"
        exit 1
    fi
    cd ../..
done

echo "نصب dependencies برای frontend..."
cd frontend && npm install
if [ $? -ne 0 ]; then
    echo "خطا در نصب dependencies برای frontend"
    exit 1
fi
cd ..

echo "✓ تمام dependencies نصب شدند"

# بررسی فایل‌های .env
echo
echo "مرحله 3: بررسی فایل‌های .env..."

if [ ! -f "shared/.env" ]; then
    echo "ایجاد فایل .env برای shared..."
    cat > shared/.env << EOF
DATABASE_URL=postgresql://tadbir_user:password@localhost:5432/tadbir_khowan
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
ENCRYPTION_KEY=your_32_character_encryption_key
NODE_ENV=development
EOF
fi

if [ ! -f "services/api-gateway/.env" ]; then
    echo "ایجاد فایل .env برای API Gateway..."
    cat > services/api-gateway/.env << EOF
PORT=3000
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
MENU_SERVICE_URL=http://localhost:3003
ORDER_SERVICE_URL=http://localhost:3004
NOTIFICATION_SERVICE_URL=http://localhost:3005
REPORTING_SERVICE_URL=http://localhost:3006
PAYMENT_SERVICE_URL=http://localhost:3007
REDIS_URL=redis://localhost:6379
EOF
fi

if [ ! -f "frontend/.env" ]; then
    echo "ایجاد فایل .env برای Frontend..."
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=تدبیرخوان
EOF
fi

echo "✓ فایل‌های .env بررسی شدند"

# راه‌اندازی services
echo
echo "مرحله 4: راه‌اندازی services..."

# Function to start service in background
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo "در حال راه‌اندازی $service_name..."
    cd "$service_path"
    npm run dev > "../logs/${service_name}.log" 2>&1 &
    echo $! > "../logs/${service_name}.pid"
    cd - > /dev/null
    sleep 2
}

# ایجاد پوشه logs
mkdir -p logs

# راه‌اندازی services
start_service "API Gateway" "services/api-gateway" 3000
start_service "Auth Service" "services/auth" 3001
start_service "User Service" "services/user-management" 3002
start_service "Menu Service" "services/menu-management" 3003
start_service "Order Service" "services/order-management" 3004
start_service "Notification Service" "services/notification" 3005
start_service "Reporting Service" "services/reporting" 3006
start_service "Payment Service" "services/payment" 3007

echo "در حال راه‌اندازی Frontend..."
cd frontend
npm run dev > "../logs/frontend.log" 2>&1 &
echo $! > "../logs/frontend.pid"
cd ..

echo
echo "========================================"
echo "    سیستم تدبیرخوان راه‌اندازی شد!"
echo "========================================"
echo
echo "آدرس‌های مهم:"
echo "Frontend: http://localhost:3000"
echo "API Gateway: http://localhost:3000/api"
echo
echo "لطفاً چند ثانیه صبر کنید تا تمام services راه‌اندازی شوند..."
echo
echo "برای مشاهده logs:"
echo "tail -f logs/[service-name].log"
echo
echo "برای توقف سیستم:"
echo "./stop-dev.sh"
echo

# ایجاد اسکریپت توقف
cat > stop-dev.sh << 'EOF'
#!/bin/bash

echo "توقف سیستم تدبیرخوان..."

if [ -d "logs" ]; then
    for pidfile in logs/*.pid; do
        if [ -f "$pidfile" ]; then
            pid=$(cat "$pidfile")
            if kill -0 "$pid" 2>/dev/null; then
                echo "توقف process $pid..."
                kill "$pid"
            fi
            rm "$pidfile"
        fi
    done
fi

echo "تمام services متوقف شدند."
EOF

chmod +x stop-dev.sh

echo "سیستم آماده استفاده است!"