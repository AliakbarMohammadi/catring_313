import Joi from 'joi';
import { ValidationError } from './errors.js';

export const validateSchema = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false });
  
  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    throw new ValidationError('Validation failed', details);
  }
  
  return value;
};

// Common validation schemas
export const commonSchemas = {
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    }),
  phone: Joi.string().pattern(/^(\+98|0)?9\d{9}$/).required()
    .messages({
      'string.pattern.base': 'Phone number must be a valid Iranian mobile number'
    }),
  uuid: Joi.string().uuid().required(),
  userType: Joi.string().valid('individual', 'company_admin', 'catering_manager', 'employee').required(),
  companyStatus: Joi.string().valid('pending', 'approved', 'rejected').required(),
  orderStatus: Joi.string().valid('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled').required(),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').required(),
};