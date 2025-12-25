// Mock shared module for testing
let AuthenticationError, AuthorizationError;

try {
  const shared = await import('@tadbir-khowan/shared');
  AuthenticationError = shared.AuthenticationError;
  AuthorizationError = shared.AuthorizationError;
} catch (error) {
  // Fallback for testing
  AuthenticationError = class extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthenticationError';
    }
  };
  
  AuthorizationError = class extends Error {
    constructor(message) {
      super(message);
      this.name = 'AuthorizationError';
    }
  };
}

// Define user roles and their permissions
const USER_ROLES = {
  INDIVIDUAL: 'individual',
  COMPANY_ADMIN: 'company_admin',
  CATERING_MANAGER: 'catering_manager',
  EMPLOYEE: 'employee',
};

// Define permissions for different resources and actions
const PERMISSIONS = {
  // User management permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  
  // Company management permissions
  COMPANY_READ: 'company:read',
  COMPANY_WRITE: 'company:write',
  COMPANY_APPROVE: 'company:approve',
  COMPANY_DELETE: 'company:delete',
  
  // Employee management permissions
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_WRITE: 'employee:write',
  EMPLOYEE_DELETE: 'employee:delete',
  
  // Menu management permissions
  MENU_READ: 'menu:read',
  MENU_WRITE: 'menu:write',
  MENU_DELETE: 'menu:delete',
  
  // Order management permissions
  ORDER_READ: 'order:read',
  ORDER_WRITE: 'order:write',
  ORDER_DELETE: 'order:delete',
  ORDER_MANAGE: 'order:manage',
  
  // Payment permissions
  PAYMENT_READ: 'payment:read',
  PAYMENT_WRITE: 'payment:write',
  
  // Reporting permissions
  REPORT_READ: 'report:read',
  REPORT_WRITE: 'report:write',
  
  // System administration permissions
  SYSTEM_ADMIN: 'system:admin',
};

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  [USER_ROLES.INDIVIDUAL]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE, // Own profile only
    PERMISSIONS.MENU_READ,
    PERMISSIONS.ORDER_READ, // Own orders only
    PERMISSIONS.ORDER_WRITE, // Own orders only
    PERMISSIONS.PAYMENT_READ, // Own payments only
    PERMISSIONS.PAYMENT_WRITE, // Own payments only
  ],
  
  [USER_ROLES.EMPLOYEE]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE, // Own profile only
    PERMISSIONS.MENU_READ,
    PERMISSIONS.ORDER_READ, // Own orders only
    PERMISSIONS.ORDER_WRITE, // Own orders only
    PERMISSIONS.PAYMENT_READ, // Own payments only
    PERMISSIONS.PAYMENT_WRITE, // Own payments only
  ],
  
  [USER_ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE, // Own profile only
    PERMISSIONS.COMPANY_READ, // Own company only
    PERMISSIONS.COMPANY_WRITE, // Own company only
    PERMISSIONS.EMPLOYEE_READ, // Own company employees only
    PERMISSIONS.EMPLOYEE_WRITE, // Own company employees only
    PERMISSIONS.EMPLOYEE_DELETE, // Own company employees only
    PERMISSIONS.MENU_READ,
    PERMISSIONS.ORDER_READ, // Company orders only
    PERMISSIONS.ORDER_WRITE, // Company orders only
    PERMISSIONS.PAYMENT_READ, // Company payments only
    PERMISSIONS.PAYMENT_WRITE, // Company payments only
    PERMISSIONS.REPORT_READ, // Company reports only
  ],
  
  [USER_ROLES.CATERING_MANAGER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_WRITE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.COMPANY_READ,
    PERMISSIONS.COMPANY_WRITE,
    PERMISSIONS.COMPANY_APPROVE,
    PERMISSIONS.COMPANY_DELETE,
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_WRITE,
    PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.MENU_READ,
    PERMISSIONS.MENU_WRITE,
    PERMISSIONS.MENU_DELETE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_WRITE,
    PERMISSIONS.ORDER_DELETE,
    PERMISSIONS.ORDER_MANAGE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_WRITE,
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_WRITE,
    PERMISSIONS.SYSTEM_ADMIN,
  ],
};

/**
 * Check if a user has a specific permission
 * @param {string} userType - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the user has the permission
 */
const hasPermission = (userType, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[userType];
  return rolePermissions ? rolePermissions.includes(permission) : false;
};

/**
 * Check if a user can access a resource based on ownership
 * @param {Object} user - The authenticated user
 * @param {Object} resource - The resource being accessed
 * @param {string} ownershipField - The field that indicates ownership (e.g., 'userId', 'companyId')
 * @returns {boolean} - Whether the user can access the resource
 */
const canAccessResource = (user, resource, ownershipField = 'userId') => {
  // Catering managers can access all resources
  if (user.userType === USER_ROLES.CATERING_MANAGER) {
    return true;
  }
  
  // Check ownership based on the specified field
  switch (ownershipField) {
    case 'userId':
      return resource.userId === user.userId;
    case 'companyId':
      return resource.companyId === user.companyId;
    default:
      return false;
  }
};

/**
 * Middleware to require authentication
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return next(new AuthenticationError('Authentication required'));
  }
  next();
};

/**
 * Middleware to require specific permissions
 * @param {string|string[]} requiredPermissions - Permission(s) required to access the resource
 * @returns {Function} - Express middleware function
 */
const requirePermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    const userHasPermission = permissions.some(permission => 
      hasPermission(req.user.userType, permission)
    );
    
    if (!userHasPermission) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Middleware to require specific roles
 * @param {string|string[]} allowedRoles - Role(s) allowed to access the resource
 * @returns {Function} - Express middleware function
 */
const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    if (!roles.includes(req.user.userType)) {
      return next(new AuthorizationError('Insufficient permissions'));
    }
    
    next();
  };
};

/**
 * Middleware to check resource ownership
 * @param {string} ownershipField - The field that indicates ownership
 * @param {Function} resourceGetter - Function to get the resource (optional)
 * @returns {Function} - Express middleware function
 */
const requireOwnership = (ownershipField = 'userId', resourceGetter = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    // Catering managers can access all resources
    if (req.user.userType === USER_ROLES.CATERING_MANAGER) {
      return next();
    }
    
    try {
      let resource;
      
      if (resourceGetter) {
        resource = await resourceGetter(req);
      } else {
        // Default: check if the resource ID matches the user's ownership field
        const resourceId = req.params.id || req.params.userId || req.params.companyId;
        
        switch (ownershipField) {
          case 'userId':
            if (resourceId !== req.user.userId) {
              return next(new AuthorizationError('Access denied: not resource owner'));
            }
            break;
          case 'companyId':
            if (resourceId !== req.user.companyId) {
              return next(new AuthorizationError('Access denied: not company member'));
            }
            break;
          default:
            return next(new AuthorizationError('Invalid ownership field'));
        }
      }
      
      if (resource && !canAccessResource(req.user, resource, ownershipField)) {
        return next(new AuthorizationError('Access denied: not resource owner'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

export {
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  canAccessResource,
  requireAuth,
  requirePermission,
  requireRole,
  requireOwnership,
};