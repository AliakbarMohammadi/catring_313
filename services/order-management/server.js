import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler, createLogger } from '@tadbir-khowan/shared';
import { initializeDatabase } from './config/database.js';
import orderRoutes from './routes/orders.js';
import statusRoutes from './routes/status.js';
import reportRoutes from './routes/reports.js';

dotenv.config();

const logger = createLogger('order-management-service');

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'order-management-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/orders', orderRoutes);
app.use('/orders/status', statusRoutes);
app.use('/orders/reports', reportRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
    }
  });
});

app.listen(PORT, async () => {
  logger.info(`Order Management service running on port ${PORT}`);
  
  // Initialize database connection
  const dbInitialized = await initializeDatabase();
  if (dbInitialized) {
    logger.info('Database initialized successfully');
  } else {
    logger.error('Failed to initialize database');
  }
});

export default app;