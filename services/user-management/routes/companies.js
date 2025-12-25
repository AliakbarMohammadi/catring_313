import express from 'express';
import { CompanyService } from '../services/CompanyService.js';
import { validateSchema } from '@tadbir-khowan/shared';
import {
  companyRegistrationSchema,
  companyUpdateSchema,
  companyApprovalSchema,
  paginationSchema
} from '../validators/companyValidators.js';

const router = express.Router();
const companyService = new CompanyService();

// Company registration
router.post('/register', async (req, res, next) => {
  try {
    const { adminUserId } = req.query; // In real app, this would come from JWT token
    const validatedData = validateSchema(companyRegistrationSchema, req.body);
    
    const company = await companyService.registerCompany(validatedData, adminUserId);
    
    res.status(201).json({
      success: true,
      message: 'Company registration submitted for approval',
      data: company
    });
  } catch (error) {
    next(error);
  }
});

// Get pending companies (for catering managers)
router.get('/pending', async (req, res, next) => {
  try {
    const validatedQuery = validateSchema(paginationSchema, req.query);
    const result = await companyService.getPendingCompanies(
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

// Get approved companies
router.get('/approved', async (req, res, next) => {
  try {
    const validatedQuery = validateSchema(paginationSchema, req.query);
    const result = await companyService.getApprovedCompanies(
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

// Approve or reject company
router.put('/:companyId/status', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { cateringManagerId } = req.query; // In real app, this would come from JWT token
    const validatedData = validateSchema(companyApprovalSchema, req.body);
    
    let result;
    if (validatedData.action === 'approve') {
      result = await companyService.approveCompany(companyId, cateringManagerId);
    } else {
      result = await companyService.rejectCompany(
        companyId, 
        cateringManagerId, 
        validatedData.rejectionReason
      );
    }
    
    res.json({
      success: true,
      message: `Company ${validatedData.action}d successfully`,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get company by ID
router.get('/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { requestingUserId } = req.query; // In real app, this would come from JWT token
    
    const company = await companyService.getCompanyById(companyId, requestingUserId);
    
    res.json({
      success: true,
      data: company
    });
  } catch (error) {
    next(error);
  }
});

// Update company
router.put('/:companyId', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { requestingUserId } = req.query; // In real app, this would come from JWT token
    const validatedData = validateSchema(companyUpdateSchema, req.body);
    
    const updatedCompany = await companyService.updateCompany(
      companyId, 
      validatedData, 
      requestingUserId
    );
    
    res.json({
      success: true,
      message: 'Company updated successfully',
      data: updatedCompany
    });
  } catch (error) {
    next(error);
  }
});

// Validate company code
router.get('/validate/:companyCode', async (req, res, next) => {
  try {
    const { companyCode } = req.params;
    const result = await companyService.validateCompanyCode(companyCode);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// Get company statistics
router.get('/:companyId/stats', async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { requestingUserId } = req.query; // In real app, this would come from JWT token
    
    const stats = await companyService.getCompanyStats(companyId, requestingUserId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

export default router;