import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler, createLogger } from '@tadbir-khowan/shared';
import { initializeDatabase } from './config/database.js';
import foodItemRoutes from './routes/foodItems.js';
import menuRoutes from './routes/menus.js';
import publishingRoutes from './routes/publishing.js';

dotenv.config();

const logger = createLogger('menu-management-service');

const app = express();
const PORT = process.env.PORT || 3003;

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
  res.json({ status: 'OK', service: 'menu-management-service', timestamp: new Date().toISOString() });
});

// Routes
app.use('/menu/items', foodItemRoutes);
app.use('/menu', menuRoutes);
app.use('/menu/publishing', publishingRoutes);

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
  logger.info(`Menu Management service running on port ${PORT}`);
  
  // Initialize database connection
  const dbInitialized = await initializeDatabase();
  if (dbInitialized) {
    logger.info('Database initialized successfully');
  } else {
    logger.error('Failed to initialize database');
  }
});

export default app;