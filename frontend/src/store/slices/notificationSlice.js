import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import notificationAPI from '../../services/notificationAPI'

// Async thunks
export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ page = 1, limit = 10, unreadOnly = false }, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.getNotifications({ page, limit, unreadOnly })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در دریافت اعلان‌ها')
    }
  }
)

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.markAsRead(notificationId)
      return { notificationId, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در علامت‌گذاری اعلان')
    }
  }
)

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.markAllAsRead()
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در علامت‌گذاری همه اعلان‌ها')
    }
  }
)

export const updatePreferences = createAsyncThunk(
  'notifications/updatePreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await notificationAPI.updatePreferences(preferences)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'خطا در به‌روزرسانی تنظیمات')
    }
  }
)

const initialState = {
  notifications: [],
  unreadCount: 0,
  preferences: {
    email: true,
    sms: false,
    orderUpdates: true,
    menuUpdates: true,
    promotions: false,
  },
  currentPage: 1,
  totalPages: 0,
  loading: false,
  error: null,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationError: (state) => {
      state.error = null
    },
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload)
      if (!action.payload.read) {
        state.unreadCount += 1
      }
    },
    removeNotification: (state, action) => {
      const index = state.notifications.findIndex(n => n.id === action.payload)
      if (index !== -1) {
        const notification = state.notifications[index]
        if (!notification.read) {
          state.unreadCount -= 1
        }
        state.notifications.splice(index, 1)
      }
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Notifications
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.notifications = action.payload.notifications || []
        state.unreadCount = action.payload.unreadCount || 0
        state.totalPages = action.payload.totalPages || 0
        state.currentPage = action.payload.currentPage || 1
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      
      // Mark as Read
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(n => n.id === action.payload.notificationId)
        if (notification && !notification.read) {
          notification.read = true
          state.unreadCount = Math.max(0, state.unreadCount - 1)
        }
      })
      
      // Mark All as Read
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(notification => {
          notification.read = true
        })
        state.unreadCount = 0
      })
      
      // Update Preferences
      .addCase(updatePreferences.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.loading = false
        state.preferences = action.payload.preferences
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

export const {
  clearNotificationError,
  addNotification,
  removeNotification,
  setCurrentPage,
} = notificationSlice.actions

export default notificationSlice.reducer