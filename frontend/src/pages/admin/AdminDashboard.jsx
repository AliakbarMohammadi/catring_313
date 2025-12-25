import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { 
  Building2, 
  Users, 
  ShoppingBag, 
  TrendingUp,
  Calendar,
  DollarSign,
  ChefHat,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth)

  // Mock data - در پیاده‌سازی واقعی از API دریافت می‌شود
  const stats = {
    totalCompanies: 25,
    totalEmployees: 1250,
    todayOrders: 89,
    monthlyRevenue: 45000000,
    pendingOrders: 12,
    completedOrders: 77,
    menuItems: 45,
    activeMenus: 8
  }

  const recentOrders = [
    {
      id: 1,
      companyName: 'شرکت فناوری پارس',
      employeeName: 'احمد محمدی',
      items: 3,
      amount: 125000,
      status: 'pending',
      date: '2024-01-15'
    },
    {
      id: 2,
      companyName: 'گروه صنعتی البرز',
      employeeName: 'فاطمه احمدی',
      items: 2,
      amount: 85000,
      status: 'confirmed',
      date: '2024-01-15'
    },
    {
      id: 3,
      companyName: 'شرکت بازرگانی آسیا',
      employeeName: 'علی رضایی',
      items: 1,
      amount: 45000,
      status: 'delivered',
      date: '2024-01-15'
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'در انتظار'
      case 'confirmed':
        return 'تایید شده'
      case 'delivered':
        return 'تحویل شده'
      case 'cancelled':
        return 'لغو شده'
      default:
        return 'نامشخص'
    }
  }

  const isCateringManager = user?.role === 'catering_manager'
  const isCompanyAdmin = user?.role === 'company_admin'

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {isCateringManager ? 'داشبورد مدیر کترینگ' : 'داشبورد مدیر شرکت'}
            </h1>
            <p className="text-blue-100">
              مدیریت و نظارت بر عملکرد سیستم | امروز {new Date().toLocaleDateString('fa-IR')}
            </p>
          </div>
          <div className="hidden md:block">
            {isCateringManager ? (
              <ChefHat className="w-16 h-16 text-blue-200" />
            ) : (
              <Building2 className="w-16 h-16 text-blue-200" />
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isCateringManager ? (
          <>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">شرکت‌های فعال</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">کل کارمندان</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-orange-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">سفارشات امروز</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">درآمد ماهانه</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(stats.monthlyRevenue / 1000000).toFixed(1)}م
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">کارمندان</p>
                  <p className="text-2xl font-bold text-gray-900">45</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingBag className="w-6 h-6 text-green-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">سفارشات ماه</p>
                  <p className="text-2xl font-bold text-gray-900">156</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">هزینه ماه</p>
                  <p className="text-2xl font-bold text-gray-900">2.5م</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="mr-4">
                  <p className="text-sm font-medium text-gray-600">فاکتورها</p>
                  <p className="text-2xl font-bold text-gray-900">3</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">سفارشات اخیر</h2>
              <Link
                to="/admin/orders"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                مشاهده همه
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {isCateringManager ? order.companyName : `سفارش #${order.id}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {isCateringManager ? order.employeeName : `${order.items} آیتم`}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">
                      {order.amount.toLocaleString()} تومان
                    </p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">دسترسی سریع</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {isCateringManager ? (
                <>
                  <Link
                    to="/admin/companies"
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Building2 className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-900">مدیریت شرکت‌ها</span>
                  </Link>
                  
                  <Link
                    to="/admin/menu-management"
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ChefHat className="w-8 h-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-900">مدیریت منو</span>
                  </Link>
                  
                  <Link
                    to="/admin/orders"
                    className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <ShoppingBag className="w-8 h-8 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-orange-900">مدیریت سفارشات</span>
                  </Link>
                  
                  <Link
                    to="/admin/reports"
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-900">گزارش‌ها</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/admin/employees"
                    className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Users className="w-8 h-8 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-blue-900">مدیریت کارمندان</span>
                  </Link>
                  
                  <Link
                    to="/admin/orders"
                    className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <ShoppingBag className="w-8 h-8 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-green-900">سفارشات شرکت</span>
                  </Link>
                  
                  <Link
                    to="/admin/invoices"
                    className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                  >
                    <FileText className="w-8 h-8 text-orange-600 mb-2" />
                    <span className="text-sm font-medium text-orange-900">فاکتورها</span>
                  </Link>
                  
                  <Link
                    to="/admin/reports"
                    className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <BarChart3 className="w-8 h-8 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-purple-900">گزارش‌ها</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      {isCateringManager && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">سفارشات در انتظار</h3>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.pendingOrders}</div>
            <p className="text-sm text-gray-600">نیاز به بررسی و تایید</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">سفارشات تکمیل شده</h3>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">{stats.completedOrders}</div>
            <p className="text-sm text-gray-600">امروز تحویل داده شده</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">آیتم‌های منو</h3>
              <ChefHat className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-blue-600 mb-2">{stats.menuItems}</div>
            <p className="text-sm text-gray-600">{stats.activeMenus} منوی فعال</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard