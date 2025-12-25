import api from './api'

const authAPI = {
  // ورود کاربر
  login: async (email, password) => {
    return await api.post('/auth/login', { email, password })
  },

  // ثبت‌نام کاربر عادی
  register: async (userData) => {
    return await api.post('/auth/register', userData)
  },

  // ثبت‌نام کارمند با کد شرکت
  registerEmployee: async (userData) => {
    return await api.post('/auth/register/employee', userData)
  },

  // خروج از حساب
  logout: async () => {
    return await api.post('/auth/logout')
  },

  // تجدید token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    return await api.post('/auth/refresh', { refreshToken })
  },

  // دریافت اطلاعات پروفایل
  getProfile: async () => {
    return await api.get('/auth/profile')
  },

  // به‌روزرسانی پروفایل
  updateProfile: async (profileData) => {
    return await api.put('/auth/profile', profileData)
  },

  // تغییر رمز عبور
  changePassword: async (passwordData) => {
    return await api.put('/auth/change-password', passwordData)
  },

  // درخواست بازیابی رمز عبور
  forgotPassword: async (email) => {
    return await api.post('/auth/forgot-password', { email })
  },

  // بازیابی رمز عبور
  resetPassword: async (token, newPassword) => {
    return await api.post('/auth/reset-password', { token, newPassword })
  },

  // تایید ایمیل
  verifyEmail: async (token) => {
    return await api.post('/auth/verify-email', { token })
  },

  // ارسال مجدد ایمیل تایید
  resendVerification: async () => {
    return await api.post('/auth/resend-verification')
  },
}

export default authAPI