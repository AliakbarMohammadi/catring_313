import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import orderAPI from '../../services/orderAPI'

// Async thunks
export const createOrder = createAsyncThunk(
  'orders/create',
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await orderAPI.createOrder(orderData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در ثبت سفارش')
    }
  }
)

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async ({ page = 1, limit = 10, status }, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getUserOrders({ page, limit, status })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت سفارشات')
    }
  }
)

export const cancelOrder = createAsyncThunk(
  'orders/cancel',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await orderAPI.cancelOrder(orderId)
      return { orderId, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در لغو سفارش')
    }
  }
)

export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await orderAPI.getOrderDetails(orderId)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت جزئیات سفارش')
    }
  }
)

const initialState = {
  orders: [],
  currentOrder: null,
  cart: [],
  totalPages: 0,
  currentPage: 1,
  loading: false,
  error: null,
  orderStatuses: {
    pending: 'در انتظار تایید',
    confirmed: 'تایید شده',
    preparing: 'در حال آماده‌سازی',
    ready: 'آماده تحویل',
    delivered: 'تحویل داده شده',
    cancelled: 'لغو شده'
  }
}

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const item = action.payload
      const existingItem = state.cart.find(cartItem => cartItem.id === item.id)
      
      if (existingItem) {
        existingItem.quantity += item.quantity || 1
      } else {
        state.cart.push({ ...item, quantity: item.quantity || 1 })
      }
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter(item => item.id !== action.payload)
    },
    updateCartItemQuantity: (state, action) => {
      const { id, quantity } = action.payload
      const item = state.cart.find(cartItem => cartItem.id === id)
      
      if (item) {
        if (quantity <= 0) {
          state.cart = state.cart.filter(cartItem => cartItem.id !== id)
        } else {
          item.quantity = quantity
        }
      }
    },
    clearCart: (state) => {
      state.cart = []
    },
    clearOrderError: (state) => {
      state.error = null
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Order
      .addCase(createOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.loading = false
        state.orders.unshift(action.payload.order)
        state.cart = [] // پاک کردن سبد خرید بعد از ثبت موفق سفارش
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Fetch User Orders
      .addCase(fetchUserOrders.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.loading = false
        state.orders = action.payload.orders || []
        state.totalPages = action.payload.totalPages || 0
        state.currentPage = action.payload.currentPage || 1
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Cancel Order
      .addCase(cancelOrder.fulfilled, (state, action) => {
        const order = state.orders.find(o => o.id === action.payload.orderId)
        if (order) {
          order.status = 'cancelled'
          order.updatedAt = new Date().toISOString()
        }
      })
      
      // Fetch Order Details
      .addCase(fetchOrderDetails.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        state.loading = false
        state.currentOrder = action.payload.order
      })
      .addCase(fetchOrderDetails.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  clearOrderError,
  setCurrentPage,
} = orderSlice.actions

export default orderSlice.reducer