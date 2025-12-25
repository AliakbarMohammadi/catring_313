const { 
  USER_ROLES, 
  PERMISSIONS, 
  hasPermission, 
  canAccessResource,
  requireRole,
  requirePermission 
} = require('../middleware/rbac.js');

describe('RBAC (Role-Based Access Control)', () => {
  describe('hasPermission', () => {
    test('should grant catering manager all permissions', () => {
      expect(hasPermission(USER_ROLES.CATERING_MANAGER, PERMISSIONS.SYSTEM_ADMIN)).toBe(true);
      expect(hasPermission(USER_ROLES.CATERING_MANAGER, PERMISSIONS.COMPANY_APPROVE)).toBe(true);
      expect(hasPermission(USER_ROLES.CATERING_MANAGER, PERMISSIONS.ORDER_MANAGE)).toBe(true);
    });

    test('should grant company admin appropriate permissions', () => {
      expect(hasPermission(USER_ROLES.COMPANY_ADMIN, PERMISSIONS.EMPLOYEE_WRITE)).toBe(true);
      expect(hasPermission(USER_ROLES.COMPANY_ADMIN, PERMISSIONS.COMPANY_READ)).toBe(true);
      expect(hasPermission(USER_ROLES.COMPANY_ADMIN, PERMISSIONS.SYSTEM_ADMIN)).toBe(false);
    });

    test('should grant individual user basic permissions only', () => {
      expect(hasPermission(USER_ROLES.INDIVIDUAL, PERMISSIONS.USER_READ)).toBe(true);
      expect(hasPermission(USER_ROLES.INDIVIDUAL, PERMISSIONS.MENU_READ)).toBe(true);
      expect(hasPermission(USER_ROLES.INDIVIDUAL, PERMISSIONS.COMPANY_APPROVE)).toBe(false);
      expect(hasPermission(USER_ROLES.INDIVIDUAL, PERMISSIONS.SYSTEM_ADMIN)).toBe(false);
    });

    test('should grant employee same permissions as individual', () => {
      expect(hasPermission(USER_ROLES.EMPLOYEE, PERMISSIONS.USER_READ)).toBe(true);
      expect(hasPermission(USER_ROLES.EMPLOYEE, PERMISSIONS.ORDER_WRITE)).toBe(true);
      expect(hasPermission(USER_ROLES.EMPLOYEE, PERMISSIONS.EMPLOYEE_DELETE)).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    const cateringManager = { userId: 'cm1', userType: USER_ROLES.CATERING_MANAGER };
    const companyAdmin = { userId: 'ca1', companyId: 'comp1', userType: USER_ROLES.COMPANY_ADMIN };
    const individual = { userId: 'ind1', userType: USER_ROLES.INDIVIDUAL };

    test('should allow catering manager to access any resource', () => {
      const resource = { userId: 'other', companyId: 'other' };
      expect(canAccessResource(cateringManager, resource, 'userId')).toBe(true);
      expect(canAccessResource(cateringManager, resource, 'companyId')).toBe(true);
    });

    test('should allow users to access their own resources', () => {
      const userResource = { userId: 'ind1' };
      expect(canAccessResource(individual, userResource, 'userId')).toBe(true);
      
      const otherUserResource = { userId: 'other' };
      expect(canAccessResource(individual, otherUserResource, 'userId')).toBe(false);
    });

    test('should allow company admin to access company resources', () => {
      const companyResource = { companyId: 'comp1' };
      expect(canAccessResource(companyAdmin, companyResource, 'companyId')).toBe(true);
      
      const otherCompanyResource = { companyId: 'other' };
      expect(canAccessResource(companyAdmin, otherCompanyResource, 'companyId')).toBe(false);
    });
  });

  describe('middleware functions', () => {
    let req, res, next;

    beforeEach(() => {
      req = { user: null };
      res = {};
      next = jest.fn();
    });

    describe('requireRole', () => {
      test('should allow access for correct role', () => {
        req.user = { userType: USER_ROLES.CATERING_MANAGER };
        const middleware = requireRole(USER_ROLES.CATERING_MANAGER);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith();
      });

      test('should deny access for incorrect role', () => {
        req.user = { userType: USER_ROLES.INDIVIDUAL };
        const middleware = requireRole(USER_ROLES.CATERING_MANAGER);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
          name: 'AuthorizationError'
        }));
      });

      test('should require authentication', () => {
        req.user = null;
        const middleware = requireRole(USER_ROLES.INDIVIDUAL);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
          name: 'AuthenticationError'
        }));
      });
    });

    describe('requirePermission', () => {
      test('should allow access for users with permission', () => {
        req.user = { userType: USER_ROLES.CATERING_MANAGER };
        const middleware = requirePermission(PERMISSIONS.SYSTEM_ADMIN);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith();
      });

      test('should deny access for users without permission', () => {
        req.user = { userType: USER_ROLES.INDIVIDUAL };
        const middleware = requirePermission(PERMISSIONS.SYSTEM_ADMIN);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith(expect.objectContaining({
          name: 'AuthorizationError'
        }));
      });

      test('should work with multiple permissions (OR logic)', () => {
        req.user = { userType: USER_ROLES.INDIVIDUAL };
        const middleware = requirePermission([PERMISSIONS.USER_READ, PERMISSIONS.SYSTEM_ADMIN]);
        
        middleware(req, res, next);
        
        expect(next).toHaveBeenCalledWith(); // Should pass because user has USER_READ
      });
    });
  });
});