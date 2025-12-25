import fc from 'fast-check';
import { InvoiceService } from '../services/InvoiceService.js';
import { Invoice } from '../models/Invoice.js';
import { FinancialRecord } from '../models/FinancialRecord.js';

// Feature: tadbir-khowan, Property 12: Invoice Generation Accuracy
// **Validates: Requirements 6.3, 6.4**

describe('Invoice Generation Accuracy Property Tests', () => {
  
  // Property 12: Invoice Generation Accuracy
  // For any monthly period and user/company, generated invoices should include all orders, 
  // correct calculations, and complete payment information.
  test('invoice generation includes all orders with correct calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          companyId: fc.option(fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10), { nil: null }),
          period: fc.record({
            from: fc.constantFrom('2024-01-01', '2024-02-01', '2024-03-01'),
            to: fc.constantFrom('2024-01-31', '2024-02-28', '2024-03-31')
          }).filter(p => new Date(p.from) < new Date(p.to)),
          taxRate: fc.integer({ min: 0, max: 20 }).map(x => x / 100), // 0% to 20%
          discount: fc.integer({ min: 0, max: 1000 })
        }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
            finalAmount: fc.integer({ min: 100, max: 10000 }),
            deliveryDate: fc.constantFrom('2024-01-15', '2024-02-15', '2024-03-15'),
            status: fc.constant('delivered'),
            items: fc.array(
              fc.record({
                foodItemId: fc.string({ minLength: 5, maxLength: 20 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 5),
                quantity: fc.integer({ min: 1, max: 10 }),
                unitPrice: fc.integer({ min: 100, max: 1000 }),
                totalPrice: fc.integer({ min: 100, max: 10000 })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (invoiceData, orders) => {
          // Mock InvoiceService.findByPeriod to return no existing invoices
          const originalFindByPeriod = Invoice.findByPeriod;
          Invoice.findByPeriod = global.jest.fn().mockResolvedValue([]);

          // Mock InvoiceService.getOrdersForPeriod to return our test orders
          const originalGetOrdersForPeriod = InvoiceService.getOrdersForPeriod;
          InvoiceService.getOrdersForPeriod = global.jest.fn().mockResolvedValue(orders);

          // Mock Invoice.create
          const originalInvoiceCreate = Invoice.create;
          Invoice.create = global.jest.fn().mockImplementation((data) => {
            return Promise.resolve({
              id: `invoice_${Date.now()}`,
              ...data
            });
          });

          // Mock InvoiceService.generateInvoicePDF
          const originalGenerateInvoicePDF = InvoiceService.generateInvoicePDF;
          InvoiceService.generateInvoicePDF = global.jest.fn().mockResolvedValue('/storage/invoices/test.pdf');

          // Mock Invoice.updatePdfUrl
          const originalUpdatePdfUrl = Invoice.updatePdfUrl;
          Invoice.updatePdfUrl = global.jest.fn().mockImplementation((id, pdfUrl) => {
            return Promise.resolve({
              id,
              pdfUrl,
              ...invoiceData
            });
          });

          // Mock FinancialRecord.create
          const originalFinancialRecordCreate = FinancialRecord.create;
          FinancialRecord.create = global.jest.fn().mockResolvedValue({
            id: `record_${Date.now()}`,
            transactionType: 'invoice_generation'
          });

          try {
            // Generate the invoice
            const result = await InvoiceService.generateInvoice(invoiceData);

            // Verify that orders were fetched for the correct period
            expect(InvoiceService.getOrdersForPeriod).toHaveBeenCalledWith(
              invoiceData.userId,
              invoiceData.companyId,
              invoiceData.period.from,
              invoiceData.period.to
            );

            // Calculate expected totals
            const expectedSubtotal = orders.reduce((sum, order) => sum + order.finalAmount, 0);
            const expectedTax = expectedSubtotal * invoiceData.taxRate;
            const expectedDiscount = invoiceData.discount || 0;
            const expectedTotal = expectedSubtotal + expectedTax - expectedDiscount;

            // Verify Invoice.create was called with correct calculations
            expect(Invoice.create).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: invoiceData.userId,
                companyId: invoiceData.companyId,
                period: invoiceData.period,
                orders: orders.map(order => order.id),
                subtotal: expect.closeTo(expectedSubtotal, 2),
                tax: expect.closeTo(expectedTax, 2),
                discount: expectedDiscount,
                total: expect.closeTo(expectedTotal, 2)
              })
            );

            // Verify PDF generation was called
            expect(InvoiceService.generateInvoicePDF).toHaveBeenCalled();

            // Verify financial record was created
            expect(FinancialRecord.create).toHaveBeenCalledWith(
              expect.objectContaining({
                transactionType: 'invoice_generation',
                userId: invoiceData.userId,
                companyId: invoiceData.companyId,
                amount: expect.closeTo(expectedTotal, 2)
              })
            );

            // Verify result structure
            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('userId', invoiceData.userId);
            expect(result).toHaveProperty('companyId', invoiceData.companyId);
            expect(result).toHaveProperty('pdfUrl');

          } finally {
            // Restore original methods
            Invoice.findByPeriod = originalFindByPeriod;
            InvoiceService.getOrdersForPeriod = originalGetOrdersForPeriod;
            Invoice.create = originalInvoiceCreate;
            InvoiceService.generateInvoicePDF = originalGenerateInvoicePDF;
            Invoice.updatePdfUrl = originalUpdatePdfUrl;
            FinancialRecord.create = originalFinancialRecordCreate;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Additional property: Invoice calculation consistency
  test('invoice calculations are mathematically consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            finalAmount: fc.integer({ min: 100, max: 10000 })
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.record({
          taxRate: fc.integer({ min: 0, max: 50 }).map(x => x / 100), // 0% to 50%
          discount: fc.integer({ min: 0, max: 5000 })
        }),
        async (orders, params) => {
          // Ensure discount doesn't exceed subtotal to avoid negative totals
          const subtotal = orders.reduce((sum, order) => sum + order.finalAmount, 0);
          const adjustedParams = {
            ...params,
            discount: Math.min(params.discount, subtotal)
          };

          // Test the calculation logic directly
          const calculations = InvoiceService.calculateInvoiceTotals(orders, adjustedParams);

          // Verify mathematical consistency
          const expectedSubtotal = orders.reduce((sum, order) => sum + order.finalAmount, 0);
          const expectedTax = expectedSubtotal * adjustedParams.taxRate;
          const expectedTotal = expectedSubtotal + expectedTax - adjustedParams.discount;

          // All calculations should be mathematically correct
          expect(calculations.subtotal).toBeCloseTo(expectedSubtotal, 2);
          expect(calculations.tax).toBeCloseTo(expectedTax, 2);
          expect(calculations.discount).toBeCloseTo(adjustedParams.discount, 2);
          expect(calculations.total).toBeCloseTo(expectedTotal, 2);

          // Total should never be negative (business rule)
          expect(calculations.total).toBeGreaterThanOrEqual(0);

          // Subtotal should equal sum of all order amounts
          expect(calculations.subtotal).toBeCloseTo(
            orders.reduce((sum, order) => sum + order.finalAmount, 0),
            2
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Invoice period validation consistency
  test('invoice generation consistently validates periods', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          period: fc.record({
            from: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
            to: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
          })
        }),
        async (invoiceData) => {
          const fromDate = new Date(invoiceData.period.from);
          const toDate = new Date(invoiceData.period.to);
          const isValidPeriod = fromDate < toDate;

          // Mock dependencies to focus on validation
          const originalFindByPeriod = Invoice.findByPeriod;
          Invoice.findByPeriod = global.jest.fn().mockResolvedValue([]);

          try {
            if (!isValidPeriod) {
              // Should throw validation error for invalid periods
              await expect(InvoiceService.generateInvoice(invoiceData))
                .rejects
                .toThrow('Period "from" date must be before "to" date');
            }
            // For valid periods, we don't test the full flow in this property
          } finally {
            Invoice.findByPeriod = originalFindByPeriod;
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  // Property: Invoice completeness for all orders
  test('invoices include all orders from the specified period', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
          period: fc.record({
            from: fc.constant('2024-01-01'),
            to: fc.constant('2024-01-31')
          })
        }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 10, maxLength: 50 }).map(s => s.replace(/\s/g, 'x')).filter(s => s.length >= 10),
            finalAmount: fc.integer({ min: 100, max: 1000 }),
            deliveryDate: fc.constantFrom('2024-01-05', '2024-01-15', '2024-01-25'),
            status: fc.constant('delivered')
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (invoiceData, orders) => {
          // Mock dependencies
          const originalFindByPeriod = Invoice.findByPeriod;
          Invoice.findByPeriod = global.jest.fn().mockResolvedValue([]);

          const originalGetOrdersForPeriod = InvoiceService.getOrdersForPeriod;
          InvoiceService.getOrdersForPeriod = global.jest.fn().mockResolvedValue(orders);

          const originalInvoiceCreate = Invoice.create;
          Invoice.create = global.jest.fn().mockImplementation((data) => {
            return Promise.resolve({ id: `invoice_${Date.now()}`, ...data });
          });

          const originalGenerateInvoicePDF = InvoiceService.generateInvoicePDF;
          InvoiceService.generateInvoicePDF = global.jest.fn().mockResolvedValue('/storage/test.pdf');

          const originalUpdatePdfUrl = Invoice.updatePdfUrl;
          Invoice.updatePdfUrl = global.jest.fn().mockImplementation((id, pdfUrl) => {
            return Promise.resolve({ id, pdfUrl });
          });

          const originalFinancialRecordCreate = FinancialRecord.create;
          FinancialRecord.create = global.jest.fn().mockResolvedValue({ id: 'record_test' });

          try {
            await InvoiceService.generateInvoice(invoiceData);

            // Verify that the invoice includes ALL orders from the period
            const createCall = Invoice.create.mock.calls[0][0];
            const invoiceOrderIds = createCall.orders;

            // Every order should be included in the invoice
            expect(invoiceOrderIds).toHaveLength(orders.length);
            orders.forEach(order => {
              expect(invoiceOrderIds).toContain(order.id);
            });

          } finally {
            // Restore mocks
            Invoice.findByPeriod = originalFindByPeriod;
            InvoiceService.getOrdersForPeriod = originalGetOrdersForPeriod;
            Invoice.create = originalInvoiceCreate;
            InvoiceService.generateInvoicePDF = originalGenerateInvoicePDF;
            Invoice.updatePdfUrl = originalUpdatePdfUrl;
            FinancialRecord.create = originalFinancialRecordCreate;
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});