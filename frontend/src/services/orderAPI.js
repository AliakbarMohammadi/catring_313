import api from './api'

const orderAPI = {
  // ثبت سفارش جدید
  createOrder: async (orderData) => {
    return await api.post('/orders', orderData)
  },

  // دریافت سفارشات کاربر
  getUserOrders: async ({ page = 1, limit = 10, status = null, startDate = null, endDate = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (status) params.append('status', status)
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    return await api.get(`/orders?${params}`)
  },

  // دریافت جزئیات سفارش
  getOrderDetails: async (orderId) => {
    return await api.get(`/orders/${orderId}`)
  },

  // لغو سفارش
  cancelOrder: async (orderId) => {
    return await api.put(`/orders/${orderId}/cancel`)
  },

  // به‌روزرسانی سفارش (قبل از تایید)
  updateOrder: async (orderId, orderData) => {
    return await api.put(`/orders/${orderId}`, orderData)
  },

  // دریافت تاریخچه سفارشات
  getOrderHistory: async ({ page = 1, limit = 10, year = null, month = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (year) params.append('year', year)
    if (month) params.append('month', month)
    
    return await api.get(`/orders/history?${params}`)
  },

  // دریافت آمار سفارشات کاربر
  getUserOrderStats: async (period = 'month') => {
    return await api.get(`/orders/stats?period=${period}`)
  },

  // دریافت فاکتور سفارش
  getOrderInvoice: async (orderId) => {
    return await api.get(`/orders/${orderId}/invoice`, {
      responseType: 'blob' // برای دانلود PDF
    })
  },

  // دریافت وضعیت سفارش
  getOrderStatus: async (orderId) => {
    return await api.get(`/orders/${orderId}/status`)
  },

  // تکرار سفارش قبلی
  reorderPrevious: async (orderId) => {
    return await api.post(`/orders/${orderId}/reorder`)
  },

  // دریافت سفارشات امروز
  getTodayOrders: async () => {
    return await api.get('/orders/today')
  },

  // دریافت سفارشات آینده
  getUpcomingOrders: async () => {
    return await api.get('/orders/upcoming')
  },

  // ثبت نظر برای سفارش
  rateOrder: async (orderId, rating, comment = '') => {
    return await api.post(`/orders/${orderId}/rating`, { rating, comment })
  },

  // پرداخت سفارش
  payOrder: async (orderId, paymentMethod, paymentData = {}) => {
    return await api.post(`/orders/${orderId}/payment`, {
      paymentMethod,
      ...paymentData
    })
  },

  // بررسی وضعیت پرداخت
  getPaymentStatus: async (orderId) => {
    return await api.get(`/orders/${orderId}/payment/status`)
  },
}

export default orderAPI