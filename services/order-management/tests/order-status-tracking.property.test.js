import fc from 'fast-check';
import { jest } from '@jest/globals';
import { OrderStatusService } from '../services/OrderStatusService.js';
import { Order } from '../models/Order.js';
import { initializeDatabase, closeDatabase } from '../config/database.js';

// Feature: tadbir-khowan, Property 10: Order Status Tracking
// **Validates: Requirements 5.5**

describe('Order Status Tracking Property Tests', () => {
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
  });

  describe('Property 10: Order Status Tracking', () => {
    test('should maintain valid status transitions for all orders', async () => {
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
            // Create order directly in database (bypassing external service calls)
            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice
              })),
              totalAmount,
              discountAmount: 0,
              finalAmount: totalAmount,
              status: 'pending'
            };

            const order = await Order.create(orderData);
            expect(order.status).toBe('pending');

            let currentStatus = 'pending';
            const validTransitions = OrderStatusService.getStatusTransitions();

            // Apply status changes in sequence
            for (const targetStatus of statusSequence) {
              // Verify the transition is valid
              expect(validTransitions[currentStatus]).toContain(targetStatus);

              // Update status
              const updatedOrder = await OrderStatusService.updateOrderStatus(order.id, targetStatus);
              
              // Verify status was updated correctly
              expect(updatedOrder.status).toBe(targetStatus);
              expect(updatedOrder.id).toBe(order.id);
              
              // Verify other order properties remain unchanged
              expect(updatedOrder.userId).toBe(userId);
              expect(updatedOrder.deliveryDate).toBe(deliveryDate);
              expect(updatedOrder.totalAmount).toBeCloseTo(totalAmount, 2);
              expect(updatedOrder.finalAmount).toBeCloseTo(totalAmount, 2);
              
              currentStatus = targetStatus;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should reject invalid status transitions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 3 }),
                unitPrice: fc.float({ min: 1, max: 30 })
              }),
              { minLength: 1, maxLength: 2 }
            ),
            initialStatus: fc.constantFrom('pending', 'confirmed', 'preparing', 'ready'),
            invalidTargetStatus: fc.constantFrom('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
          }),
          async ({ userId, deliveryDate, items, initialStatus, invalidTargetStatus }) => {
            // Create order
            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice
              })),
              totalAmount,
              discountAmount: 0,
              finalAmount: totalAmount,
              status: 'pending'
            };

            const order = await Order.create(orderData);

            // Move to initial status if not pending
            if (initialStatus !== 'pending') {
              const statusPath = {
                'confirmed': ['confirmed'],
                'preparing': ['confirmed', 'preparing'],
                'ready': ['confirmed', 'preparing', 'ready']
              };

              for (const status of statusPath[initialStatus]) {
                await OrderStatusService.updateOrderStatus(order.id, status);
              }
            }

            // Check if transition is valid
            const validTransitions = OrderStatusService.getStatusTransitions();
            const isValidTransition = validTransitions[initialStatus].includes(invalidTargetStatus);

            if (!isValidTransition) {
              // Should reject invalid transition
              await expect(
                OrderStatusService.updateOrderStatus(order.id, invalidTargetStatus)
              ).rejects.toThrow(/Cannot change status/);
              
              // Verify status remained unchanged
              const unchangedOrder = await Order.findById(order.id);
              expect(unchangedOrder.status).toBe(initialStatus);
            } else {
              // Valid transition should succeed
              const updatedOrder = await OrderStatusService.updateOrderStatus(order.id, invalidTargetStatus);
              expect(updatedOrder.status).toBe(invalidTargetStatus);
            }
          }
        ),
        { numRuns: 40 }
      );
    });

    test('should track status changes with timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
            items: fc.array(
              fc.record({
                foodItemId: fc.uuid(),
                quantity: fc.integer({ min: 1, max: 3 }),
                unitPrice: fc.float({ min: 1, max: 30 })
              }),
              { minLength: 1, maxLength: 2 }
            )
          }),
          async ({ userId, deliveryDate, items }) => {
            // Create order
            const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
            
            const orderData = {
              userId,
              deliveryDate,
              items: items.map(item => ({
                foodItemId: item.foodItemId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice
              })),
              totalAmount,
              discountAmount: 0,
              finalAmount: totalAmount,
              status: 'pending'
            };

            const order = await Order.create(orderData);
            const initialTimestamp = order.updatedAt;

            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update status
            const updatedOrder = await OrderStatusService.updateOrderStatus(order.id, 'confirmed');
            
            // Verify timestamp was updated
            expect(new Date(updatedOrder.updatedAt).getTime()).toBeGreaterThan(new Date(initialTimestamp).getTime());
            expect(updatedOrder.status).toBe('confirmed');
            
            // Get status history
            const history = await OrderStatusService.getOrderStatusHistory(order.id);
            expect(history.orderId).toBe(order.id);
            expect(history.currentStatus).toBe('confirmed');
            expect(history.lastUpdated).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should maintain status consistency across bulk operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orders: fc.array(
              fc.record({
                userId: fc.uuid(),
                deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
                items: fc.array(
                  fc.record({
                    foodItemId: fc.uuid(),
                    quantity: fc.integer({ min: 1, max: 2 }),
                    unitPrice: fc.float({ min: 1, max: 20 })
                  }),
                  { minLength: 1, maxLength: 2 }
                )
              }),
              { minLength: 2, maxLength: 5 }
            ),
            targetStatus: fc.constantFrom('confirmed', 'cancelled')
          }),
          async ({ orders, targetStatus }) => {
            // Create multiple orders
            const createdOrders = [];
            
            for (const orderSpec of orders) {
              const totalAmount = orderSpec.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
              
              const orderData = {
                userId: orderSpec.userId,
                deliveryDate: orderSpec.deliveryDate,
                items: orderSpec.items.map(item => ({
                  foodItemId: item.foodItemId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.quantity * item.unitPrice
                })),
                totalAmount,
                discountAmount: 0,
                finalAmount: totalAmount,
                status: 'pending'
              };

              const order = await Order.create(orderData);
              createdOrders.push(order);
            }

            const orderIds = createdOrders.map(order => order.id);

            // Perform bulk status update
            const result = await OrderStatusService.bulkUpdateOrderStatus(orderIds, targetStatus);

            // Verify all orders were updated successfully
            expect(result.summary.total).toBe(orderIds.length);
            expect(result.summary.updated).toBe(orderIds.length);
            expect(result.summary.failed).toBe(0);
            expect(result.successful).toHaveLength(orderIds.length);
            expect(result.failed).toHaveLength(0);

            // Verify each order has the correct status
            for (const orderResult of result.successful) {
              expect(orderResult.order.status).toBe(targetStatus);
              expect(orderIds).toContain(orderResult.orderId);
            }

            // Double-check by fetching orders directly
            for (const orderId of orderIds) {
              const order = await Order.findById(orderId);
              expect(order.status).toBe(targetStatus);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should provide accurate status statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            orderSpecs: fc.array(
              fc.record({
                userId: fc.uuid(),
                deliveryDate: fc.date({ min: new Date(Date.now() + 24 * 60 * 60 * 1000) }).map(d => d.toISOString().split('T')[0]),
                finalStatus: fc.constantFrom('pending', 'confirmed', 'preparing', 'cancelled'),
                items: fc.array(
                  fc.record({
                    foodItemId: fc.uuid(),
                    quantity: fc.integer({ min: 1, max: 2 }),
                    unitPrice: fc.float({ min: 1, max: 20 })
                  }),
                  { minLength: 1, maxLength: 2 }
                )
              }),
              { minLength: 3, maxLength: 8 }
            )
          }),
          async ({ orderSpecs }) => {
            // Create orders with different statuses
            const createdOrders = [];
            const expectedStatusCounts = {};
            
            // Initialize expected counts
            OrderStatusService.getValidStatuses().forEach(status => {
              expectedStatusCounts[status] = 0;
            });

            for (const spec of orderSpecs) {
              const totalAmount = spec.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
              
              const orderData = {
                userId: spec.userId,
                deliveryDate: spec.deliveryDate,
                items: spec.items.map(item => ({
                  foodItemId: item.foodItemId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.quantity * item.unitPrice
                })),
                totalAmount,
                discountAmount: 0,
                finalAmount: totalAmount,
                status: 'pending'
              };

              const order = await Order.create(orderData);
              
              // Move to final status if not pending
              if (spec.finalStatus !== 'pending') {
                const statusPath = {
                  'confirmed': ['confirmed'],
                  'preparing': ['confirmed', 'preparing'],
                  'cancelled': ['cancelled']
                };

                for (const status of statusPath[spec.finalStatus]) {
                  await OrderStatusService.updateOrderStatus(order.id, status);
                }
              }

              expectedStatusCounts[spec.finalStatus]++;
              createdOrders.push(order);
            }

            // Get statistics
            const statistics = await OrderStatusService.getStatusStatistics();

            // Verify statistics match expected counts
            expect(statistics.total).toBe(orderSpecs.length);
            
            for (const status of OrderStatusService.getValidStatuses()) {
              expect(statistics.byStatus[status]).toBe(expectedStatusCounts[status]);
            }

            // Verify delivery date breakdown
            const expectedDeliveryDateCounts = {};
            orderSpecs.forEach(spec => {
              expectedDeliveryDateCounts[spec.deliveryDate] = (expectedDeliveryDateCounts[spec.deliveryDate] || 0) + 1;
            });

            for (const [date, count] of Object.entries(expectedDeliveryDateCounts)) {
              expect(statistics.byDeliveryDate[date]).toBe(count);
            }
          }
        ),
        { numRuns: 25 }
      );
    });
  });
});