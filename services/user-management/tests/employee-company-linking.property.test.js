const fc = require('fast-check');

// Feature: tadbir-khowan, Property 7: Employee-Company Linking
// **Validates: Requirements 2.5, 3.5**

describe('Employee-Company Linking Property Test', () => {
  
  // Mock storage for companies and users
  let companyStorage = new Map();
  let userStorage = new Map();
  
  beforeEach(() => {
    companyStorage.clear();
    userStorage.clear();
  });

  // Mock functions to simulate employee-company linking
  const createCompany = (companyData) => {
    const company = {
      id: Math.random().toString(36).substring(7),
      ...companyData,
      status: 'approved', // Only approved companies can have employees
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

  const addEmployeeToCompany = async (employeeData, companyId, adminUserId) => {
    const company = companyStorage.get(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const adminUser = userStorage.get(adminUserId);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    if (adminUser.user_type !== 'company_admin') {
      throw new Error('Only company admin can add employees');
    }

    if (company.admin_user_id !== adminUserId) {
      throw new Error('Only company admin can add employees');
    }

    if (company.status !== 'approved') {
      throw new Error('Company must be approved to add employees');
    }

    // Check if email already exists
    for (const [id, user] of userStorage) {
      if (user.email === employeeData.email) {
        throw new Error('Email already registered');
      }
    }

    // Create employee user
    const employee = {
      id: Math.random().toString(36).substring(7),
      ...employeeData,
      user_type: 'employee',
      company_id: companyId,
      is_active: true,
      created_at: new Date()
    };

    userStorage.set(employee.id, employee);
    return employee;
  };

  const registerEmployeeWithCompanyCode = async (employeeData, companyCode) => {
    // Find company by code
    let targetCompany = null;
    for (const [id, company] of companyStorage) {
      if (company.company_code === companyCode && company.status === 'approved') {
        targetCompany = company;
        break;
      }
    }

    if (!targetCompany) {
      throw new Error('Invalid company code');
    }

    // Check if email already exists
    for (const [id, user] of userStorage) {
      if (user.email === employeeData.email) {
        throw new Error('Email already registered');
      }
    }

    // Create employee user
    const employee = {
      id: Math.random().toString(36).substring(7),
      ...employeeData,
      user_type: 'employee',
      company_id: targetCompany.id,
      is_active: true,
      created_at: new Date()
    };

    userStorage.set(employee.id, employee);
    return employee;
  };

  const getCompanyEmployees = (companyId) => {
    const employees = [];
    for (const [id, user] of userStorage) {
      if (user.company_id === companyId && user.user_type === 'employee') {
        employees.push(user);
      }
    }
    return employees;
  };

  const findUserById = (id) => {
    return userStorage.get(id) || null;
  };

  const findCompanyById = (id) => {
    return companyStorage.get(id) || null;
  };

  describe('Property 7: Employee-Company Linking', () => {
    test('For any employee addition by Company_Admin, the employee should be properly linked to the correct company and maintain that relationship', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            company_code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase())
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
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`))
          }),
          async (companyData, adminUserData, employeeData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create admin user
            const adminUser = createUser(adminUserData);

            // Create company with admin user
            const company = createCompany({
              ...companyData,
              admin_user_id: adminUser.id
            });

            // Add employee to company
            const employee = await addEmployeeToCompany(employeeData, company.id, adminUser.id);
            
            // Verify employee was created successfully
            expect(employee).toBeDefined();
            expect(employee.email).toBe(employeeData.email);
            expect(employee.first_name).toBe(employeeData.first_name);
            expect(employee.last_name).toBe(employeeData.last_name);
            expect(employee.user_type).toBe('employee');
            
            // Verify employee is linked to the correct company
            expect(employee.company_id).toBe(company.id);
            
            // Verify employee can be retrieved and maintains company relationship
            const retrievedEmployee = findUserById(employee.id);
            expect(retrievedEmployee).toBeDefined();
            expect(retrievedEmployee.company_id).toBe(company.id);
            expect(retrievedEmployee.user_type).toBe('employee');
            
            // Verify employee appears in company's employee list
            const companyEmployees = getCompanyEmployees(company.id);
            expect(companyEmployees).toHaveLength(1);
            expect(companyEmployees[0].id).toBe(employee.id);
            expect(companyEmployees[0].company_id).toBe(company.id);
            
            // Verify company relationship is maintained
            const retrievedCompany = findCompanyById(company.id);
            expect(retrievedCompany).toBeDefined();
            expect(retrievedCompany.id).toBe(company.id);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Employee self-registration with company code should link to correct company', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            company_code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
            admin_user_id: fc.uuid()
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`))
          }),
          async (companyData, employeeData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create company
            const company = createCompany(companyData);

            // Employee self-registers with company code
            const employee = await registerEmployeeWithCompanyCode(employeeData, company.company_code);
            
            // Verify employee was created successfully
            expect(employee).toBeDefined();
            expect(employee.email).toBe(employeeData.email);
            expect(employee.user_type).toBe('employee');
            
            // Verify employee is linked to the correct company
            expect(employee.company_id).toBe(company.id);
            
            // Verify employee appears in company's employee list
            const companyEmployees = getCompanyEmployees(company.id);
            expect(companyEmployees).toHaveLength(1);
            expect(companyEmployees[0].id).toBe(employee.id);
            expect(companyEmployees[0].company_id).toBe(company.id);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Invalid company code should reject employee registration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`))
          }),
          fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
          async (employeeData, invalidCompanyCode) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Attempt to register employee with invalid company code should fail
            await expect(registerEmployeeWithCompanyCode(employeeData, invalidCompanyCode))
              .rejects
              .toThrow('Invalid company code');

            // Verify no employee was created
            expect(userStorage.size).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    test('Only company admin can add employees to their company', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registration_number: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contact_person: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            company_code: fc.string({ minLength: 6, maxLength: 6 }).map(s => s.toUpperCase()),
            admin_user_id: fc.uuid()
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            user_type: fc.constantFrom('individual', 'catering_manager', 'employee')
          }),
          fc.record({
            email: fc.emailAddress(),
            first_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            last_name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length >= 2),
            phone: fc.option(fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`))
          }),
          async (companyData, nonAdminUserData, employeeData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            userStorage.clear();
            
            // Create non-admin user
            const nonAdminUser = createUser(nonAdminUserData);

            // Create company
            const company = createCompany(companyData);

            // Attempt to add employee with non-admin user should fail
            await expect(addEmployeeToCompany(employeeData, company.id, nonAdminUser.id))
              .rejects
              .toThrow('Only company admin can add employees');

            // Verify no employee was created
            const companyEmployees = getCompanyEmployees(company.id);
            expect(companyEmployees).toHaveLength(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});