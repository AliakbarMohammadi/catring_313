import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Clock, 
  TrendingUp,
  Calendar,
  Star,
  ChefHat,
  Users
} from 'lucide-react'
import { fetchDailyMenu } from '../../store/slices/menuSlice'
import { fetchUserOrders } from '../../store/slices/orderSlice'
import { fetchNotifications } from '../../store/slices/notificationSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const DashboardPage = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const { dailyMenu, loading: menuLoading } = useSelector((state) => state.menu)
  const { orders, loading: ordersLoading } = useSelector((state) => state.orders)
  const { unreadCount } = useSelector((state) => state.notifications)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    dispatch(fetchDailyMenu(today))
    dispatch(fetchUserOrders({ limit: 5 }))
    dispatch(fetchNotifications({ limit: 5, unreadOnly: true }))
  }, [dispatch])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'صبح بخیر'
    if (hour < 17) return 'ظهر بخیر'
    return 'عصر بخیر'
  }

  const getUserRoleTitle = (role) => {
    switch (role) {
      case 'catering_manager':
        return 'مدیر کترینگ'
      case 'company_admin':
        return 'مدیر شرکت'
      case 'employee':
        return 'کارمند'
      case 'individual':
        return 'کاربر عادی'
      default:
        return 'کاربر'
    }
  }

  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.deliveryDate).toDateString()
    const today = new Date().toDateString()
    return orderDate === today
  })

  const upcomingOrders = orders.filter(order => {
    const orderDate = new Date(order.deliveryDate)
    const today = new Date()
    return orderDate > today
  })

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {getGreeting()}، {user?.name}!
            </h1>
            <p className="text-blue-100">
              {getUserRoleTitle(user?.role)} | امروز {new Date().toLocaleDateString('fa-IR')}
            </p>
          </div>
          <div className="hidden md:block">
            <ChefHat className="w-16 h-16 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <UtensilsCrossed className="w-6 h-6 text-green-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">منوی امروز</p>
              <p className="text-2xl font-bold text-gray-900">
                {menuLoading ? '...' : dailyMenu.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">سفارشات امروز</p>
              <p className="text-2xl font-bold text-gray-900">
                {ordersLoading ? '...' : todayOrders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">سفارشات آینده</p>
              <p className="text-2xl font-bold text-gray-900">
                {ordersLoading ? '...' : upcomingOrders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-red-600" />
            </div>
            <div className="mr-4">
              <p className="text-sm font-medium text-gray-600">اعلان‌های جدید</p>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Today's Menu */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">منوی امروز</h2>
              <Link
                to="/menu"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                مشاهده همه
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {menuLoading ? (
              <LoadingSpinner />
            ) : dailyMenu.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">منوی امروز هنوز منتشر نشده است</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyMenu.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center ml-3">
                        <UtensilsCrossed className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">{item.category}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {item.price.toLocaleString()} تومان
                      </p>
                      <p className={`text-xs ${item.available ? 'text-green-600' : 'text-red-600'}`}>
                        {item.available ? 'موجود' : 'ناموجود'}
                      </p>
                    </div>
                  </div>
                ))}
                
                {dailyMenu.length > 3 && (
                  <div className="text-center pt-4">
                    <Link
                      to="/menu"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      مشاهده {dailyMenu.length - 3} آیتم دیگر
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">سفارشات اخیر</h2>
              <Link
                to="/orders"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                مشاهده همه
              </Link>
            </div>
          </div>
          
          <div className="p-6">
            {ordersLoading ? (
              <LoadingSpinner />
            ) : orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">هنوز سفارشی ثبت نکرده‌اید</p>
                <Link
                  to="/menu"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <UtensilsCrossed className="w-4 h-4 ml-2" />
                  سفارش دهید
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center ml-3">
                        <ShoppingBag className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          سفارش #{order.id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(order.deliveryDate).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">
                        {order.totalAmount.toLocaleString()} تومان
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'delivered' && 'تحویل شده'}
                        {order.status === 'confirmed' && 'تایید شده'}
                        {order.status === 'pending' && 'در انتظار'}
                        {order.status === 'cancelled' && 'لغو شده'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">دسترسی سریع</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/menu"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <UtensilsCrossed className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-sm font-medium text-blue-900">مشاهده منو</span>
          </Link>
          
          <Link
            to="/orders"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <ShoppingBag className="w-8 h-8 text-green-600 mb-2" />
            <span className="text-sm font-medium text-green-900">سفارشات من</span>
          </Link>
          
          <Link
            to="/profile"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <Users className="w-8 h-8 text-purple-600 mb-2" />
            <span className="text-sm font-medium text-purple-900">پروفایل</span>
          </Link>
          
          <Link
            to="/notifications"
            className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Calendar className="w-8 h-8 text-orange-600 mb-2" />
            <span className="text-sm font-medium text-orange-900">اعلان‌ها</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage