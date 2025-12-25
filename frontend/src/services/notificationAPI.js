import api from './api'

const notificationAPI = {
  // دریافت اعلان‌ها
  getNotifications: async ({ page = 1, limit = 10, unreadOnly = false, type = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (unreadOnly) params.append('unreadOnly', 'true')
    if (type) params.append('type', type)
    
    return await api.get(`/notifications?${params}`)
  },

  // علامت‌گذاری اعلان به عنوان خوانده شده
  markAsRead: async (notificationId) => {
    return await api.put(`/notifications/${notificationId}/read`)
  },

  // علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
  markAllAsRead: async () => {
    return await api.put('/notifications/mark-all-read')
  },

  // حذف اعلان
  deleteNotification: async (notificationId) => {
    return await api.delete(`/notifications/${notificationId}`)
  },

  // حذف همه اعلان‌ها
  deleteAllNotifications: async () => {
    return await api.delete('/notifications/all')
  },

  // دریافت تعداد اعلان‌های خوانده نشده
  getUnreadCount: async () => {
    return await api.get('/notifications/unread-count')
  },

  // دریافت تنظیمات اعلان‌رسانی
  getPreferences: async () => {
    return await api.get('/notifications/preferences')
  },

  // به‌روزرسانی تنظیمات اعلان‌رسانی
  updatePreferences: async (preferences) => {
    return await api.put('/notifications/preferences', preferences)
  },

  // ثبت‌نام برای اعلان‌های push
  subscribeToPush: async (subscription) => {
    return await api.post('/notifications/push/subscribe', subscription)
  },

  // لغو ثبت‌نام اعلان‌های push
  unsubscribeFromPush: async () => {
    return await api.post('/notifications/push/unsubscribe')
  },

  // تست ارسال اعلان
  sendTestNotification: async (type = 'email') => {
    return await api.post('/notifications/test', { type })
  },

  // دریافت تاریخچه اعلان‌ها
  getNotificationHistory: async ({ page = 1, limit = 10, startDate = null, endDate = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    return await api.get(`/notifications/history?${params}`)
  },

  // دریافت آمار اعلان‌ها
  getNotificationStats: async (period = 'month') => {
    return await api.get(`/notifications/stats?period=${period}`)
  },

  // ارسال اعلان سفارشی (برای مدیران)
  sendCustomNotification: async (notificationData) => {
    return await api.post('/notifications/custom', notificationData)
  },

  // دریافت قالب‌های اعلان
  getNotificationTemplates: async () => {
    return await api.get('/notifications/templates')
  },

  // به‌روزرسانی قالب اعلان
  updateNotificationTemplate: async (templateId, templateData) => {
    return await api.put(`/notifications/templates/${templateId}`, templateData)
  },
}

export default notificationAPI