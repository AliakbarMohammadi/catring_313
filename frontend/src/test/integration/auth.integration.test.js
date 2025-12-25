import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import authReducer, { loginUser, registerUser, logoutUser } from '../../store/slices/authSlice'
import authAPI from '../../services/authAPI'

// Mock the API
vi.mock('../../services/authAPI')

describe('Authentication Integration Tests', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authReducer
      }
    })
    vi.clearAllMocks()
  })

  describe('User Login Flow', () => {
    it('should handle successful login', async () => {
      // Arrange
      const mockResponse = {
        data: {
          user: {
            id: 1,
            name: 'احمد محمدی',
            email: 'ahmad@example.com',
            role: 'individual'
          },
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      }
      authAPI.login.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(loginUser({
        email: 'ahmad@example.com',
        password: 'password123'
      }))

      // Assert
      expect(result.type).toBe('auth/login/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockResponse.data.user)
      expect(state.token).toBe(mockResponse.data.token)
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('should handle login failure', async () => {
      // Arrange
      const errorMessage = 'ایمیل یا رمز عبور اشتباه است'
      authAPI.login.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      // Act
      const result = await store.dispatch(loginUser({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      }))

      // Assert
      expect(result.type).toBe('auth/login/rejected')
      expect(result.payload).toBe(errorMessage)
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBe(null)
      expect(state.token).toBe(null)
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('User Registration Flow', () => {
    it('should handle successful individual user registration', async () => {
      // Arrange
      const mockResponse = {
        data: {
          user: {
            id: 2,
            name: 'فاطمه احمدی',
            email: 'fateme@example.com',
            role: 'individual'
          },
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      }
      authAPI.register.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(registerUser({
        name: 'فاطمه احمدی',
        email: 'fateme@example.com',
        password: 'password123',
        phone: '09123456789',
        role: 'individual'
      }))

      // Assert
      expect(result.type).toBe('auth/register/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockResponse.data.user)
    })

    it('should handle registration with existing email', async () => {
      // Arrange
      const errorMessage = 'این ایمیل قبلاً ثبت شده است'
      authAPI.register.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      // Act
      const result = await store.dispatch(registerUser({
        name: 'علی رضایی',
        email: 'existing@example.com',
        password: 'password123',
        phone: '09123456789',
        role: 'individual'
      }))

      // Assert
      expect(result.type).toBe('auth/register/rejected')
      expect(result.payload).toBe(errorMessage)
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('User Logout Flow', () => {
    it('should handle successful logout', async () => {
      // Arrange - set initial authenticated state
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      })

      authAPI.logout.mockResolvedValue({ data: { success: true } })

      // Act
      const result = await store.dispatch(logoutUser())

      // Assert
      expect(result.type).toBe('auth/logout/fulfilled')
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBe(null)
      expect(state.token).toBe(null)
      expect(state.refreshToken).toBe(null)
      expect(state.error).toBe(null)
    })
  })

  describe('Authentication State Management', () => {
    it('should clear error when clearError action is dispatched', () => {
      // Arrange - set error state
      store.dispatch({
        type: 'auth/login/rejected',
        payload: 'Test error'
      })

      // Act
      store.dispatch({ type: 'auth/clearError' })

      // Assert
      const state = store.getState().auth
      expect(state.error).toBe(null)
    })

    it('should clear all auth data when clearAuth action is dispatched', () => {
      // Arrange - set authenticated state
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          user: { id: 1, name: 'Test User' },
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      })

      // Act
      store.dispatch({ type: 'auth/clearAuth' })

      // Assert
      const state = store.getState().auth
      expect(state.user).toBe(null)
      expect(state.token).toBe(null)
      expect(state.refreshToken).toBe(null)
      expect(state.isAuthenticated).toBe(false)
      expect(state.error).toBe(null)
    })

    it('should update user data when updateUser action is dispatched', () => {
      // Arrange - set initial user
      store.dispatch({
        type: 'auth/login/fulfilled',
        payload: {
          user: { id: 1, name: 'Old Name', email: 'old@example.com' },
          token: 'test-token',
          refreshToken: 'test-refresh-token'
        }
      })

      // Act
      store.dispatch({
        type: 'auth/updateUser',
        payload: { name: 'New Name', phone: '09123456789' }
      })

      // Assert
      const state = store.getState().auth
      expect(state.user.name).toBe('New Name')
      expect(state.user.phone).toBe('09123456789')
      expect(state.user.email).toBe('old@example.com') // should remain unchanged
    })
  })
})