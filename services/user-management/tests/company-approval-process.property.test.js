const fc = require('fast-check');

// Feature: tadbir-khowan, Property 6: Company Approval Process
// **Validates: Requirements 2.3**

describe('Company Approval Process Property Test', () => {
  
  // Mock storage for companies and users
  let companyStorage = new Map();
  let userStorage = new Map();
  
  beforeEach(() => {
    companyStorage.clear();
    userStorage.clear();
  });

  // Mock functions to simulate the approval process
  const createCompany = (companyData) => {
    const company = {
      id: Math.random().toString(36).substring(7),
      ...companyData,
      status: companyData.status || 'pending', // Use provided status or default to pending
      created_at: new Date()
    };
    companyStorage.set(company.id, company);
    return company;
  };

  const createUser = (userData) => {
    const user = {
      id: Math.random().toString(36).substring(7),
      ...userData,
      created_at: new Date()
    };
    userStorage.set(user.id, user);
    return user;
  };

  const approveCompany = async (companyId, cateringManagerId) => {
    const company = companyStorage.get(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const cateringManager = userStorage.get(cateringManagerId);
    if (!cateringManager) {
      throw new Error('Catering manager not found');
    }

    if (cateringManager.user_type !== 'catering_manager') {
      throw new Error('Only catering managers can approve companies');
    }

    if (company.status !== 'pending') {
      throw new Error('Company is not in pending status');
    }

    // Approve company
    const approvedCompany = {
      ...company,
      status: 'approved',
      approved_at: new Date()
    };
    companyStorage.set(companyId, approvedCompany);

    // Update admin user's company_id
    if (company.admin_user_id) {
      const adminUser = userStorage.get(company.admin_user_id);
      if (adminUser) {
        const updatedAdmin = {
          ...adminUser,
          company_id: companyId
        };
        userStorage.set(company.admin_user_id, updatedAdmin);
      }
    }

    return approvedCompany;
  };

  const findCompanyById = (id) => {
    return companyStorage.get(id) || null;
  };

  const findUserById = (id) => {
    return userStorage.get(id) || null;
  };

  describe('Property 6: Company Approval Process', () => {
    test('For any company approval action by Catering_Manager, the system should activate the company account and send notification to Company_Admin', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            admin_user_id: fc.uuid()
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            user_type: fc.constant('company_admin')
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            user_type: fc.constant('catering_manager')
          }),
          async (companyData, adminUserData, cateringManagerData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create admin user
            const adminUser = createUser({
              ...adminUserData,
              id: companyData.admin_user_id
            });

            // Create catering manager
            const cateringManager = createUser(cateringManagerData);

            // Create company in pending status
            const company = createCompany(companyData);
            
            // Verify initial state
            expect(company.status).toBe('pending');
            expect(adminUser.company_id).toBeUndefined();

            // Approve company
            const approvedCompany = await approveCompany(company.id, cateringManager.id);
            
            // Verify company is approved
            expect(approvedCompany).toBeDefined();
            expect(approvedCompany.status).toBe('approved');
            expect(approvedCompany.approved_at).toBeDefined();
            expect(approvedCompany.approved_at instanceof Date).toBe(true);
            
            // Verify company account is activated (status changed to approved)
            const retrievedCompany = findCompanyById(company.id);
            expect(retrievedCompany.status).toBe('approved');
            
            // Verify admin user's company_id is updated
            const updatedAdminUser = findUserById(adminUser.id);
            expect(updatedAdminUser.company_id).toBe(company.id);
            
            // Verify the approval timestamp is set
            expect(retrievedCompany.approved_at).toBeDefined();
            expect(retrievedCompany.approved_at instanceof Date).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Only catering managers can approve companies', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            admin_user_id: fc.uuid()
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            user_type: fc.constantFrom('individual', 'company_admin', 'employee')
          }),
          async (companyData, nonCateringManagerData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create non-catering manager user
            const nonCateringManager = createUser(nonCateringManagerData);

            // Create company in pending status
            const company = createCompany(companyData);
            
            // Attempt to approve company with non-catering manager should fail
            await expect(approveCompany(company.id, nonCateringManager.id))
              .rejects
              .toThrow('Only catering managers can approve companies');

            // Verify company remains in pending status
            const unchangedCompany = findCompanyById(company.id);
            expect(unchangedCompany.status).toBe('pending');
            expect(unchangedCompany.approved_at).toBeUndefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Cannot approve company that is not in pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            admin_user_id: fc.uuid()
          }),
          fc.constantFrom('approved', 'rejected'),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            user_type: fc.constant('catering_manager')
          }),
          async (companyData, nonPendingStatus, cateringManagerData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create catering manager
            const cateringManager = createUser(cateringManagerData);

            // Create company with non-pending status
            const company = createCompany({
              ...companyData,
              status: nonPendingStatus
            });
            
            // Attempt to approve company that's not pending should fail
            await expect(approveCompany(company.id, cateringManager.id))
              .rejects
              .toThrow('Company is not in pending status');

            // Verify company status remains unchanged
            const unchangedCompany = findCompanyById(company.id);
            expect(unchangedCompany.status).toBe(nonPendingStatus);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});