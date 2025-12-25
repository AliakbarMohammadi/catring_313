import cors from 'cors';
import rateLimit from 'express-rate-limit';

/**
 * Simple authentication middleware
 */
export const authenticateToken = (req, res, next) => {
  // For development, we'll skip authentication
  // In production, implement proper JWT verification
  req.user = { id: 1, role: 'individual' };
  next();
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    // For development, we'll skip role checking
    // In production, implement proper role verification
    next();
  };
};

/**
 * Create rate limiter
 */
export const createRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Request logging middleware
 */
export const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};

/**
 * Attack detection middleware
 */
export const detectAttacks = (req, res, next) => {
  // Simple attack detection - in production, implement proper security
  next();
};

/**
 * Secure CORS middleware
 */
export const secureCORS = (allowedOrigins) => {
  return cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });
};