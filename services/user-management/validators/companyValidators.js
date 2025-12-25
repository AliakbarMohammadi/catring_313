import Joi from 'joi';
import { COMPANY_STATUS } from '@tadbir-khowan/shared';

export const companyRegistrationSchema = Joi.object({
  name: Joi.string().min(2).max(255).required()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 255 characters',
      'any.required': 'Company name is required'
    }),
  
  registrationNumber: Joi.string().min(5).max(50).required()
    .messages({
      'string.min': 'Registration number must be at least 5 characters long',
      'string.max': 'Registration number cannot exceed 50 characters',
      'any.required': 'Registration number is required'
    }),
  
  address: Joi.string().min(10).max(500).required()
    .messages({
      'string.min': 'Address must be at least 10 characters long',
      'string.max': 'Address cannot exceed 500 characters',
      'any.required': 'Address is required'
    }),
  
  contactPerson: Joi.string().min(2).max(255).required()
    .messages({
      'string.min': 'Contact person name must be at least 2 characters long',
      'string.max': 'Contact person name cannot exceed 255 characters',
      'any.required': 'Contact person is required'
    }),
  
  email: Joi.string().email({ tlds: { allow: false } }).required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Iranian mobile number',
      'any.required': 'Phone number is required'
    })
});

export const companyUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Company name must be at least 2 characters long',
      'string.max': 'Company name cannot exceed 255 characters'
    }),
  
  address: Joi.string().min(10).max(500).optional()
    .messages({
      'string.min': 'Address must be at least 10 characters long',
      'string.max': 'Address cannot exceed 500 characters'
    }),
  
  contactPerson: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Contact person name must be at least 2 characters long',
      'string.max': 'Contact person name cannot exceed 255 characters'
    }),
  
  email: Joi.string().email({ tlds: { allow: false } }).optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  
  phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Iranian mobile number'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const companyApprovalSchema = Joi.object({
  action: Joi.string().valid('approve', 'reject').required()
    .messages({
      'any.only': 'Action must be either "approve" or "reject"',
      'any.required': 'Action is required'
    }),
  
  rejectionReason: Joi.when('action', {
    is: 'reject',
    then: Joi.string().min(10).max(500).required()
      .messages({
        'string.min': 'Rejection reason must be at least 10 characters long',
        'string.max': 'Rejection reason cannot exceed 500 characters',
        'any.required': 'Rejection reason is required when rejecting a company'
      }),
    otherwise: Joi.forbidden()
  })
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

export const companyStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(COMPANY_STATUS)).optional()
});