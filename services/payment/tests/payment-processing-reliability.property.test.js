import fc from 'fast-check';
import { PaymentService } from '../services/PaymentService.js';
import { Payment } from '../models/Payment.js';
import { FinancialRecord } from '../models/FinancialRecord.js';

// Feature: tadbir-khowan, Property 15: Payment Processing Reliability
// **Validates: Requirements 9.2, 9.3**

describe('Payment Processing Reliability Property Tests', () => {
  
  // Property 15: Payment Processing Reliability
  // For any payment attempt, the system should handle both success and failure cases correctly, 
  // updating order status and sending appropriate confirmations.
  test('payment processing handles success and failure cases consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orderId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          amount: fc.integer({ min: 100, max: 1000000 }), // Use integer instead of float
          method: fc.constantFrom('credit_card', 'bank_transfer', 'wallet')
        }),
        async (paymentData) => {
          // Mock order service response
          const mockOrderDetails = {
            id: paymentData.orderId,
            userId: `user_${Date.now()}`,
            companyId: Math.random() > 0.5 ? `company_${Date.now()}` : null,
            finalAmount: paymentData.amount,
            status: 'confirmed'
          };

          // Mock PaymentService.getOrderDetails
          const originalGetOrderDetails = PaymentService.getOrderDetails;
          PaymentService.getOrderDetails = global.jest.fn().mockResolvedValue(mockOrderDetails);

          // Mock PaymentService.updateOrderPaymentStatus
          const originalUpdateOrderPaymentStatus = PaymentService.updateOrderPaymentStatus;
          PaymentService.updateOrderPaymentStatus = global.jest.fn().mockResolvedValue(true);

          // Mock Payment.findByOrderId to return no existing payments
          const originalFindByOrderId = Payment.findByOrderId;
          Payment.findByOrderId = global.jest.fn().mockResolvedValue([]);

          // Mock Payment.create
          const originalPaymentCreate = Payment.create;
          const mockPayment = {
            id: `payment_${Date.now()}`,
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            method: paymentData.method,
            status: 'pending'
          };
          Payment.create = global.jest.fn().mockResolvedValue(mockPayment);

          // Mock Payment.updateStatus
          const originalPaymentUpdateStatus = Payment.updateStatus;
          Payment.updateStatus = global.jest.fn().mockImplementation((id, status, transactionId, gatewayResponse) => {
            return Promise.resolve({
              ...mockPayment,
              id,
              status,
              transactionId,
              gatewayResponse
            });
          });

          // Mock FinancialRecord.create
          const originalFinancialRecordCreate = FinancialRecord.create;
          FinancialRecord.create = global.jest.fn().mockResolvedValue({
            id: `record_${Date.now()}`,
            transactionType: 'payment',
            referenceId: mockPayment.id,
            userId: mockOrderDetails.userId,
            amount: paymentData.amount
          });

          try {
            // Process the payment
            const result = await PaymentService.processPayment(paymentData);

            // Verify that a payment record was created
            expect(Payment.create).toHaveBeenCalledWith({
              orderId: paymentData.orderId,
              amount: paymentData.amount,
              method: paymentData.method,
              status: 'pending'
            });

            // Verify that payment status was updated (either completed or failed)
            expect(Payment.updateStatus).toHaveBeenCalled();
            const updateStatusCall = Payment.updateStatus.mock.calls[0];
            const [paymentId, finalStatus, transactionId, gatewayResponse] = updateStatusCall;
            
            // Status should be either 'completed' or 'failed'
            expect(['completed', 'failed']).toContain(finalStatus);

            // Verify that order payment status was updated
            expect(PaymentService.updateOrderPaymentStatus).toHaveBeenCalledWith(
              paymentData.orderId,
              finalStatus === 'completed' ? 'paid' : 'failed'
            );

            // Verify that financial record was created
            expect(FinancialRecord.create).toHaveBeenCalledWith(
              expect.objectContaining({
                transactionType: 'payment',
                referenceId: mockPayment.id,
                userId: mockOrderDetails.userId,
                amount: paymentData.amount,
                description: expect.stringContaining(`Payment for order ${paymentData.orderId}`)
              })
            );

            // Verify result has correct structure
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('orderId', paymentData.orderId);
            expect(result).toHaveProperty('amount', paymentData.amount);
            expect(result).toHaveProperty('method', paymentData.method);
            expect(['completed', 'failed']).toContain(result.status);

          } finally {
            // Restore original methods
            PaymentService.getOrderDetails = originalGetOrderDetails;
            PaymentService.updateOrderPaymentStatus = originalUpdateOrderPaymentStatus;
            Payment.findByOrderId = originalFindByOrderId;
            Payment.create = originalPaymentCreate;
            Payment.updateStatus = originalPaymentUpdateStatus;
            FinancialRecord.create = originalFinancialRecordCreate;
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  // Additional property: Payment amount validation consistency
  test('payment processing consistently validates payment amounts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orderId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          paymentAmount: fc.integer({ min: 100, max: 1000000 }),
          orderAmount: fc.integer({ min: 100, max: 1000000 }),
          method: fc.constantFrom('credit_card', 'bank_transfer', 'wallet')
        }),
        async (testData) => {
          // Mock order service response
          const mockOrderDetails = {
            id: testData.orderId,
            userId: `user_${Date.now()}`,
            finalAmount: testData.orderAmount,
            status: 'confirmed'
          };

          // Mock PaymentService.getOrderDetails
          const originalGetOrderDetails = PaymentService.getOrderDetails;
          PaymentService.getOrderDetails = global.jest.fn().mockResolvedValue(mockOrderDetails);

          // Mock Payment.findByOrderId to return no existing payments
          const originalFindByOrderId = Payment.findByOrderId;
          Payment.findByOrderId = global.jest.fn().mockResolvedValue([]);

          try {
            const paymentData = {
              orderId: testData.orderId,
              amount: testData.paymentAmount,
              method: testData.method
            };

            // Check if amounts match (within 0.01 tolerance)
            const amountsDiffer = Math.abs(testData.paymentAmount - testData.orderAmount) > 0.01;

            if (amountsDiffer) {
              // Should throw validation error for mismatched amounts
              await expect(PaymentService.processPayment(paymentData))
                .rejects
                .toThrow('Payment amount does not match order amount');
            } else {
              // Should proceed with payment processing (may succeed or fail at gateway level)
              // We don't test the full flow here, just that validation passes
              expect(PaymentService.getOrderDetails).toHaveBeenCalledWith(testData.orderId);
            }

          } finally {
            // Restore original methods
            PaymentService.getOrderDetails = originalGetOrderDetails;
            Payment.findByOrderId = originalFindByOrderId;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Payment method validation consistency
  test('payment processing consistently validates payment methods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orderId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          amount: fc.integer({ min: 100, max: 1000000 }),
          method: fc.string({ minLength: 1, maxLength: 20 })
        }),
        async (paymentData) => {
          const validMethods = ['credit_card', 'bank_transfer', 'wallet'];
          const isValidMethod = validMethods.includes(paymentData.method);

          if (!isValidMethod) {
            // Should throw validation error for invalid payment method
            await expect(PaymentService.processPayment(paymentData))
              .rejects
              .toThrow('Invalid payment method');
          }
          // For valid methods, we don't test the full flow in this property
        }
      ),
      { numRuns: 20 }
    );
  });
});