import { validateSchema, commonSchemas } from './validation.js';
import { ValidationError } from './errors.js';
import fc from 'fast-check';

describe('Validation Utils', () => {
  describe('validateSchema', () => {
    it('should validate correct email', () => {
      const validEmail = 'test@example.com';
      const result = validateSchema(commonSchemas.email, validEmail);
      expect(result).toBe(validEmail);
    });

    it('should throw ValidationError for invalid email', () => {
      const invalidEmail = 'invalid-email';
      expect(() => {
        validateSchema(commonSchemas.email, invalidEmail);
      }).toThrow(ValidationError);
    });

    it('should validate correct password', () => {
      const validPassword = 'Password123';
      const result = validateSchema(commonSchemas.password, validPassword);
      expect(result).toBe(validPassword);
    });

    it('should throw ValidationError for weak password', () => {
      const weakPassword = 'weak';
      expect(() => {
        validateSchema(commonSchemas.password, weakPassword);
      }).toThrow(ValidationError);
    });

    it('should validate Iranian phone numbers', () => {
      const validPhones = ['09123456789', '+989123456789', '9123456789'];
      
      validPhones.forEach(phone => {
        const result = validateSchema(commonSchemas.phone, phone);
        expect(result).toBe(phone);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123456789', '08123456789', '+1234567890'];
      
      invalidPhones.forEach(phone => {
        expect(() => {
          validateSchema(commonSchemas.phone, phone);
        }).toThrow(ValidationError);
      });
    });
  });

  describe('Property-based tests', () => {
    // Feature: tadbir-khowan, Property 1: Email validation consistency
    it('should consistently validate email format', () => {
      fc.assert(fc.property(
        fc.emailAddress().filter(email => email.length <= 254), // RFC limit
        (email) => {
          const result = validateSchema(commonSchemas.email, email);
          expect(result).toBe(email);
        }
      ), { numRuns: 50 });
    });

    // Feature: tadbir-khowan, Property 2: Password validation consistency  
    it('should consistently validate strong passwords', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 8, maxLength: 50 })
          .filter(s => /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s)),
        (password) => {
          const result = validateSchema(commonSchemas.password, password);
          expect(result).toBe(password);
        }
      ), { numRuns: 50 });
    });

    // Feature: tadbir-khowan, Property 3: User type validation consistency
    it('should consistently validate user types', () => {
      const validUserTypes = ['individual', 'company_admin', 'catering_manager', 'employee'];
      
      fc.assert(fc.property(
        fc.constantFrom(...validUserTypes),
        (userType) => {
          const result = validateSchema(commonSchemas.userType, userType);
          expect(result).toBe(userType);
        }
      ), { numRuns: 50 });
    });
  });
});