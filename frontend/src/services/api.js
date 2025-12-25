import axios from 'axios'
import toast from 'react-hot-toast'

// تنظیمات پایه axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Interceptor برای افزودن token به درخواست‌ها
api.interceptors.request.use(
  (config) => {
    // Token will be added here when store is properly imported
    const token = localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor برای مدیریت پاسخ‌ها و خطاها
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    // مدیریت خطاها
    if (error.response?.status >= 500) {
      toast.error('خطای سرور. لطفاً بعداً تلاش کنید.')
    } else if (error.response?.status === 403) {
      toast.error('شما اجازه دسترسی به این بخش را ندارید.')
    } else if (error.response?.status === 404) {
      toast.error('صفحه یا منبع مورد نظر یافت نشد.')
    } else if (error.code === 'ECONNABORTED') {
      toast.error('درخواست زمان زیادی طول کشید. لطفاً دوباره تلاش کنید.')
    } else if (!error.response) {
      toast.error('خطا در اتصال به سرور. اتصال اینترنت خود را بررسی کنید.')
    }
    
    return Promise.reject(error)
  }
)

export default api