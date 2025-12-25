import { describe, it, expect, beforeEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import orderReducer, { 
  createOrder,
  fetchUserOrders,
  cancelOrder,
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart
} from '../../store/slices/orderSlice'
import orderAPI from '../../services/orderAPI'

// Mock the API
vi.mock('../../services/orderAPI')

describe('Orders Integration Tests', () => {
  let store

  beforeEach(() => {
    store = configureStore({
      reducer: {
        orders: orderReducer
      }
    })
    vi.clearAllMocks()
  })

  describe('Order Creation Flow', () => {
    it('should create order successfully and clear cart', async () => {
      // Arrange
      const mockOrder = {
        id: 1,
        items: [
          { id: 1, name: 'کباب کوبیده', quantity: 2, price: 85000 },
          { id: 2, name: 'خورشت قیمه', quantity: 1, price: 65000 }
        ],
        totalAmount: 235000,
        status: 'pending',
        deliveryDate: '2024-01-16',
        createdAt: '2024-01-15T10:00:00Z'
      }

      const mockResponse = {
        data: { order: mockOrder }
      }

      orderAPI.createOrder.mockResolvedValue(mockResponse)

      // Set initial cart state
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2,
        deliveryDate: '2024-01-16'
      }))
      store.dispatch(addToCart({
        id: 2,
        name: 'خورشت قیمه',
        price: 65000,
        quantity: 1,
        deliveryDate: '2024-01-16'
      }))

      // Act
      const result = await store.dispatch(createOrder({
        items: [
          { foodItemId: 1, quantity: 2, price: 85000 },
          { foodItemId: 2, quantity: 1, price: 65000 }
        ],
        deliveryDate: '2024-01-16',
        totalAmount: 235000
      }))

      // Assert
      expect(result.type).toBe('orders/create/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().orders
      expect(state.orders).toHaveLength(1)
      expect(state.orders[0]).toEqual(mockOrder)
      expect(state.cart).toHaveLength(0) // Cart should be cleared
      expect(state.loading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('should handle order creation failure', async () => {
      // Arrange
      const errorMessage = 'موجودی کافی نیست'
      orderAPI.createOrder.mockRejectedValue({
        response: { data: { message: errorMessage } }
      })

      // Act
      const result = await store.dispatch(createOrder({
        items: [{ foodItemId: 1, quantity: 10, price: 85000 }],
        deliveryDate: '2024-01-16',
        totalAmount: 850000
      }))

      // Assert
      expect(result.type).toBe('orders/create/rejected')
      expect(result.payload).toBe(errorMessage)
      
      const state = store.getState().orders
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('Order Management', () => {
    it('should fetch user orders successfully', async () => {
      // Arrange
      const mockOrders = [
        {
          id: 1,
          totalAmount: 235000,
          status: 'delivered',
          deliveryDate: '2024-01-15',
          createdAt: '2024-01-14T10:00:00Z'
        },
        {
          id: 2,
          totalAmount: 150000,
          status: 'pending',
          deliveryDate: '2024-01-16',
          createdAt: '2024-01-15T14:00:00Z'
        }
      ]

      const mockResponse = {
        data: {
          orders: mockOrders,
          totalPages: 1,
          currentPage: 1
        }
      }

      orderAPI.getUserOrders.mockResolvedValue(mockResponse)

      // Act
      const result = await store.dispatch(fetchUserOrders({ page: 1, limit: 10 }))

      // Assert
      expect(result.type).toBe('orders/fetchUserOrders/fulfilled')
      expect(result.payload).toEqual(mockResponse.data)
      
      const state = store.getState().orders
      expect(state.orders).toEqual(mockOrders)
      expect(state.totalPages).toBe(1)
      expect(state.currentPage).toBe(1)
      expect(state.loading).toBe(false)
    })

    it('should cancel order successfully', async () => {
      // Arrange
      const orderId = 1
      const mockResponse = {
        data: { success: true, message: 'سفارش لغو شد' }
      }

      orderAPI.cancelOrder.mockResolvedValue(mockResponse)

      // Set initial order state
      store.dispatch({
        type: 'orders/fetchUserOrders/fulfilled',
        payload: {
          orders: [
            { id: 1, status: 'pending', totalAmount: 150000 },
            { id: 2, status: 'confirmed', totalAmount: 200000 }
          ]
        }
      })

      // Act
      const result = await store.dispatch(cancelOrder(orderId))

      // Assert
      expect(result.type).toBe('orders/cancel/fulfilled')
      expect(result.payload.orderId).toBe(orderId)
      
      const state = store.getState().orders
      const cancelledOrder = state.orders.find(order => order.id === orderId)
      expect(cancelledOrder.status).toBe('cancelled')
      expect(cancelledOrder.updatedAt).toBeDefined()
    })
  })

  describe('Shopping Cart Management', () => {
    it('should add item to cart', () => {
      // Arrange
      const item = {
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2,
        deliveryDate: '2024-01-16'
      }

      // Act
      store.dispatch(addToCart(item))

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0]).toEqual(item)
    })

    it('should update quantity when adding existing item to cart', () => {
      // Arrange
      const item = {
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 1,
        deliveryDate: '2024-01-16'
      }

      // Add item first time
      store.dispatch(addToCart(item))

      // Act - add same item again
      store.dispatch(addToCart({ ...item, quantity: 2 }))

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0].quantity).toBe(3) // 1 + 2
    })

    it('should remove item from cart', () => {
      // Arrange
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2
      }))
      store.dispatch(addToCart({
        id: 2,
        name: 'خورشت قیمه',
        price: 65000,
        quantity: 1
      }))

      // Act
      store.dispatch(removeFromCart(1))

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0].id).toBe(2)
    })

    it('should update cart item quantity', () => {
      // Arrange
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2
      }))

      // Act
      store.dispatch(updateCartItemQuantity({ id: 1, quantity: 5 }))

      // Assert
      const state = store.getState().orders
      expect(state.cart[0].quantity).toBe(5)
    })

    it('should remove item when quantity is set to 0 or less', () => {
      // Arrange
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2
      }))

      // Act
      store.dispatch(updateCartItemQuantity({ id: 1, quantity: 0 }))

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(0)
    })

    it('should clear entire cart', () => {
      // Arrange
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2
      }))
      store.dispatch(addToCart({
        id: 2,
        name: 'خورشت قیمه',
        price: 65000,
        quantity: 1
      }))

      // Act
      store.dispatch(clearCart())

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(0)
    })
  })

  describe('Order State Management', () => {
    it('should clear order error', () => {
      // Arrange - set error state
      store.dispatch({
        type: 'orders/create/rejected',
        payload: 'Test error'
      })

      // Act
      store.dispatch({ type: 'orders/clearOrderError' })

      // Assert
      const state = store.getState().orders
      expect(state.error).toBe(null)
    })

    it('should set current page', () => {
      // Act
      store.dispatch({ type: 'orders/setCurrentPage', payload: 3 })

      // Assert
      const state = store.getState().orders
      expect(state.currentPage).toBe(3)
    })
  })

  describe('Cart Calculations', () => {
    it('should handle cart with multiple items correctly', () => {
      // Arrange & Act
      store.dispatch(addToCart({
        id: 1,
        name: 'کباب کوبیده',
        price: 85000,
        quantity: 2
      }))
      store.dispatch(addToCart({
        id: 2,
        name: 'خورشت قیمه',
        price: 65000,
        quantity: 1
      }))
      store.dispatch(addToCart({
        id: 3,
        name: 'نوشابه',
        price: 15000,
        quantity: 3
      }))

      // Assert
      const state = store.getState().orders
      expect(state.cart).toHaveLength(3)
      
      // Calculate total manually to verify
      const expectedTotal = (85000 * 2) + (65000 * 1) + (15000 * 3)
      const actualTotal = state.cart.reduce((total, item) => total + (item.price * item.quantity), 0)
      expect(actualTotal).toBe(expectedTotal)
      expect(actualTotal).toBe(280000)
    })
  })
})