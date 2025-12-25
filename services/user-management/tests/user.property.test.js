const fc = require('fast-check');
const { UserService } = require('../services/UserService.js');
const { UserRepository } = require('../repositories/UserRepository.js');
const { CompanyRepository } = require('../repositories/CompanyRepository.js');
const { pool } = require('../config/database.js');
const { USER_TYPES } = require('@tadbir-khowan/shared');

// Feature: tadbir-khowan, Property 1: User Registration Uniqueness
// **Validates: Requirements 1.2**

describe('User Registration Property Tests', () => {
  let userService;
  let userRepository;
  let companyRepository;

  beforeAll(async () => {
    userService = new UserService();
    userRepository = new UserRepository();
    companyRepository = new CompanyRepository();
    
    // Initialize test database tables
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM companies');
  });

  describe('Property 1: User Registration Uniqueness', () => {
    test('For any valid user registration data, if an email already exists in the system, registration should be rejected and the existing account should remain unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two users with the same email but different other data
          fc.record({
            email: fc.emailAddress(),
            password: fc.string({ minLength: 8 }).filter(pwd => 
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)
            ),
            firstName: fc.string({ minLength: 2, maxLength: 50 }),
            lastName: fc.string({ minLength: 2, maxLength: 50 }),
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`)),
            userType: fc.constantFrom(...Object.values(USER_TYPES))
          }),
          fc.record({
            password: fc.string({ minLength: 8 }).filter(pwd => 
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pwd)
            ),
            firstName: fc.string({ minLength: 2, maxLength: 50 }),
            lastName: fc.string({ minLength: 2, maxLength: 50 }),
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`)),
            userType: fc.constantFrom(...Object.values(USER_TYPES))
          }),
          async (firstUser, secondUserData) => {
            // Create the second user with the same email as the first
            const secondUser = { ...secondUserData, email: firstUser.email };

            // Register the first user
            const registeredUser = await userService.registerUser(firstUser);
            
            // Verify first user was created successfully
            expect(registeredUser).toBeDefined();
            expect(registeredUser.email).toBe(firstUser.email);
            expect(registeredUser.first_name).toBe(firstUser.firstName);
            
            // Get the original user data for comparison
            const originalUser = await userRepository.findByEmail(firstUser.email);
            expect(originalUser).toBeDefined();

            // Attempt to register second user with same email should fail
            await expect(userService.registerUser(secondUser))
              .rejects
              .toThrow('Email already registered');

            // Verify the original user remains unchanged
            const unchangedUser = await userRepository.findByEmail(firstUser.email);
            expect(unchangedUser).toBeDefined();
            expect(unchangedUser.id).toBe(originalUser.id);
            expect(unchangedUser.first_name).toBe(originalUser.first_name);
            expect(unchangedUser.last_name).toBe(originalUser.last_name);
            expect(unchangedUser.user_type).toBe(originalUser.user_type);
            expect(unchangedUser.created_at).toEqual(originalUser.created_at);

            // Verify only one user exists with this email
            const allUsersWithEmail = await pool.query(
              'SELECT COUNT(*) as count FROM users WHERE email = $1',
              [firstUser.email]
            );
            expect(parseInt(allUsersWithEmail.rows[0].count)).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

async function setupTestDatabase() {
  // Create test tables if they don't exist
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('individual', 'company_admin', 'catering_manager', 'employee')),
      company_id UUID,
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      phone_verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  const createCompaniesTable = `
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      registration_number VARCHAR(50) UNIQUE NOT NULL,
      address TEXT,
      contact_person VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_user_id UUID,
      company_code VARCHAR(10) UNIQUE,
      rejection_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      approved_at TIMESTAMP WITH TIME ZONE
    )
  `;

  try {
    await pool.query(createUsersTable);
    await pool.query(createCompaniesTable);
  } catch (error) {
    console.log('Tables might already exist:', error.message);
  }
}

async function cleanupTestDatabase() {
  try {
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.query('DROP TABLE IF EXISTS companies CASCADE');
  } catch (error) {
    console.log('Cleanup error:', error.message);
  }
}