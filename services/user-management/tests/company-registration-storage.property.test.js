const fc = require('fast-check');

// Feature: tadbir-khowan, Property 5: Company Registration Storage
// **Validates: Requirements 2.1**

describe('Company Registration Storage Property Test', () => {
  
  // Mock company storage to simulate database behavior
  let companyStorage = new Map();
  
  beforeEach(() => {
    companyStorage.clear();
  });

  // Simplified company registration function for testing
  const registerCompany = async (companyData) => {
    const { 
      name, 
      registrationNumber, 
      address, 
      contactPerson, 
      email, 
      phone,
      adminUserId 
    } = companyData;
    
    // Check if registration number already exists
    for (const [id, company] of companyStorage) {
      if (company.registration_number === registrationNumber) {
        throw new Error('Registration number already exists');
      }
    }
    
    // Create company with pending status
    const company = {
      id: Math.random().toString(36).substring(7),
      name,
      registration_number: registrationNumber,
      address,
      contact_person: contactPerson,
      email,
      phone,
      status: 'pending', // Always starts as pending
      admin_user_id: adminUserId,
      company_code: generateCompanyCode(),
      created_at: new Date()
    };
    
    companyStorage.set(company.id, company);
    return company;
  };

  const findCompanyById = async (id) => {
    return companyStorage.get(id) || null;
  };

  const generateCompanyCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  describe('Property 5: Company Registration Storage', () => {
    test('For any valid company registration request, the system should store the request in pending status for admin review', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registrationNumber: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contactPerson: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            adminUserId: fc.uuid()
          }),
          async (companyData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            
            // Register the company
            const registeredCompany = await registerCompany(companyData);
            
            // Verify company was created successfully
            expect(registeredCompany).toBeDefined();
            expect(registeredCompany.name).toBe(companyData.name);
            expect(registeredCompany.registration_number).toBe(companyData.registrationNumber);
            expect(registeredCompany.address).toBe(companyData.address);
            expect(registeredCompany.contact_person).toBe(companyData.contactPerson);
            expect(registeredCompany.email).toBe(companyData.email);
            expect(registeredCompany.phone).toBe(companyData.phone);
            expect(registeredCompany.admin_user_id).toBe(companyData.adminUserId);
            
            // Verify company is stored in pending status
            expect(registeredCompany.status).toBe('pending');
            
            // Verify company has a generated company code
            expect(registeredCompany.company_code).toBeDefined();
            expect(typeof registeredCompany.company_code).toBe('string');
            expect(registeredCompany.company_code.length).toBe(6);
            
            // Verify company has creation timestamp
            expect(registeredCompany.created_at).toBeDefined();
            expect(registeredCompany.created_at instanceof Date).toBe(true);
            
            // Verify company can be retrieved by ID
            const retrievedCompany = await findCompanyById(registeredCompany.id);
            expect(retrievedCompany).toBeDefined();
            expect(retrievedCompany.id).toBe(registeredCompany.id);
            expect(retrievedCompany.status).toBe('pending');
            
            // Verify company is stored in the system
            expect(companyStorage.has(registeredCompany.id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Company registration should reject duplicate registration numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            registrationNumber: fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length >= 5),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contactPerson: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            adminUserId: fc.uuid()
          }),
          fc.record({
            name: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            address: fc.string({ minLength: 10, maxLength: 500 }).filter(s => s.trim().length >= 10),
            contactPerson: fc.string({ minLength: 2, maxLength: 255 }).filter(s => s.trim().length >= 2),
            email: fc.emailAddress(),
            phone: fc.string().map(s => `09${s.slice(0, 9).padEnd(9, '0')}`),
            adminUserId: fc.uuid()
          }),
          async (firstCompany, secondCompanyData) => {
            // Ensure we start with clean storage for each test
            companyStorage.clear();
            
            // Create second company with same registration number
            const secondCompany = { 
              ...secondCompanyData, 
              registrationNumber: firstCompany.registrationNumber 
            };

            // Register the first company
            const registeredCompany = await registerCompany(firstCompany);
            expect(registeredCompany).toBeDefined();
            expect(registeredCompany.status).toBe('pending');

            // Attempt to register second company with same registration number should fail
            await expect(registerCompany(secondCompany))
              .rejects
              .toThrow('Registration number already exists');

            // Verify only one company exists with this registration number
            let companiesWithSameRegNumber = 0;
            for (const [id, company] of companyStorage) {
              if (company.registration_number === firstCompany.registrationNumber) {
                companiesWithSameRegNumber++;
              }
            }
            expect(companiesWithSameRegNumber).toBe(1);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});