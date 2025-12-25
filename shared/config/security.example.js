// نمونه پیکربندی امنیتی برای سرویس‌های تدبیرخوان

export const securityConfig = {
  // تنظیمات JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'tadbir-khowan',
    audience: 'tadbir-khowan-users'
  },

  // تنظیمات رمزنگاری
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
    key: process.env.ENCRYPTION_KEY || 'your-encryption-key-must-be-32-chars-long!'
  },

  // تنظیمات رمز عبور
  password: {
    saltRounds: 12,
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    maxAge: 90, // روز
    historyCount: 5
  },

  // تنظیمات session
  session: {
    timeout: 24 * 60 * 60 * 1000, // ۲۴ ساعت
    cleanupInterval: 60 * 60 * 1000, // ۱ ساعت
    maxConcurrentSessions: 3
  },

  // تنظیمات Rate Limiting
  rateLimit: {
    // محدودیت عمومی
    general: {
      windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
      max: 100, // ۱۰۰ درخواست
      message: 'تعداد درخواست‌های شما از حد مجاز گذشته است'
    },
    
    // محدودیت ورود
    login: {
      windowMs: 15 * 60 * 1000, // ۱۵ دقیقه
      max: 5, // ۵ تلاش
      skipSuccessfulRequests: true,
      message: 'تعداد تلاش‌های ورود از حد مجاز گذشته است'
    },

    // محدودیت API حساس
    sensitive: {
      windowMs: 60 * 60 * 1000, // ۱ ساعت
      max: 10, // ۱۰ درخواست
      message: 'دسترسی به API های حساس محدود شده است'
    }
  },

  // تنظیمات تشخیص تهدید
  threatDetection: {
    failedLoginThreshold: 5,
    suspiciousIPThreshold: 3,
    rapidRequestThreshold: 100,
    dataAccessThreshold: 20,
    timeWindows: {
      short: 15 * 60 * 1000, // ۱۵ دقیقه
      medium: 60 * 60 * 1000, // ۱ ساعت
      long: 24 * 60 * 60 * 1000 // ۲۴ ساعت
    }
  },

  // تنظیمات CORS
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://tadbir-khowan.com',
      'https://app.tadbir-khowan.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200
  },

  // تنظیمات Audit Log
  auditLog: {
    retentionDays: 365,
    sensitiveActions: [
      'USER_LOGIN',
      'USER_LOGOUT',
      'FINANCIAL_TRANSACTION',
      'SENSITIVE_DATA_ACCESS',
      'SENSITIVE_DATA_CHANGE',
      'USER_ROLE_CHANGE',
      'DATA_DELETION',
      'DATA_EXPORT'
    ],
    cleanupInterval: 24 * 60 * 60 * 1000 // روزانه
  },

  // تنظیمات هشدارهای امنیتی
  alerts: {
    severityLevels: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    autoResolveAfter: 7 * 24 * 60 * 60 * 1000, // ۷ روز
    notificationChannels: {
      email: true,
      sms: false,
      webhook: false
    }
  },

  // تنظیمات IP مسدود شده
  ipBlocking: {
    tempBlockDuration: 30 * 60 * 1000, // ۳۰ دقیقه
    maxTempBlocks: 3, // بعد از ۳ بار، مسدودی دائمی
    whitelistedIPs: [
      '127.0.0.1',
      '::1'
    ]
  },

  // تنظیمات رمزنگاری داده‌های حساس
  sensitiveDataEncryption: {
    fields: [
      'password',
      'cardNumber',
      'cvv',
      'bankAccount',
      'nationalId',
      'phoneNumber'
    ],
    maskingPattern: '****'
  },

  // تنظیمات احراز هویت دو مرحله‌ای (2FA)
  twoFactorAuth: {
    enabled: false,
    methods: ['sms', 'email', 'totp'],
    tokenLength: 6,
    tokenExpiry: 5 * 60 * 1000, // ۵ دقیقه
    maxAttempts: 3
  },

  // تنظیمات نظارت امنیتی
  monitoring: {
    realTimeAlerts: true,
    logLevel: 'INFO',
    metricsCollection: true,
    performanceTracking: true
  }
};

// تابع اعتبارسنجی پیکربندی
export function validateSecurityConfig(config) {
  const errors = [];

  // بررسی کلید JWT
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    errors.push('کلید JWT باید حداقل ۳۲ کاراکتر باشد');
  }

  // بررسی کلید رمزنگاری
  if (!config.encryption.key || config.encryption.key.length !== 32) {
    errors.push('کلید رمزنگاری باید دقیقاً ۳۲ کاراکتر باشد');
  }

  // بررسی تنظیمات رمز عبور
  if (config.password.minLength < 6) {
    errors.push('حداقل طول رمز عبور نمی‌تواند کمتر از ۶ کاراکتر باشد');
  }

  // بررسی تنظیمات Rate Limiting
  if (config.rateLimit.general.max < 10) {
    errors.push('حداقل محدودیت نرخ درخواست نمی‌تواند کمتر از ۱۰ باشد');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// تابع بارگذاری پیکربندی از متغیرهای محیطی
export function loadSecurityConfigFromEnv() {
  return {
    ...securityConfig,
    jwt: {
      ...securityConfig.jwt,
      secret: process.env.JWT_SECRET || securityConfig.jwt.secret,
      expiresIn: process.env.JWT_EXPIRES_IN || securityConfig.jwt.expiresIn
    },
    encryption: {
      ...securityConfig.encryption,
      key: process.env.ENCRYPTION_KEY || securityConfig.encryption.key
    },
    password: {
      ...securityConfig.password,
      saltRounds: parseInt(process.env.PASSWORD_SALT_ROUNDS) || securityConfig.password.saltRounds,
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || securityConfig.password.minLength
    }
  };
}