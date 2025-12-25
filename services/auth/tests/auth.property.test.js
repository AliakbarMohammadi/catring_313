const fc = require('fast-check');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock shared module functions
const mockShared = {
  generateTokens: (payload) => {
    const secret = 'test-jwt-secret-key';
    const accessToken = jwt.sign(payload, secret, { expiresIn: '24h' });
    const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
    return { accessToken, refreshToken };
  },
  verifyToken: (token) => {
    const secret = 'test-jwt-secret-key';
    return jwt.verify(token, secret);
  },
  comparePassword: async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
  },
  hashPassword: async (password) => {
    return await bcrypt.hash(password, 12);
  },
  AuthenticationError: class extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
  ValidationError: class extends Error {
    constructor(message) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  NotFoundError: class extends Error {
    constructor(message) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
};

// Mock the shared module
jest.mock('@tadbir-khowan/shared', () => mockShared);

const AuthService = require('../services/AuthService.js');
const UserRepository = require('../repositories/UserRepository.js');
const TokenRepository = require('../repositories/TokenRepository.js');

describe('Authentication Property Tests', () => {
  let authService;
  let userRepository;
  let tokenRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    tokenRepository = new TokenRepository();
    authService = new AuthService();
    authService.userRepository = userRepository;
    authService.tokenRepository = tokenRepository;
  });

  afterEach(async () => {
    await userRepository.clear();
    await tokenRepository.clear();
  });

  describe('Property 2: Authentication Success Consistency', () => {
    // Feature: tadbir-khowan, Property 2: Authentication Success Consistency
    // **Validates: Requirements 1.3**
    
    test('For any valid user credentials, authentication should always succeed and grant appropriate access based on user type', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid user data
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee'),
            companyId: fc.option(fc.string(), { nil: null }),
            tenantId: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async (userData) => {
            // Setup: Create user with hashed password
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            const user = await userRepository.addUser({
              ...userData,
              password: hashedPassword,
              isActive: true
            });

            // Act: Attempt login with original password
            const result = await authService.login(userData.email, userData.password);

            // Assert: Login should succeed and return proper structure
            expect(result).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.expiresIn).toBe('24h');

            // Assert: User data should match (without password)
            expect(result.user.id).toBe(user.id);
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.user.userType).toBe(userData.userType);
            expect(result.user.companyId).toBe(userData.companyId);
            expect(result.user.tenantId).toBe(userData.tenantId);

            // Assert: Password should not be included in response
            expect(result.user.password).toBeUndefined();

            // Assert: Tokens should be valid strings
            expect(typeof result.accessToken).toBe('string');
            expect(typeof result.refreshToken).toBe('string');
            expect(result.accessToken.length).toBeGreaterThan(0);
            expect(result.refreshToken.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Authentication Failure Consistency', () => {
    // Feature: tadbir-khowan, Property 3: Authentication Failure Consistency
    // **Validates: Requirements 1.4**
    
    test('For any invalid user credentials, authentication should always fail and deny access', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid user data for setup
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee'),
            companyId: fc.option(fc.string(), { nil: null }),
            tenantId: fc.string({ minLength: 1, maxLength: 50 })
          }),
          // Generate wrong password
          fc.string({ minLength: 1, maxLength: 50 }),
          async (userData, wrongPassword) => {
            // Ensure wrong password is different from correct password
            fc.pre(wrongPassword !== userData.password);

            // Setup: Create user with hashed password
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            await userRepository.addUser({
              ...userData,
              password: hashedPassword,
              isActive: true
            });

            // Test Case: Wrong password with correct email
            try {
              await authService.login(userData.email, wrongPassword);
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              expect(error.name).toBe('AuthenticationError');
              expect(error.message).toBe('Invalid email or password');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('For any inactive user, authentication should always fail', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid user data
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8, maxLength: 50 }),
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            phone: fc.string({ minLength: 10, maxLength: 15 }),
            userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee'),
            companyId: fc.option(fc.string(), { nil: null }),
            tenantId: fc.string({ minLength: 1, maxLength: 50 })
          }),
          async (userData) => {
            // Setup: Create inactive user
            const hashedPassword = await bcrypt.hash(userData.password, 12);
            await userRepository.addUser({
              ...userData,
              password: hashedPassword,
              isActive: false // User is inactive
            });

            // Act & Assert: Attempt login should fail
            try {
              await authService.login(userData.email, userData.password);
              // If we reach here, the test should fail
              expect(true).toBe(false);
            } catch (error) {
              expect(error.name).toBe('AuthenticationError');
              expect(error.message).toBe('Account is deactivated');
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});