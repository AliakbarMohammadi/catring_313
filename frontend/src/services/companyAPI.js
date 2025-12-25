import api from './api'

const companyAPI = {
  // ثبت‌نام شرکت
  registerCompany: async (companyData) => {
    return await api.post('/companies/register', companyData)
  },

  // دریافت اطلاعات شرکت
  getCompanyInfo: async () => {
    return await api.get('/companies/profile')
  },

  // به‌روزرسانی اطلاعات شرکت
  updateCompanyInfo: async (companyData) => {
    return await api.put('/companies/profile', companyData)
  },

  // دریافت کارمندان شرکت
  getEmployees: async ({ page = 1, limit = 10, search = '', status = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (search) params.append('search', search)
    if (status) params.append('status', status)
    
    return await api.get(`/companies/employees?${params}`)
  },

  // افزودن کارمند جدید
  addEmployee: async (employeeData) => {
    return await api.post('/companies/employees', employeeData)
  },

  // افزودن کارمندان به صورت دسته‌ای
  addEmployeesBulk: async (employeesData) => {
    return await api.post('/companies/employees/bulk', employeesData)
  },

  // به‌روزرسانی اطلاعات کارمند
  updateEmployee: async (employeeId, employeeData) => {
    return await api.put(`/companies/employees/${employeeId}`, employeeData)
  },

  // حذف کارمند
  removeEmployee: async (employeeId) => {
    return await api.delete(`/companies/employees/${employeeId}`)
  },

  // فعال/غیرفعال کردن کارمند
  toggleEmployeeStatus: async (employeeId, status) => {
    return await api.put(`/companies/employees/${employeeId}/status`, { status })
  },

  // دریافت سفارشات شرکت
  getCompanyOrders: async ({ page = 1, limit = 10, startDate = null, endDate = null, employeeId = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (employeeId) params.append('employeeId', employeeId)
    
    return await api.get(`/companies/orders?${params}`)
  },

  // دریافت آمار شرکت
  getCompanyStats: async (period = 'month') => {
    return await api.get(`/companies/stats?period=${period}`)
  },

  // تولید فاکتور ماهانه
  generateMonthlyInvoice: async (month, year) => {
    return await api.post('/companies/invoice/generate', { month, year })
  },

  // دریافت فاکتورهای شرکت
  getCompanyInvoices: async ({ page = 1, limit = 10, year = null, month = null }) => {
    const params = new URLSearchParams({ page, limit })
    if (year) params.append('year', year)
    if (month) params.append('month', month)
    
    return await api.get(`/companies/invoices?${params}`)
  },

  // دانلود فاکتور
  downloadInvoice: async (invoiceId) => {
    return await api.get(`/companies/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    })
  },

  // دریافت گزارش کارمندان
  getEmployeeReport: async ({ startDate, endDate, employeeId = null }) => {
    const params = new URLSearchParams({ startDate, endDate })
    if (employeeId) params.append('employeeId', employeeId)
    
    return await api.get(`/companies/reports/employees?${params}`)
  },

  // دریافت گزارش مالی
  getFinancialReport: async ({ startDate, endDate }) => {
    return await api.get(`/companies/reports/financial?startDate=${startDate}&endDate=${endDate}`)
  },

  // تنظیم محدودیت سفارش برای کارمندان
  setOrderLimits: async (limits) => {
    return await api.put('/companies/settings/order-limits', limits)
  },

  // دریافت تنظیمات شرکت
  getCompanySettings: async () => {
    return await api.get('/companies/settings')
  },

  // به‌روزرسانی تنظیمات شرکت
  updateCompanySettings: async (settings) => {
    return await api.put('/companies/settings', settings)
  },

  // دریافت کد دعوت شرکت
  getInviteCode: async () => {
    return await api.get('/companies/invite-code')
  },

  // تجدید کد دعوت
  regenerateInviteCode: async () => {
    return await api.post('/companies/invite-code/regenerate')
  },
}

export default companyAPI