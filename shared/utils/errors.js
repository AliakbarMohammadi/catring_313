import { v4 as uuidv4 } from 'uuid';

export class AppError extends Error {
  constructor(message, statusCode, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = uuidv4();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code || 'UNKNOWN_ERROR',
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
        requestId: this.requestId,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class BusinessLogicError extends AppError {
  constructor(message, details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}

// Error handling middleware
export const errorHandler = (error, req, res, next) => {
  // If it's an operational error, send the error response
  if (error.isOperational) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // For non-operational errors, log them and send generic error
  console.error('Non-operational error:', error);
  
  const genericError = new InternalServerError();
  return res.status(500).json(genericError.toJSON());
};