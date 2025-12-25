import api from './api'

const menuAPI = {
  // دریافت منوی روزانه
  getDailyMenu: async (date) => {
    return await api.get(`/menu/daily/${date}`)
  },

  // دریافت منوی هفتگی
  getWeeklyMenu: async (startDate, endDate) => {
    return await api.get(`/menu/weekly?startDate=${startDate}&endDate=${endDate}`)
  },

  // دریافت منوی ماهانه
  getMonthlyMenu: async (year, month) => {
    return await api.get(`/menu/monthly/${year}/${month}`)
  },

  // دریافت دسته‌بندی‌های غذا
  getCategories: async () => {
    return await api.get('/menu/categories')
  },

  // دریافت اقلام غذایی
  getFoodItems: async (categoryId = null) => {
    const params = categoryId ? `?categoryId=${categoryId}` : ''
    return await api.get(`/menu/items${params}`)
  },

  // جستجو در منو
  searchMenu: async (query, date = null) => {
    const params = new URLSearchParams({ query })
    if (date) params.append('date', date)
    return await api.get(`/menu/search?${params}`)
  },

  // دریافت جزئیات یک آیتم غذایی
  getFoodItemDetails: async (itemId) => {
    return await api.get(`/menu/items/${itemId}`)
  },

  // بررسی موجودی آیتم
  checkAvailability: async (itemId, date) => {
    return await api.get(`/menu/items/${itemId}/availability?date=${date}`)
  },

  // دریافت قیمت‌های ویژه
  getSpecialPrices: async (date) => {
    return await api.get(`/menu/special-prices?date=${date}`)
  },

  // دریافت پیشنهادات روز
  getDailyRecommendations: async (date) => {
    return await api.get(`/menu/recommendations?date=${date}`)
  },

  // ثبت نظر برای آیتم غذایی
  rateFoodItem: async (itemId, rating, comment = '') => {
    return await api.post(`/menu/items/${itemId}/rating`, { rating, comment })
  },

  // دریافت نظرات آیتم غذایی
  getFoodItemRatings: async (itemId) => {
    return await api.get(`/menu/items/${itemId}/ratings`)
  },
}

export default menuAPI