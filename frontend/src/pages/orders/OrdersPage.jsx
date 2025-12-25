import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react'
import { 
  fetchUserOrders,
  createOrder,
  cancelOrder,
  updateCartItemQuantity,
  removeFromCart,
  clearCart
} from '../../store/slices/orderSlice'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const OrdersPage = () => {
  const dispatch = useDispatch()
  const { 
    orders, 
    cart, 
    loading, 
    currentPage, 
    totalPages,
    orderStatuses 
  } = useSelector((state) => state.orders)
  
  const [activeTab, setActiveTab] = useState('cart') // cart, orders, history
  const [selectedStatus, setSelectedStatus] = useState('')
  const [showOrderDetails, setShowOrderDetails] = useState(null)

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'history') {
      dispatch(fetchUserOrders({ page: currentPage, limit: 10 }))
    }
  }, [dispatch, activeTab, currentPage])

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      dispatch(removeFromCart(itemId))
    } else {
      dispatch(updateCartItemQuantity({ id: itemId, quantity: newQuantity }))
    }
  }

  const handleRemoveFromCart = (itemId) => {
    dispatch(removeFromCart(itemId))
    toast.success('آیتم از سبد خرید حذف شد')
  }

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error('سبد خرید خالی است')
      return
    }

    try {
      const orderData = {
        items: cart.map(item => ({
          foodItemId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        deliveryDate: cart[0].deliveryDate,
        totalAmount: cart.reduce((total, item) => total + (item.price * item.quantity), 0)
      }

      await dispatch(createOrder(orderData)).unwrap()
      toast.success('سفارش با موفقیت ثبت شد')
      setActiveTab('orders')
    } catch (error) {
      toast.error(error || 'خطا در ثبت سفارش')
    }
  }

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('آیا از لغو این سفارش اطمینان دارید؟')) {
      try {
        await dispatch(cancelOrder(orderId)).unwrap()
        toast.success('سفارش لغو شد')
      } catch (error) {
        toast.error(error || 'خطا در لغو سفارش')
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'preparing':
        return 'bg-orange-100 text-orange-800'
      case 'ready':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canCancelOrder = (order) => {
    const deliveryDate = new Date(order.deliveryDate)
    const now = new Date()
    const hoursDiff = (deliveryDate - now) / (1000 * 60 * 60)
    
    return order.status === 'pending' && hoursDiff > 2
  }

  const filteredOrders = selectedStatus 
    ? orders.filter(order => order.status === selectedStatus)
    : orders

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">سفارشات</h1>
        <p className="text-gray-600 mt-1">
          مدیریت سبد خرید و سفارشات شما
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 space-x-reverse px-6">
            <button
              onClick={() => setActiveTab('cart')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'cart'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              سبد خرید
              {cart.length > 0 && (
                <span className="mr-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                  {cartItemsCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              سفارشات فعال
            </button>
            
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              تاریخچه
            </button>
          </nav>
        </div>

        {/* Cart Tab */}
        {activeTab === 'cart' && (
          <div className="p-6">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  سبد خرید خالی است
                </h3>
                <p className="text-gray-600 mb-6">
                  برای شروع، آیتم‌هایی از منو انتخاب کنید
                </p>
                <button
                  onClick={() => window.location.href = '/menu'}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  مشاهده منو
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Cart Items */}
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <ShoppingCart className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">
                            {item.price.toLocaleString()} تومان
                          </p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 ml-1" />
                            {new Date(item.deliveryDate).toLocaleDateString('fa-IR')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 space-x-reverse">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Subtotal */}
                        <div className="text-left min-w-[100px]">
                          <p className="font-semibold text-gray-900">
                            {(item.price * item.quantity).toLocaleString()} تومان
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cart Summary */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-lg font-medium text-gray-900">مجموع:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {cartTotal.toLocaleString()} تومان
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>تعداد آیتم‌ها:</span>
                      <span>{cartItemsCount} عدد</span>
                    </div>

                    <div className="flex space-x-4 space-x-reverse">
                      <button
                        onClick={() => dispatch(clearCart())}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        پاک کردن سبد
                      </button>
                      
                      <button
                        onClick={handleCreateOrder}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {loading ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 ml-2" />
                            ثبت سفارش
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {(activeTab === 'orders' || activeTab === 'history') && (
          <div className="p-6">
            {/* Status Filter */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedStatus('')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    !selectedStatus
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  همه
                </button>
                
                {Object.entries(orderStatuses).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedStatus === status
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders List */}
            {loading ? (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  سفارشی یافت نشد
                </h3>
                <p className="text-gray-600">
                  {selectedStatus ? 'سفارشی با این وضعیت وجود ندارد' : 'هنوز سفارشی ثبت نکرده‌اید'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 space-x-reverse">
                        <h3 className="font-semibold text-gray-900">
                          سفارش #{order.id}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {orderStatuses[order.status]}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <button
                          onClick={() => setShowOrderDetails(showOrderDetails === order.id ? null : order.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canCancelOrder(order) && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">تاریخ تحویل:</span>
                        <p className="font-medium">
                          {new Date(order.deliveryDate).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">مبلغ کل:</span>
                        <p className="font-medium">
                          {order.totalAmount.toLocaleString()} تومان
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">تاریخ ثبت:</span>
                        <p className="font-medium">
                          {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                      
                      <div>
                        <span className="text-gray-500">تعداد آیتم:</span>
                        <p className="font-medium">
                          {order.items?.length || 0} عدد
                        </p>
                      </div>
                    </div>

                    {/* Order Details */}
                    {showOrderDetails === order.id && order.items && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-900 mb-3">جزئیات سفارش:</h4>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{item.name}</span>
                                <span className="text-gray-500 mr-2">× {item.quantity}</span>
                              </div>
                              <span className="font-medium">
                                {(item.price * item.quantity).toLocaleString()} تومان
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdersPage