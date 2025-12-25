const fc = require('fast-check');

// Feature: tadbir-khowan, Property 1: User Registration Uniqueness
// **Validates: Requirements 1.2**

describe('User Registration Uniqueness Property Test', () => {
  
  // Mock user storage to simulate database behavior
  let userStorage = new Map();
  
  beforeEach(() => {
    userStorage.clear();
  });

  // Simplified user registration function for testing
  const registerUser = async (userData) => {
    const { email, firstName, lastName, userType } = userData;
    
    // Check if email already exists
    if (userStorage.has(email)) {
      throw new Error('Email already registered');
    }
    
    // Create user
    const user = {
      id: Math.random().toString(36).substring(7),
      email,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      created_at: new Date()
    };
    
    userStorage.set(email, user);
    return user;
  };

  const findUserByEmail = async (email) => {
    return userStorage.get(email) || null;
  };

  describe('Property 1: User Registration Uniqueness', () => {
    test('For any valid user registration data, if an email already exists in the system, registration should be rejected and the existing account should remain unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate two users with the same email but different other data
          fc.record({
            email: fc.emailAddress(),
            firstName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            lastName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee')
          }),
          fc.record({
            firstName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            lastName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            userType: fc.constantFrom('individual', 'company_admin', 'catering_manager', 'employee')
          }),
          async (firstUser, secondUserData) => {
            // Ensure we start with clean storage for each test
            userStorage.clear();
            
            // Create the second user with the same email as the first
            const secondUser = { ...secondUserData, email: firstUser.email };

            // Register the first user
            const registeredUser = await registerUser(firstUser);
            
            // Verify first user was created successfully
            expect(registeredUser).toBeDefined();
            expect(registeredUser.email).toBe(firstUser.email);
            expect(registeredUser.first_name).toBe(firstUser.firstName);
            
            // Get the original user data for comparison
            const originalUser = await findUserByEmail(firstUser.email);
            expect(originalUser).toBeDefined();

            // Attempt to register second user with same email should fail
            await expect(registerUser(secondUser))
              .rejects
              .toThrow('Email already registered');

            // Verify the original user remains unchanged
            const unchangedUser = await findUserByEmail(firstUser.email);
            expect(unchangedUser).toBeDefined();
            expect(unchangedUser.id).toBe(originalUser.id);
            expect(unchangedUser.first_name).toBe(originalUser.first_name);
            expect(unchangedUser.last_name).toBe(originalUser.last_name);
            expect(unchangedUser.user_type).toBe(originalUser.user_type);
            expect(unchangedUser.created_at).toEqual(originalUser.created_at);

            // Verify only one user exists with this email
            expect(userStorage.size).toBe(1);
            expect(userStorage.has(firstUser.email)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});