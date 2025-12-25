import { hashPassword, comparePassword, generateTokens, verifyToken } from './auth.js';
import { AuthenticationError } from './errors.js';
import fc from 'fast-check';

describe('Auth Utils', () => {
  describe('Password hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hashedPassword = await hashPassword(password);
      const isValid = await comparePassword(password, hashedPassword);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hashedPassword = await hashPassword(password);
      const isValid = await comparePassword(wrongPassword, hashedPassword);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate valid tokens', () => {
      const payload = { userId: '123', userType: 'individual' };
      const { accessToken, refreshToken } = generateTokens(payload);
      
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(typeof refreshToken).toBe('string');
    });

    it('should verify valid token', () => {
      const payload = { userId: '123', userType: 'individual' };
      const { accessToken } = generateTokens(payload);
      const decoded = verifyToken(accessToken);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.userType).toBe(payload.userType);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        verifyToken(invalidToken);
      }).toThrow(AuthenticationError);
    });
  });

  describe('Property-based tests', () => {
    // Feature: tadbir-khowan, Property 4: Password hashing consistency
    it('should consistently hash and verify passwords', async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 50 }),
        async (password) => {
          const hashedPassword = await hashPassword(password);
          const isValid = await comparePassword(password, hashedPassword);
          expect(isValid).toBe(true);
          
          // Different password should not match
          const wrongPassword = password + 'wrong';
          const isInvalid = await comparePassword(wrongPassword, hashedPassword);
          expect(isInvalid).toBe(false);
        }
      ), { numRuns: 10 }); // Reduced runs for async operations
    }, 15000); // Increased timeout

    // Feature: tadbir-khowan, Property 5: Token generation and verification consistency
    it('should consistently generate and verify tokens', () => {
      fc.assert(fc.property(
        fc.record({
          userId: fc.uuid(),
          userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee'),
          email: fc.emailAddress()
        }),
        (payload) => {
          const { accessToken } = generateTokens(payload);
          const decoded = verifyToken(accessToken);
          
          expect(decoded.userId).toBe(payload.userId);
          expect(decoded.userType).toBe(payload.userType);
          expect(decoded.email).toBe(payload.email);
        }
      ), { numRuns: 50 });
    });
  });
});