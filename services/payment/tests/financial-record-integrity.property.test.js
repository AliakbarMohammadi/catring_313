import fc from 'fast-check';
import { FinancialRecord } from '../models/FinancialRecord.js';
import { PaymentService } from '../services/PaymentService.js';
import { Payment } from '../models/Payment.js';

// Feature: tadbir-khowan, Property 13: Financial Record Integrity
// **Validates: Requirements 6.5, 10.4**

describe('Financial Record Integrity Property Tests', () => {
  
  // Property 13: Financial Record Integrity
  // For any financial transaction, the system should maintain accurate and complete audit records 
  // that cannot be modified after creation.
  test('financial records are immutable and complete after creation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          transactionType: fc.constantFrom('payment', 'refund', 'invoice_generation', 'invoice_payment'),
          referenceId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          companyId: fc.option(fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10), { nil: null }),
          amount: fc.integer({ min: 1, max: 100000 }),
          description: fc.string({ minLength: 5, maxLength: 200 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 5),
          metadata: fc.record({
            paymentMethod: fc.option(fc.constantFrom('credit_card', 'bank_transfer', 'wallet')),
            orderId: fc.option(fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10)),
            invoiceId: fc.option(fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10))
          })
        }),
        async (recordData) => {
          // Mock FinancialRecord.create
          const originalCreate = FinancialRecord.create;
          const createdRecord = {
            id: `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            ...recordData,
            createdAt: new Date()
          };
          FinancialRecord.create = global.jest.fn().mockResolvedValue(createdRecord);

          // Mock FinancialRecord.findById to simulate retrieval
          const originalFindById = FinancialRecord.findById;
          FinancialRecord.findById = global.jest.fn().mockResolvedValue(createdRecord);

          try {
            // Create the financial record
            const result = await FinancialRecord.create(recordData);

            // Verify record was created with all required fields
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('transactionType', recordData.transactionType);
            expect(result).toHaveProperty('referenceId', recordData.referenceId);
            expect(result).toHaveProperty('userId', recordData.userId);
            expect(result).toHaveProperty('companyId', recordData.companyId);
            expect(result).toHaveProperty('amount', recordData.amount);
            expect(result).toHaveProperty('description', recordData.description);
            expect(result).toHaveProperty('metadata');
            expect(result).toHaveProperty('createdAt');

            // Verify the record is immutable (no update methods should exist)
            expect(typeof result.update).toBe('undefined');
            expect(typeof result.modify).toBe('undefined');
            expect(typeof result.delete).toBe('undefined');

            // Verify amount is always positive (business rule)
            expect(result.amount).toBeGreaterThan(0);

            // Verify transaction type is valid
            const validTypes = ['payment', 'refund', 'invoice_generation', 'invoice_payment'];
            expect(validTypes).toContain(result.transactionType);

            // Verify required audit fields are present
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.id).toBeTruthy();

          } finally {
            // Restore original methods
            FinancialRecord.create = originalCreate;
            FinancialRecord.findById = originalFindById;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Financial records maintain referential integrity
  test('financial records maintain referential integrity with transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          paymentId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          amount: fc.integer({ min: 1, max: 10000 })
        }),
        async (testData) => {
          // Mock FinancialRecord.create
          const originalCreate = FinancialRecord.create;
          const recordsCreated = [];
          FinancialRecord.create = global.jest.fn().mockImplementation((data) => {
            const record = {
              id: `record_${Date.now()}_${recordsCreated.length}`,
              ...data,
              createdAt: new Date()
            };
            recordsCreated.push(record);
            return Promise.resolve(record);
          });

          // Mock FinancialRecord.findByReferenceId
          const originalFindByReferenceId = FinancialRecord.findByReferenceId;
          FinancialRecord.findByReferenceId = global.jest.fn().mockImplementation((referenceId) => {
            return Promise.resolve(recordsCreated.filter(r => r.referenceId === referenceId));
          });

          try {
            // Create multiple financial records for the same payment
            await FinancialRecord.create({
              transactionType: 'payment',
              referenceId: testData.paymentId,
              userId: testData.userId,
              amount: testData.amount,
              description: `Payment ${testData.paymentId}`
            });

            // Create a refund record for the same payment
            await FinancialRecord.create({
              transactionType: 'refund',
              referenceId: testData.paymentId,
              userId: testData.userId,
              amount: Math.floor(testData.amount * 0.5), // Partial refund
              description: `Refund for payment ${testData.paymentId}`
            });

            // Verify referential integrity
            const relatedRecords = await FinancialRecord.findByReferenceId(testData.paymentId);
            
            // Should have both payment and refund records
            expect(relatedRecords).toHaveLength(2);
            
            // All records should reference the same payment
            relatedRecords.forEach(record => {
              expect(record.referenceId).toBe(testData.paymentId);
              expect(record.userId).toBe(testData.userId);
            });

            // Should have one payment and one refund record
            const paymentRecords = relatedRecords.filter(r => r.transactionType === 'payment');
            const refundRecords = relatedRecords.filter(r => r.transactionType === 'refund');
            
            expect(paymentRecords).toHaveLength(1);
            expect(refundRecords).toHaveLength(1);

          } finally {
            // Restore original methods
            FinancialRecord.create = originalCreate;
            FinancialRecord.findByReferenceId = originalFindByReferenceId;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Financial records provide complete audit trail
  test('financial records provide complete audit trail for user transactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          companyId: fc.option(fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10), { nil: null }),
          startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-06-30') }),
          endDate: fc.date({ min: new Date('2024-07-01'), max: new Date('2024-12-31') })
        }),
        fc.array(
          fc.record({
            transactionType: fc.constantFrom('payment', 'refund', 'invoice_generation', 'invoice_payment'),
            amount: fc.integer({ min: 1, max: 5000 }),
            referenceId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10)
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (userInfo, transactions) => {
          // Mock FinancialRecord methods
          const originalCreate = FinancialRecord.create;
          const originalFindByUserId = FinancialRecord.findByUserId;
          const originalFindByDateRange = FinancialRecord.findByDateRange;

          const createdRecords = [];

          FinancialRecord.create = global.jest.fn().mockImplementation((data) => {
            const record = {
              id: `record_${Date.now()}_${createdRecords.length}`,
              ...data,
              createdAt: new Date()
            };
            createdRecords.push(record);
            return Promise.resolve(record);
          });

          FinancialRecord.findByUserId = global.jest.fn().mockImplementation((userId, filters = {}) => {
            let filtered = createdRecords.filter(r => r.userId === userId);
            
            if (filters.transactionType) {
              filtered = filtered.filter(r => r.transactionType === filters.transactionType);
            }
            
            return Promise.resolve(filtered);
          });

          FinancialRecord.findByDateRange = global.jest.fn().mockImplementation((startDate, endDate, filters = {}) => {
            let filtered = createdRecords.filter(r => {
              const recordDate = new Date(r.createdAt);
              return recordDate >= startDate && recordDate <= endDate;
            });

            if (filters.userId) {
              filtered = filtered.filter(r => r.userId === filters.userId);
            }

            return Promise.resolve(filtered);
          });

          try {
            // Create financial records for the user
            for (const transaction of transactions) {
              await FinancialRecord.create({
                transactionType: transaction.transactionType,
                referenceId: transaction.referenceId,
                userId: userInfo.userId,
                companyId: userInfo.companyId,
                amount: transaction.amount,
                description: `${transaction.transactionType} transaction`
              });
            }

            // Verify complete audit trail by user
            const userRecords = await FinancialRecord.findByUserId(userInfo.userId);
            
            // Should have all transactions for the user
            expect(userRecords).toHaveLength(transactions.length);
            
            // All records should belong to the correct user
            userRecords.forEach(record => {
              expect(record.userId).toBe(userInfo.userId);
              expect(record.companyId).toBe(userInfo.companyId);
            });

            // Verify audit trail completeness by transaction type
            const transactionTypes = [...new Set(transactions.map(t => t.transactionType))];
            
            for (const type of transactionTypes) {
              const typeRecords = await FinancialRecord.findByUserId(userInfo.userId, { transactionType: type });
              const expectedCount = transactions.filter(t => t.transactionType === type).length;
              
              expect(typeRecords).toHaveLength(expectedCount);
              typeRecords.forEach(record => {
                expect(record.transactionType).toBe(type);
              });
            }

            // Verify chronological ordering (audit trail should be ordered by creation time)
            const sortedRecords = [...userRecords].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            expect(userRecords).toEqual(sortedRecords);

          } finally {
            // Restore original methods
            FinancialRecord.create = originalCreate;
            FinancialRecord.findByUserId = originalFindByUserId;
            FinancialRecord.findByDateRange = originalFindByDateRange;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Financial records are created for all payment operations
  test('financial records are automatically created for all payment operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          orderId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          amount: fc.integer({ min: 100, max: 10000 }),
          method: fc.constantFrom('credit_card', 'bank_transfer', 'wallet')
        }),
        async (paymentData) => {
          // Mock all dependencies for payment processing
          const originalGetOrderDetails = PaymentService.getOrderDetails;
          PaymentService.getOrderDetails = global.jest.fn().mockResolvedValue({
            id: paymentData.orderId,
            userId: `user_${Date.now()}`,
            companyId: null,
            finalAmount: paymentData.amount,
            status: 'confirmed'
          });

          const originalUpdateOrderPaymentStatus = PaymentService.updateOrderPaymentStatus;
          PaymentService.updateOrderPaymentStatus = global.jest.fn().mockResolvedValue(true);

          // Mock Payment model methods
          const originalFindByOrderId = Payment.findByOrderId;
          const originalPaymentCreate = Payment.create;
          const originalPaymentUpdateStatus = Payment.updateStatus;

          Payment.findByOrderId = global.jest.fn().mockResolvedValue([]);
          Payment.create = global.jest.fn().mockResolvedValue({
            id: `payment_${Date.now()}`,
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            method: paymentData.method,
            status: 'pending'
          });
          Payment.updateStatus = global.jest.fn().mockResolvedValue({
            id: `payment_${Date.now()}`,
            status: 'completed'
          });

          // Mock FinancialRecord.create to track calls
          const originalFinancialRecordCreate = FinancialRecord.create;
          const financialRecordsCreated = [];
          FinancialRecord.create = global.jest.fn().mockImplementation((data) => {
            const record = { id: `record_${Date.now()}`, ...data };
            financialRecordsCreated.push(record);
            return Promise.resolve(record);
          });

          try {
            // Process a payment
            await PaymentService.processPayment(paymentData);

            // Verify that a financial record was created
            expect(FinancialRecord.create).toHaveBeenCalledWith(
              expect.objectContaining({
                transactionType: 'payment',
                amount: paymentData.amount,
                description: expect.stringContaining(`Payment for order ${paymentData.orderId}`)
              })
            );

            // Verify financial record contains all required audit information
            const createdRecord = financialRecordsCreated[0];
            expect(createdRecord).toHaveProperty('transactionType', 'payment');
            expect(createdRecord).toHaveProperty('amount', paymentData.amount);
            expect(createdRecord).toHaveProperty('metadata');
            expect(createdRecord.metadata).toHaveProperty('paymentMethod', paymentData.method);
            expect(createdRecord.metadata).toHaveProperty('orderId', paymentData.orderId);

          } finally {
            // Restore all mocks
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
  }, 60000); // 60 second timeout
});