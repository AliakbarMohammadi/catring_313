import express from 'express';
import { UserService } from '../services/UserService.js';
import { validateSchema } from '@tadbir-khowan/shared';
import {
  userRegistrationSchema,
  userProfileUpdateSchema,
  changePasswordSchema,
  bulkEmployeeSchema,
  paginationSchema,
  companyCodeValidationSchema
} from '../validators/userValidators.js';

const router = express.Router();
const userService = new UserService();

// User registration
router.post('/register', async (req, res, next) => {
  try {
    const validatedData = validateSchema(userRegistrationSchema, req.body);
    const user = await userService.registerUser(validatedData);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await userService.getUserProfile(userId);
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const validatedData = validateSchema(userProfileUpdateSchema, req.body);
    const updatedUser = await userService.updateUserProfile(userId, validatedData);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
});

// Change password
router.put('/password/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const validatedData = validateSchema(changePasswordSchema, req.body);
    const result = await userService.changePassword(
      userId, 
      validatedData.currentPassword, 
      validatedData.newPassword
    );
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
});

// Add employees to company (bulk)
router.post('/companies/:companyId/employees', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { adminUserId } = req.query; // In real app, this would come from JWT token
    const validatedData = validateSchema(bulkEmployeeSchema, req.body);
    
    const result = await userService.addEmployeesToCompany(
      companyId, 
      validatedData.employees, 
      adminUserId
    );
    
    res.status(201).json({
      success: true,
      message: 'Employees processed',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get company employees
router.get('/companies/:companyId/employees', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { adminUserId } = req.query; // In real app, this would come from JWT token
    const validatedQuery = validateSchema(paginationSchema, req.query);
    
    const result = await userService.getCompanyEmployees(
      companyId, 
      adminUserId, 
      validatedQuery.page, 
      validatedQuery.limit
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate user
router.put('/:userId/deactivate', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { adminUserId } = req.query; // In real app, this would come from JWT token
    
    const result = await userService.deactivateUser(userId, adminUserId);
    
    res.json({
      success: true,
      message: 'User deactivated successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Validate company code
router.post('/validate-company-code', async (req, res, next) => {
  try {
    const validatedData = validateSchema(companyCodeValidationSchema, req.body);
    const userService = new UserService();
    const companyService = userService.companyRepository;
    
    const company = await companyService.findByCompanyCode(validatedData.companyCode);
    
    res.json({
      success: true,
      data: {
        valid: !!company,
        companyName: company ? company.name : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get users by IDs (for internal service communication)
router.post('/batch', async (req, res, next) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds must be a non-empty array'
      });
    }
    
    const users = await userService.getUsersByIds(userIds);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
});

export default router;