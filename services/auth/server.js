import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
  console.log(`${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'auth-service', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Simple auth routes for testing
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Mock successful login
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_123',
        email: email,
        userType: 'individual',
        firstName: 'Test',
        lastName: 'User'
      },
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: '24h'
    },
    message: 'ورود موفقیت‌آمیز بود'
  });
});

app.post('/auth/register', (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'All fields are required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Mock successful registration
  res.json({
    success: true,
    data: {
      user: {
        id: 'user_' + Date.now(),
        email: email,
        userType: 'individual',
        firstName: firstName,
        lastName: lastName
      },
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: '24h'
    },
    message: 'ثبت‌نام موفقیت‌آمیز بود'
  });
});

app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      }
    });
  }

  // Mock token refresh
  res.json({
    success: true,
    data: {
      accessToken: 'mock_access_token_' + Date.now(),
      refreshToken: 'mock_refresh_token_' + Date.now(),
      expiresIn: '24h'
    },
    message: 'Token تجدید شد'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('خطای غیرمنتظره', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'خطای داخلی سرور',
      timestamp: new Date().toISOString()
    }
  });
});

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

app.listen(PORT, () => {
  console.log(`🚀 Auth service در حال اجرا روی پورت ${PORT}`);
});

export default app;