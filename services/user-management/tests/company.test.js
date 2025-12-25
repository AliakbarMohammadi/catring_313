const { CompanyService } = require('../services/CompanyService.js');

describe('Company Service Basic Tests', () => {
  test('CompanyService can be instantiated', () => {
    const companyService = new CompanyService();
    expect(companyService).toBeDefined();
  });

  test('CompanyService has required methods', () => {
    const companyService = new CompanyService();
    expect(typeof companyService.registerCompany).toBe('function');
    expect(typeof companyService.getPendingCompanies).toBe('function');
    expect(typeof companyService.approveCompany).toBe('function');
    expect(typeof companyService.rejectCompany).toBe('function');
  });
});