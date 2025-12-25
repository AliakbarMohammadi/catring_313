// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup after all tests
});

// Mock external services for testing
global.mockEmailService = {
  sendEmail: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-message-id'
  })
};

global.mockSMSService = {
  sendSMS: jest.fn().mockResolvedValue({
    success: true,
    messageId: 'test-sms-id'
  })
};