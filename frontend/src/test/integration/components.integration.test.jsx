import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { QueryClient, QueryClientProvider } from 'react-query'

import authReducer from '../../store/slices/authSlice'
import menuReducer from '../../store/slices/menuSlice'
import orderReducer from '../../store/slices/orderSlice'
import notificationReducer from '../../store/slices/notificationSlice'

import LoginPage from '../../pages/auth/LoginPage'

// Mock APIs
vi.mock('../../services/authAPI')
vi.mock('../../services/menuAPI')
vi.mock('../../services/orderAPI')

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}))

// Test wrapper component
const TestWrapper = ({ children, initialState = {} }) => {
  const defaultState = {
    auth: {
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      error: null,
    },
    menu: {
      dailyMenu: [],
      weeklyMenu: {},
      categories: [],
      selectedDate: new Date().toISOString().split('T')[0],
      loading: false,
      error: null,
      lastUpdated: null,
    },
    orders: {
      orders: [],
      currentOrder: null,
      cart: [],
      totalPages: 0,
      currentPage: 1,
      loading: false,
      error: null,
    },
    notifications: {
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
  }

  const mergedState = {
    ...defaultState,
    ...initialState,
    auth: { ...defaultState.auth, ...initialState.auth },
    menu: { ...defaultState.menu, ...initialState.menu },
    orders: { ...defaultState.orders, ...initialState.orders },
    notifications: { ...defaultState.notifications, ...initialState.notifications },
  }

  const store = configureStore({
    reducer: {
      auth: authReducer,
      menu: menuReducer,
      orders: orderReducer,
      notifications: notificationReducer,
    },
    preloadedState: mergedState
  })

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  )
}

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LoginPage Integration', () => {
    it('should render login form with all required fields', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      expect(screen.getByText('تدبیرخوان')).toBeInTheDocument()
      expect(screen.getByText('ورود به حساب کاربری')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('ایمیل خود را وارد کنید')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('رمز عبور خود را وارد کنید')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /ورود/i })).toBeInTheDocument()
    })

    it('should show validation errors for empty fields', async () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const submitButton = screen.getByRole('button', { name: /ورود/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('ایمیل الزامی است')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('رمز عبور باید حداقل ۶ کاراکتر باشد')).toBeInTheDocument()
      })
    })

    it('should toggle password visibility', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const passwordInput = screen.getByPlaceholderText('رمز عبور خود را وارد کنید')
      const toggleButton = passwordInput.parentElement.querySelector('button')

      expect(passwordInput.type).toBe('password')
      
      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('text')
      
      fireEvent.click(toggleButton)
      expect(passwordInput.type).toBe('password')
    })
  })
})