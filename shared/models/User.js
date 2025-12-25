import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/database.js';
import bcrypt from 'bcrypt';

/**
 * مدل کاربر
 */
export class User extends Model {
  /**
   * بررسی رمز عبور
   * @param {string} password - رمز عبور خام
   * @returns {Promise<boolean>} - نتیجه مقایسه
   */
  async validatePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  /**
   * هش کردن رمز عبور
   * @param {string} password - رمز عبور خام
   * @returns {Promise<string>} - رمز عبور هش شده
   */
  static async hashPassword(password) {
    return bcrypt.hash(password, 12);
  }

  /**
   * بررسی اینکه آیا کاربر مدیر کترینگ است
   * @returns {boolean}
   */
  isCateringManager() {
    return this.user_type === 'catering_manager';
  }

  /**
   * بررسی اینکه آیا کاربر مدیر شرکت است
   * @returns {boolean}
   */
  isCompanyAdmin() {
    return this.user_type === 'company_admin';
  }

  /**
   * بررسی اینکه آیا کاربر عادی است
   * @returns {boolean}
   */
  isIndividualUser() {
    return this.user_type === 'individual_user';
  }

  /**
   * بررسی اینکه آیا کاربر فعال است
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * بررسی اینکه آیا ایمیل تأیید شده است
   * @returns {boolean}
   */
  isEmailVerified() {
    return this.email_verified === true;
  }

  /**
   * بررسی اینکه آیا حساب قفل است
   * @returns {boolean}
   */
  isLocked() {
    return this.locked_until && new Date() < this.locked_until;
  }

  /**
   * افزایش تعداد تلاش‌های ناموفق ورود
   */
  async incrementLoginAttempts() {
    this.login_attempts += 1;
    
    // قفل کردن حساب پس از 5 تلاش ناموفق
    if (this.login_attempts >= 5) {
      this.locked_until = new Date(Date.now() + 30 * 60 * 1000); // 30 دقیقه
    }
    
    await this.save();
  }

  /**
   * ریست کردن تلاش‌های ناموفق ورود
   */
  async resetLoginAttempts() {
    this.login_attempts = 0;
    this.locked_until = null;
    this.last_login = new Date();
    await this.save();
  }

  /**
   * تولید token تأیید ایمیل
   * @returns {string} - token تأیید
   */
  generateEmailVerificationToken() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.email_verification_token = token;
    return token;
  }

  /**
   * تولید token بازیابی رمز عبور
   * @returns {string} - token بازیابی
   */
  generatePasswordResetToken() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.password_reset_token = token;
    this.password_reset_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 ساعت
    return token;
  }

  /**
   * بررسی اعتبار token بازیابی رمز عبور
   * @param {string} token - token بازیابی
   * @returns {boolean} - اعتبار token
   */
  isValidPasswordResetToken(token) {
    return this.password_reset_token === token && 
           this.password_reset_expires && 
           new Date() < this.password_reset_expires;
  }

  /**
   * تنظیم رمز عبور جدید
   * @param {string} password - رمز عبور جدید
   */
  async setPassword(password) {
    this.password_hash = await User.hashPassword(password);
    this.password_reset_token = null;
    this.password_reset_expires = null;
  }

  /**
   * دریافت نام کامل
   * @returns {string} - نام کامل
   */
  getFullName() {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  /**
   * تبدیل به JSON امن (بدون اطلاعات حساس)
   * @returns {Object} - اطلاعات امن کاربر
   */
  toSafeJSON() {
    const { password_hash, password_reset_token, email_verification_token, ...safeData } = this.toJSON();
    return {
      ...safeData,
      full_name: this.getFullName()
    };
  }
}

// تعریف مدل
User.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^[+]?[\d\s\-()]+$/
    }
  },
  user_type: {
    type: DataTypes.ENUM('individual_user', 'company_admin', 'catering_manager'),
    allowNull: false,
    defaultValue: 'individual_user'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending_verification'),
    allowNull: false,
    defaultValue: 'pending_verification'
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  email_verification_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_token: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  password_reset_expires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  login_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['user_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['email_verification_token']
    },
    {
      fields: ['password_reset_token']
    }
  ],
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash && !user.password_hash.startsWith('$2b$')) {
        user.password_hash = await User.hashPassword(user.password_hash);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash') && !user.password_hash.startsWith('$2b$')) {
        user.password_hash = await User.hashPassword(user.password_hash);
      }
    }
  }
});

export default User;