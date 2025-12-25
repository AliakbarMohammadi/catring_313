import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import companyAPI from '../../services/companyAPI'

// Async thunks
export const registerCompany = createAsyncThunk(
  'company/register',
  async (companyData, { rejectWithValue }) => {
    try {
      const response = await companyAPI.registerCompany(companyData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در ثبت شرکت')
    }
  }
)

export const fetchCompanyEmployees = createAsyncThunk(
  'company/fetchEmployees',
  async ({ page = 1, limit = 10 }, { rejectWithValue }) => {
    try {
      const response = await companyAPI.getEmployees({ page, limit })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت کارمندان')
    }
  }
)

export const addEmployee = createAsyncThunk(
  'company/addEmployee',
  async (employeeData, { rejectWithValue }) => {
    try {
      const response = await companyAPI.addEmployee(employeeData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در افزودن کارمند')
    }
  }
)

export const addEmployeesBulk = createAsyncThunk(
  'company/addEmployeesBulk',
  async (employeesData, { rejectWithValue }) => {
    try {
      const response = await companyAPI.addEmployeesBulk(employeesData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در افزودن دسته‌ای کارمندان')
    }
  }
)

export const fetchCompanyOrders = createAsyncThunk(
  'company/fetchOrders',
  async ({ page = 1, limit = 10, startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await companyAPI.getCompanyOrders({ page, limit, startDate, endDate })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت سفارشات شرکت')
    }
  }
)

export const generateInvoice = createAsyncThunk(
  'company/generateInvoice',
  async ({ month, year }, { rejectWithValue }) => {
    try {
      const response = await companyAPI.generateMonthlyInvoice(month, year)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در تولید فاکتور')
    }
  }
)

const initialState = {
  companyInfo: null,
  employees: [],
  companyOrders: [],
  invoices: [],
  totalEmployees: 0,
  totalOrders: 0,
  currentPage: 1,
  totalPages: 0,
  loading: false,
  error: null,
  registrationStatus: null, // pending, approved, rejected
}

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    clearCompanyError: (state) => {
      state.error = null
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
    updateEmployeeStatus: (state, action) => {
      const { employeeId, status } = action.payload
      const employee = state.employees.find(emp => emp.id === employeeId)
      if (employee) {
        employee.status = status
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Register Company
      .addCase(registerCompany.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(registerCompany.fulfilled, (state, action) => {
        state.loading = false
        state.companyInfo = action.payload.company
        state.registrationStatus = 'pending'
      })
      .addCase(registerCompany.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch Employees
      .addCase(fetchCompanyEmployees.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCompanyEmployees.fulfilled, (state, action) => {
        state.loading = false
        state.employees = action.payload.employees || []
        state.totalEmployees = action.payload.total || 0
        state.totalPages = action.payload.totalPages || 0
        state.currentPage = action.payload.currentPage || 1
      })
      .addCase(fetchCompanyEmployees.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Add Employee
      .addCase(addEmployee.fulfilled, (state, action) => {
        state.employees.unshift(action.payload.employee)
        state.totalEmployees += 1
      })
      
      // Add Employees Bulk
      .addCase(addEmployeesBulk.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addEmployeesBulk.fulfilled, (state, action) => {
        state.loading = false
        state.employees = [...action.payload.employees, ...state.employees]
        state.totalEmployees += action.payload.employees.length
      })
      .addCase(addEmployeesBulk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch Company Orders
      .addCase(fetchCompanyOrders.fulfilled, (state, action) => {
        state.companyOrders = action.payload.orders || []
        state.totalOrders = action.payload.total || 0
      })
      
      // Generate Invoice
      .addCase(generateInvoice.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(generateInvoice.fulfilled, (state, action) => {
        state.loading = false
        state.invoices.unshift(action.payload.invoice)
      })
      .addCase(generateInvoice.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const {
  clearCompanyError,
  setCurrentPage,
  updateEmployeeStatus,
} = companySlice.actions

export default companySlice.reducer