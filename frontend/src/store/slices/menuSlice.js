import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import menuAPI from '../../services/menuAPI'

// Async thunks
export const fetchDailyMenu = createAsyncThunk(
  'menu/fetchDailyMenu',
  async (date, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getDailyMenu(date)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت منو')
    }
  }
)

export const fetchMenuCategories = createAsyncThunk(
  'menu/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getCategories()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت دسته‌بندی‌ها')
    }
  }
)

export const fetchWeeklyMenu = createAsyncThunk(
  'menu/fetchWeeklyMenu',
  async ({ startDate, endDate }, { rejectWithValue }) => {
    try {
      const response = await menuAPI.getWeeklyMenu(startDate, endDate)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت منوی هفتگی')
    }
  }
)

const initialState = {
  dailyMenu: [],
  weeklyMenu: {},
  categories: [],
  selectedDate: new Date().toISOString().split('T')[0],
  loading: false,
  error: null,
  lastUpdated: null,
}

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload
    },
    clearMenuError: (state) => {
      state.error = null
    },
    updateMenuItemAvailability: (state, action) => {
      const { itemId, available } = action.payload
      const menuItem = state.dailyMenu.find(item => item.id === itemId)
      if (menuItem) {
        menuItem.available = available
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Daily Menu
      .addCase(fetchDailyMenu.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDailyMenu.fulfilled, (state, action) => {
        state.loading = false
        state.dailyMenu = action.payload.items || []
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchDailyMenu.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Categories
      .addCase(fetchMenuCategories.fulfilled, (state, action) => {
        state.categories = action.payload.categories || []
      })
      
      // Weekly Menu
      .addCase(fetchWeeklyMenu.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchWeeklyMenu.fulfilled, (state, action) => {
        state.loading = false
        state.weeklyMenu = action.payload.menus || {}
      })
      .addCase(fetchWeeklyMenu.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const { 
  setSelectedDate, 
  clearMenuError, 
  updateMenuItemAvailability 
} = menuSlice.actions

export default menuSlice.reducer