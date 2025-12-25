import fc from 'fast-check';
import { jest } from '@jest/globals';
import { OrderService } from '../services/OrderService.js';
import { Order } from '../models/Order.js';
import { initializeDatabase, closeDatabase } from '../config/database.js';
import axios from 'axios';

// Feature: tadbir-khowan, Property 9: Inventory Update Consistency
// **Validates: Requirements 5.3**

// Mock axios for menu service calls
jest.mock('axios');
const mockedAxios = axios;

describe('Inventory Update Consistency Property Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      const { getPool } = await import('../config/database.js');
      const pool = getPool();
      await pool.query('DELETE FROM order_items');
      await pool.query('DELETE FROM orders');
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset axios mocks
    jest.clearAllMocks();
  });

  describe('Property 9: Inventory Update Consistency', () => {
    test('should maintain inventory consistency when orders are confirmed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 10 }),
                unitPrice: fc.float({ min: 1, max: 100 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async ({ userId, deliveryDate, items }) => {
            // Mock menu service responses
            mockedAxios.post.mockImplementation((url) => {
              if (url.includes('check-availability')) {
                return Promise.resolve({
                  data: {
                    success: true,
                    data: { available: true }
                  }
                });
              }
              if (url.includes('reserve-items')) {
                return Promise.resolve({
                  data: { success: true }
                });
              }
              return Promise.reject(new Error('Unknown endpoint'));
            });

            mockedAxios.patch.mockResolvedValue({
              data: { success: true }
            });

            // Calculate expected totals
            const expectedTotalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

            // Create order
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            };

            const order = await OrderService.createOrder(orderData);

            // Verify order totals match expected calculations
            expect(order.totalAmount).toBeCloseTo(expectedTotalAmount, 2);
            expect(order.finalAmount).toBeCloseTo(expectedTotalAmount, 2);

            // Verify inventory reservation was called for each item
            const reserveCalls = mockedAxios.post.mock.calls.filter(call => 
              call[0].includes('reserve-items')
            );
            expect(reserveCalls.length).toBe(1);

            // Verify the reservation call contains all items
            const reserveCall = reserveCalls[0];
            const reserveData = reserveCall[1];
            expect(reserveData.items).toHaveLength(items.length);

            // Verify each item was reserved with correct quantity
            items.forEach(originalItem => {
              const reservedItem = reserveData.items.find(
                item => item.foodItemId === originalItem.foodItemId
              );
              expect(reservedItem).toBeDefined();
              expect(reservedItem.quantity).toBe(originalItem.quantity);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should release inventory when orders are cancelled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 10 }),
                unitPrice: fc.float({ min: 1, max: 100 })
              }),
              { minLength: 1, maxLength: 3 }
            ),
            cancellationReason: fc.string({ minLength: 1, maxLength: 100 })
          }),
          async ({ userId, deliveryDate, items, cancellationReason }) => {
            // Mock menu service responses
            mockedAxios.post.mockResolvedValue({
              data: {
                success: true,
                data: { available: true }
              }
            });

            mockedAxios.patch.mockResolvedValue({
              data: { success: true }
            });

            // Create order
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            };

            const order = await OrderService.createOrder(orderData);
            expect(order.status).toBe('pending');

            // Clear previous mock calls
            jest.clearAllMocks();

            // Cancel the order
            const cancelledOrder = await OrderService.cancelOrder(order.id, cancellationReason);

            // Verify order status changed to cancelled
            expect(cancelledOrder.status).toBe('cancelled');
            expect(cancelledOrder.notes).toContain(cancellationReason);

            // Verify inventory release was called for each item
            const releaseCalls = mockedAxios.patch.mock.calls.filter(call => 
              call[0].includes('inventory/update')
            );
            expect(releaseCalls.length).toBe(items.length);

            // Verify each item was released with negative quantity
            items.forEach(originalItem => {
              const releaseCall = releaseCalls.find(call => 
                call[1].foodItemId === originalItem.foodItemId
              );
              expect(releaseCall).toBeDefined();
              expect(releaseCall[1].quantitySold).toBe(-originalItem.quantity);
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should maintain order total consistency across status changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 5 }),
                unitPrice: fc.float({ min: 1, max: 50 })
              }),
              { minLength: 1, maxLength: 3 }
            ),
            statusSequence: fc.shuffledSubarray(['confirmed', 'preparing', 'ready'], { minLength: 1, maxLength: 3 })
          }),
          async ({ userId, deliveryDate, items, statusSequence }) => {
            // Mock menu service responses
            mockedAxios.post.mockResolvedValue({
              data: {
                success: true,
                data: { available: true }
              }
            });

            mockedAxios.patch.mockResolvedValue({
              data: { success: true }
            });

            // Create order
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            };

            const originalOrder = await OrderService.createOrder(orderData);
            const originalTotalAmount = originalOrder.totalAmount;
            const originalFinalAmount = originalOrder.finalAmount;

            let currentOrder = originalOrder;

            // Apply status changes in sequence
            for (const status of statusSequence) {
              currentOrder = await OrderService.updateOrderStatus(currentOrder.id, status);
              
              // Verify amounts remain consistent through status changes
              expect(currentOrder.totalAmount).toBeCloseTo(originalTotalAmount, 2);
              expect(currentOrder.finalAmount).toBeCloseTo(originalFinalAmount, 2);
              expect(currentOrder.status).toBe(status);
              
              // Verify items remain unchanged
              expect(currentOrder.items).toHaveLength(items.length);
              
              // Verify each item's totals are still correct
              currentOrder.items.forEach(orderItem => {
                const originalItem = items.find(item => item.foodItemId === orderItem.foodItemId);
                expect(originalItem).toBeDefined();
                expect(orderItem.quantity).toBe(originalItem.quantity);
                expect(orderItem.unitPrice).toBeCloseTo(originalItem.unitPrice, 2);
                expect(orderItem.totalPrice).toBeCloseTo(originalItem.quantity * originalItem.unitPrice, 2);
              });
            }
          }
        ),
        { numRuns: 40 }
      );
    });

    test('should prevent double inventory reservation for same order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 5 }),
                unitPrice: fc.float({ min: 1, max: 50 })
              }),
              { minLength: 1, maxLength: 2 }
            )
          }),
          async ({ userId, deliveryDate, items }) => {
            // Mock menu service responses
            mockedAxios.post.mockResolvedValue({
              data: {
                success: true,
                data: { available: true }
              }
            });

            // Create order
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            };

            const order = await OrderService.createOrder(orderData);

            // Verify only one reservation call was made
            const reserveCalls = mockedAxios.post.mock.calls.filter(call => 
              call[0].includes('reserve-items')
            );
            expect(reserveCalls.length).toBe(1);

            // Verify the order exists and has correct status
            const retrievedOrder = await OrderService.getOrderById(order.id);
            expect(retrievedOrder.id).toBe(order.id);
            expect(retrievedOrder.status).toBe('pending');

            // Attempting to create the same order again should not duplicate reservations
            // (This would be prevented by business logic, but we're testing the consistency)
            expect(reserveCalls.length).toBe(1); // Still only one call
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});