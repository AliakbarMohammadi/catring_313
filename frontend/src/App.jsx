import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

// صفحات اصلی
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import MenuPage from './pages/menu/MenuPage'
import OrdersPage from './pages/orders/OrdersPage'
import ProfilePage from './pages/profile/ProfilePage'

// صفحات مدیریتی
import AdminDashboard from './pages/admin/AdminDashboard'
import CompanyManagement from './pages/admin/CompanyManagement'
import MenuManagement from './pages/admin/MenuManagement'
import OrderManagement from './pages/admin/OrderManagement'
import ReportsPage from './pages/admin/ReportsPage'

// کامپوننت‌های محافظت شده
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import Layout from './components/layout/Layout'

function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth)

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Routes>
        {/* مسیرهای عمومی */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <LoginPage />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? 
            <Navigate to="/dashboard" replace /> : 
            <RegisterPage />
          } 
        />

        {/* مسیرهای محافظت شده */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* مسیرهای مدیریتی */}
        <Route path="/admin" element={<AdminRoute />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="companies" element={<CompanyManagement />} />
            <Route path="menu-management" element={<MenuManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>
        </Route>

        {/* مسیر پیش‌فرض */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}

export default App