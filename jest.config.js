export default {
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'auth-service',
      testMatch: ['<rootDir>/services/auth/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'user-management-service',
      testMatch: ['<rootDir>/services/user-management/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'menu-management-service',
      testMatch: ['<rootDir>/services/menu-management/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'order-management-service',
      testMatch: ['<rootDir>/services/order-management/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'payment-service',
      testMatch: ['<rootDir>/services/payment/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'notification-service',
      testMatch: ['<rootDir>/services/notification/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'reporting-service',
      testMatch: ['<rootDir>/services/reporting/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
    {
      displayName: 'api-gateway',
      testMatch: ['<rootDir>/services/api-gateway/**/*.test.js'],
      testEnvironment: 'node',
      transform: {},
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
    },
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.config.js',
    '!**/server.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};