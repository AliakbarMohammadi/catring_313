import Joi from 'joi';
import { USER_TYPES } from '@tadbir-khowan/shared';

export const userRegistrationSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'Password is required'
    }),
  
  firstName: Joi.string().min(2).max(50).required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required'
    }),
  
  lastName: Joi.string().min(2).max(50).required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required'
    }),
  
  phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Iranian mobile number'
    }),
  
  userType: Joi.string().valid(...Object.values(USER_TYPES)).required()
    .messages({
      'any.only': 'User type must be one of: individual, company_admin, catering_manager, employee',
      'any.required': 'User type is required'
    }),
  
  companyCode: Joi.when('userType', {
    is: USER_TYPES.EMPLOYEE,
    then: Joi.string().length(6).alphanum().uppercase().required()
      .messages({
        'string.length': 'Company code must be exactly 6 characters',
        'string.alphanum': 'Company code must contain only letters and numbers',
        'any.required': 'Company code is required for employee registration'
      }),
    otherwise: Joi.forbidden()
  })
});

export const userProfileUpdateSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name cannot exceed 50 characters'
    }),
  
  lastName: Joi.string().min(2).max(50).optional()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name cannot exceed 50 characters'
    }),
  
  phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Iranian mobile number'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required()
    .messages({
      'any.required': 'Current password is required'
    }),
  
  newPassword: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, and one number',
      'any.required': 'New password is required'
    })
});

export const bulkEmployeeSchema = Joi.object({
  employees: Joi.array().items(
    Joi.object({
      email: Joi.string().email({ tlds: { allow: false } }).required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      
      firstName: Joi.string().min(2).max(50).required()
        .messages({
          'string.min': 'First name must be at least 2 characters long',
          'string.max': 'First name cannot exceed 50 characters',
          'any.required': 'First name is required'
        }),
      
      lastName: Joi.string().min(2).max(50).required()
        .messages({
          'string.min': 'Last name must be at least 2 characters long',
          'string.max': 'Last name cannot exceed 50 characters',
          'any.required': 'Last name is required'
        }),
      
      phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).optional()
        .messages({
          'string.pattern.base': 'Phone number must be a valid Iranian mobile number'
        })
    })
  ).min(1).max(100).required()
    .messages({
      'array.min': 'At least one employee must be provided',
      'array.max': 'Cannot add more than 100 employees at once',
      'any.required': 'Employees array is required'
    })
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50)
});

export const companyCodeValidationSchema = Joi.object({
  companyCode: Joi.string().length(6).alphanum().uppercase().required()
    .messages({
      'string.length': 'Company code must be exactly 6 characters',
      'string.alphanum': 'Company code must contain only letters and numbers',
      'any.required': 'Company code is required'
    })
});