import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment variables
dotenv.config({ path: join(__dirname, '..', '.env.test') });

// Make jest available globally for ES modules
global.jest = {
  fn: (implementation) => {
    const calls = [];
    const results = [];
    let mockReturnValue = undefined;
    let mockImplementation = implementation;

    const mockFn = (...args) => {
      calls.push(args);
      
      let result;
      let error;
      
      try {
        if (mockImplementation) {
          result = mockImplementation(...args);
        } else {
          result = mockReturnValue;
        }
        results.push({ type: 'return', value: result });
        return result;
      } catch (err) {
        error = err;
        results.push({ type: 'throw', value: error });
        throw error;
      }
    };

    // Mock function properties
    mockFn.mockReturnValue = (value) => {
      mockReturnValue = value;
      mockImplementation = null;
      return mockFn;
    };

    mockFn.mockResolvedValue = (value) => {
      mockReturnValue = Promise.resolve(value);
      mockImplementation = null;
      return mockFn;
    };

    mockFn.mockRejectedValue = (value) => {
      mockReturnValue = Promise.reject(value);
      mockImplementation = null;
      return mockFn;
    };

    mockFn.mockImplementation = (fn) => {
      mockImplementation = fn;
      mockReturnValue = undefined;
      return mockFn;
    };

    mockFn.mockClear = () => {
      calls.length = 0;
      results.length = 0;
      return mockFn;
    };

    mockFn.mockReset = () => {
      mockFn.mockClear();
      mockImplementation = implementation;
      mockReturnValue = undefined;
      return mockFn;
    };

    // Mock object with call tracking
    mockFn.mock = {
      get calls() { return calls; },
      get results() { return results; }
    };

    return mockFn;
  }
};

// Add Jest matchers for expect
global.expect.extend({
  toHaveBeenCalled(received) {
    const pass = received.mock && received.mock.calls.length > 0;
    return {
      pass,
      message: () => pass 
        ? `Expected mock function not to have been called, but it was called ${received.mock.calls.length} times`
        : 'Expected mock function to have been called, but it was not called'
    };
  },

  toHaveBeenCalledWith(received, ...expectedArgs) {
    if (!received.mock) {
      return {
        pass: false,
        message: () => 'Expected value to be a mock function'
      };
    }

    const calls = received.mock.calls;
    const pass = calls.some(call => {
      if (call.length !== expectedArgs.length) return false;
      return call.every((arg, index) => {
        const expected = expectedArgs[index];
        if (expected && typeof expected === 'object' && expected.asymmetricMatch) {
          return expected.asymmetricMatch(arg);
        }
        return JSON.stringify(arg) === JSON.stringify(expected);
      });
    });

    return {
      pass,
      message: () => pass
        ? `Expected mock function not to have been called with ${JSON.stringify(expectedArgs)}`
        : `Expected mock function to have been called with ${JSON.stringify(expectedArgs)}, but it was called with: ${calls.map(call => JSON.stringify(call)).join(', ')}`
    };
  },

  toBeCloseTo(received, expected, precision = 2) {
    const pass = Math.abs(received - expected) < Math.pow(10, -precision) / 2;
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be close to ${expected}`
        : `Expected ${received} to be close to ${expected}`
    };
  },

  closeTo(expected, precision = 2) {
    return {
      asymmetricMatch: (actual) => Math.abs(actual - expected) < Math.pow(10, -precision) / 2,
      toString: () => `closeTo(${expected}, ${precision})`
    };
  },

  objectContaining(expected) {
    return {
      asymmetricMatch: (actual) => {
        if (!actual || typeof actual !== 'object') return false;
        return Object.keys(expected).every(key => {
          const expectedValue = expected[key];
          const actualValue = actual[key];
          if (expectedValue && typeof expectedValue === 'object' && expectedValue.asymmetricMatch) {
            return expectedValue.asymmetricMatch(actualValue);
          }
          return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
        });
      },
      toString: () => `objectContaining(${JSON.stringify(expected)})`
    };
  },

  stringContaining(expected) {
    return {
      asymmetricMatch: (actual) => typeof actual === 'string' && actual.includes(expected),
      toString: () => `stringContaining("${expected}")`
    };
  }
});

// Make expect matchers available globally
global.expect.closeTo = (expected, precision) => ({
  asymmetricMatch: (actual) => Math.abs(actual - expected) < Math.pow(10, -precision) / 2,
  toString: () => `closeTo(${expected}, ${precision})`
});

global.expect.objectContaining = (expected) => ({
  asymmetricMatch: (actual) => {
    if (!actual || typeof actual !== 'object') return false;
    return Object.keys(expected).every(key => {
      const expectedValue = expected[key];
      const actualValue = actual[key];
      if (expectedValue && typeof expectedValue === 'object' && expectedValue.asymmetricMatch) {
        return expectedValue.asymmetricMatch(actualValue);
      }
      return JSON.stringify(actualValue) === JSON.stringify(expectedValue);
    });
  },
  toString: () => `objectContaining(${JSON.stringify(expected)})`
});

global.expect.stringContaining = (expected) => ({
  asymmetricMatch: (actual) => typeof actual === 'string' && actual.includes(expected),
  toString: () => `stringContaining("${expected}")`
});

// Global test setup
beforeAll(async () => {
  // Setup test database or mock services if needed
});

afterAll(async () => {
  // Cleanup after all tests
});

// Global test utilities
global.testUtils = {
  generateTestPayment: () => ({
    orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    amount: Math.floor(Math.random() * 100000) + 1000, // 1000-101000
    method: ['credit_card', 'bank_transfer', 'wallet'][Math.floor(Math.random() * 3)]
  }),
  
  generateTestInvoice: () => ({
    userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    companyId: Math.random() > 0.5 ? `company_${Date.now()}` : null,
    period: {
      from: '2024-01-01',
      to: '2024-01-31'
    }
  }),

  generateTestOrder: () => ({
    id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: `user_${Date.now()}`,
    deliveryDate: '2024-01-15',
    finalAmount: Math.floor(Math.random() * 50000) + 5000,
    status: 'delivered',
    items: [
      {
        foodItemId: `food_${Date.now()}`,
        quantity: Math.floor(Math.random() * 5) + 1,
        unitPrice: Math.floor(Math.random() * 10000) + 1000,
        totalPrice: 0
      }
    ]
  })
};