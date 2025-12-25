import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import menuReducer, { 
  fetchDailyMenu, 
  fetchMenuCategories, 
  setSelectedDate,
  updateMenuItemAvailability 
} from '../../store/slices/menuSlice'
import menuAPI from '../../services/menuAPI'

// Mock the API
vi.mock('../../services/menuAPI')

describe('Menu Integration Tests', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        menu: menuReducer
      }
    })
    vi.clearAllMocks()
  })

  describe('Daily Menu Management', () => {
    it('should fetch daily menu successfully', async () => {
      // Arrange
      const mockMenuItems = [
        {
          id: 1,
          name: 'کباب کوبیده',
          description: 'کباب کوبیده با برنج',
          price: 85000,
          categoryId: 1,
          available: true,
          preparationTime: 30
        },
        {
          id: 2,
          name: 'خورشت قیمه',
          description: 'خورشت قیمه با برنج',
          price: 65000,
          categoryId: 2,
          available: true,
          preparationTime: 25
        }
      ]

      const mockResponse = {
        data: {
          items: mockMenuItems,
          date: '2024-01-15'
        }
      }

      menuAPI.getDailyMenu.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchDailyMenu('2024-01-15'))

      // Assert
      expect(result.type).toBe('menu/fetchDailyMenu/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().menu
      expect(state.dailyMenu).toEqual(mockMenuItems)
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
      expect(state.lastUpdated).toBeDefined()
    })

    it('should handle daily menu fetch failure', async () => {
      // Arrange
      const errorMessage = 'خطا در دریافت منو'
      menuAPI.getDailyMenu.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      // Act
      const result = await store.dispatch(fetchDailyMenu('2024-01-15'))

      // Assert
      expect(result.type).toBe('menu/fetchDailyMenu/rejected')
      expect(result.payload).toBe(errorMessage)
      
      const state = store.getState().menu
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })

    it('should handle empty daily menu', async () => {
      // Arrange
      const mockResponse = {
        data: {
          items: [],
          date: '2024-01-15'
        }
      }

      menuAPI.getDailyMenu.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchDailyMenu('2024-01-15'))

      // Assert
      expect(result.type).toBe('menu/fetchDailyMenu/fulfilled')
      
      const state = store.getState().menu
      expect(state.dailyMenu).toEqual([])
      expect(state.loading).toBe(false)
    })
  })

  describe('Menu Categories Management', () => {
    it('should fetch menu categories successfully', async () => {
      // Arrange
      const mockCategories = [
        { id: 1, name: 'کباب', description: 'انواع کباب' },
        { id: 2, name: 'خورشت', description: 'انواع خورشت' },
        { id: 3, name: 'نوشیدنی', description: 'انواع نوشیدنی' }
      ]

      const mockResponse = {
        data: {
          categories: mockCategories
        }
      }

      menuAPI.getCategories.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchMenuCategories())

      // Assert
      expect(result.type).toBe('menu/fetchCategories/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().menu
      expect(state.categories).toEqual(mockCategories)
    })
  })

  describe('Menu State Management', () => {
    it('should update selected date', () => {
      // Arrange
      const newDate = '2024-01-20'

      // Act
      store.dispatch(setSelectedDate(newDate))

      // Assert
      const state = store.getState().menu
      expect(state.selectedDate).toBe(newDate)
    })

    it('should clear menu error', () => {
      // Arrange - set error state
      store.dispatch({
        type: 'menu/fetchDailyMenu/rejected',
        payload: 'Test error'
      })

      // Act
      store.dispatch({ type: 'menu/clearMenuError' })

      // Assert
      const state = store.getState().menu
      expect(state.error).toBe(null)
    })

    it('should update menu item availability', () => {
      // Arrange - set initial menu with items
      store.dispatch({
        type: 'menu/fetchDailyMenu/fulfilled',
        payload: {
          items: [
            { id: 1, name: 'کباب', available: true },
            { id: 2, name: 'خورشت', available: true }
          ]
        }
      })

      // Act
      store.dispatch(updateMenuItemAvailability({ itemId: 1, available: false }))

      // Assert
      const state = store.getState().menu
      const updatedItem = state.dailyMenu.find(item => item.id === 1)
      expect(updatedItem.available).toBe(false)
      
      const unchangedItem = state.dailyMenu.find(item => item.id === 2)
      expect(unchangedItem.available).toBe(true)
    })

    it('should handle updating non-existent menu item availability', () => {
      // Arrange - set initial menu
      store.dispatch({
        type: 'menu/fetchDailyMenu/fulfilled',
        payload: {
          items: [
            { id: 1, name: 'کباب', available: true }
          ]
        }
      })

      // Act
      store.dispatch(updateMenuItemAvailability({ itemId: 999, available: false }))

      // Assert - should not crash and menu should remain unchanged
      const state = store.getState().menu
      expect(state.dailyMenu).toHaveLength(1)
      expect(state.dailyMenu[0].available).toBe(true)
    })
  })

  describe('Menu Data Validation', () => {
    it('should handle menu items with missing optional fields', async () => {
      // Arrange
      const mockMenuItems = [
        {
          id: 1,
          name: 'کباب کوبیده',
          price: 85000,
          available: true
          // missing description, categoryId, preparationTime
        }
      ]

      const mockResponse = {
        data: {
          items: mockMenuItems
        }
      }

      menuAPI.getDailyMenu.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchDailyMenu('2024-01-15'))

      // Assert
      expect(result.type).toBe('menu/fetchDailyMenu/fulfilled')
      
      const state = store.getState().menu
      expect(state.dailyMenu).toEqual(mockMenuItems)
      expect(state.dailyMenu[0].name).toBe('کباب کوبیده')
      expect(state.dailyMenu[0].price).toBe(85000)
    })

    it('should handle menu items with zero price', async () => {
      // Arrange
      const mockMenuItems = [
        {
          id: 1,
          name: 'آب رایگان',
          price: 0,
          available: true
        }
      ]

      const mockResponse = {
        data: {
          items: mockMenuItems
        }
      }

      menuAPI.getDailyMenu.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchDailyMenu('2024-01-15'))

      // Assert
      expect(result.type).toBe('menu/fetchDailyMenu/fulfilled')
      
      const state = store.getState().menu
      expect(state.dailyMenu[0].price).toBe(0)
    })
  })
})