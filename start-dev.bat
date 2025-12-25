@echo off
echo ========================================
echo    راه‌اندازی سیستم تدبیرخوان
echo ========================================

echo.
echo مرحله 1: بررسی پیش‌نیازها...
node --version >nul 2>&1
if errorlevel 1 (
    echo خطا: Node.js نصب نشده است
    pause
    exit /b 1
)

npm --version >nul 2>&1
if errorlevel 1 (
    echo خطا: npm نصب نشده است
    pause
    exit /b 1
)

echo ✓ Node.js و npm نصب شده‌اند

echo.
echo مرحله 2: نصب dependencies...
echo نصب dependencies برای shared...
cd shared
call npm install
if errorlevel 1 (
    echo خطا در نصب dependencies برای shared
    pause
    exit /b 1
)
cd ..

echo نصب dependencies برای services...
cd services\auth
call npm install
cd ..\user-management
call npm install
cd ..\menu-management
call npm install
cd ..\order-management
call npm install
cd ..\notification
call npm install
cd ..\reporting
call npm install
cd ..\payment
call npm install
cd ..\api-gateway
call npm install
cd ..\..

echo نصب dependencies برای frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo خطا در نصب dependencies برای frontend
    pause
    exit /b 1
)
cd ..

echo ✓ تمام dependencies نصب شدند

echo.
echo مرحله 3: بررسی فایل‌های .env...
if not exist "shared\.env" (
    echo ایجاد فایل .env برای shared...
    echo DATABASE_URL=postgresql://tadbir_user:password@localhost:5432/tadbir_khowan > shared\.env
    echo REDIS_URL=redis://localhost:6379 >> shared\.env
    echo JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random >> shared\.env
    echo ENCRYPTION_KEY=your_32_character_encryption_key >> shared\.env
    echo NODE_ENV=development >> shared\.env
)

if not exist "services\api-gateway\.env" (
    echo ایجاد فایل .env برای API Gateway...
    echo PORT=3000 > services\api-gateway\.env
    echo AUTH_SERVICE_URL=http://localhost:3001 >> services\api-gateway\.env
    echo USER_SERVICE_URL=http://localhost:3002 >> services\api-gateway\.env
    echo MENU_SERVICE_URL=http://localhost:3003 >> services\api-gateway\.env
    echo ORDER_SERVICE_URL=http://localhost:3004 >> services\api-gateway\.env
    echo NOTIFICATION_SERVICE_URL=http://localhost:3005 >> services\api-gateway\.env
    echo REPORTING_SERVICE_URL=http://localhost:3006 >> services\api-gateway\.env
    echo PAYMENT_SERVICE_URL=http://localhost:3007 >> services\api-gateway\.env
    echo REDIS_URL=redis://localhost:6379 >> services\api-gateway\.env
)

if not exist "frontend\.env" (
    echo ایجاد فایل .env برای Frontend...
    echo VITE_API_URL=http://localhost:3000 > frontend\.env
    echo VITE_APP_NAME=تدبیرخوان >> frontend\.env
)

echo ✓ فایل‌های .env بررسی شدند

echo.
echo مرحله 4: راه‌اندازی services...
echo.
echo در حال راه‌اندازی API Gateway...
start "API Gateway" cmd /k "cd services\api-gateway && npm run dev"

timeout /t 3 /nobreak >nul

echo در حال راه‌اندازی Auth Service...
start "Auth Service" cmd /k "cd services\auth && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی User Management Service...
start "User Service" cmd /k "cd services\user-management && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی Menu Management Service...
start "Menu Service" cmd /k "cd services\menu-management && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی Order Management Service...
start "Order Service" cmd /k "cd services\order-management && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی Notification Service...
start "Notification Service" cmd /k "cd services\notification && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی Reporting Service...
start "Reporting Service" cmd /k "cd services\reporting && npm run dev"

timeout /t 2 /nobreak >nul

echo در حال راه‌اندازی Payment Service...
start "Payment Service" cmd /k "cd services\payment && npm run dev"

timeout /t 3 /nobreak >nul

echo در حال راه‌اندازی Frontend...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo    سیستم تدبیرخوان راه‌اندازی شد!
echo ========================================
echo.
echo آدرس‌های مهم:
echo Frontend: http://localhost:3000
echo API Gateway: http://localhost:3000/api
echo.
echo لطفاً چند ثانیه صبر کنید تا تمام services راه‌اندازی شوند...
echo.
echo برای توقف سیستم، تمام terminal های باز شده را ببندید.
echo.
pause