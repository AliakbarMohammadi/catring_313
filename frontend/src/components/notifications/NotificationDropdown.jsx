import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock,
  ShoppingBag,
  UtensilsCrossed,
  AlertCircle
} from 'lucide-react'
import { 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead 
} from '../../store/slices/notificationSlice'
import LoadingSpinner from '../ui/LoadingSpinner'

const NotificationDropdown = ({ onClose }) => {
  const dispatch = useDispatch()
  const { notifications, loading, unreadCount } = useSelector((state) => state.notifications)

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 10, unreadOnly: false }))
  }, [dispatch])

  const handleMarkAsRead = async (notificationId) => {
    try {
      await dispatch(markAsRead(notificationId)).unwrap()
    } catch (error) {
      console.error('خطا در علامت‌گذاری اعلان:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await dispatch(markAllAsRead()).unwrap()
    } catch (error) {
      console.error('خطا در علامت‌گذاری همه اعلان‌ها:', error)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-5 h-5 text-blue-500" />
      case 'menu':
        return <UtensilsCrossed className="w-5 h-5 text-green-500" />
      case 'system':
        return <AlertCircle className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'همین الان'
    if (diffInMinutes < 60) return `${diffInMinutes} دقیقه پیش`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ساعت پیش`
    return `${Math.floor(diffInMinutes / 1440)} روز پیش`
  }

  return (
    <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">اعلان‌ها</h3>
        <div className="flex items-center space-x-2 space-x-reverse">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              <CheckCheck className="w-4 h-4 ml-1" />
              همه را خوانده شده علامت‌گذاری کن
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>اعلانی وجود ندارد</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3 space-x-reverse">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${
                        !notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center mt-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3 ml-1" />
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Link
          to="/notifications"
          onClick={onClose}
          className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          مشاهده همه اعلان‌ها
        </Link>
      </div>
    </div>
  )
}

export default NotificationDropdown