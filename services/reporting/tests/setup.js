// راه‌اندازی کلی تست‌ها
beforeAll(async () => {
  // تنظیم محیط تست
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // پاک‌سازی پس از تمام تست‌ها
});

// Mock سرویس‌های خارجی برای تست
global.mockReportingService = {
  generateSalesReport: jest.fn(),
  getDashboardAnalytics: jest.fn(),
  getInventoryReport: jest.fn()
};

global.mockAnalytics = {
  getDashboardMetrics: jest.fn(),
  getInventoryAnalytics: jest.fn(),
  getCustomerAnalytics: jest.fn(),
  getRevenueAnalytics: jest.fn()
};