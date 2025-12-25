import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { createLogger } from './logger.js';

const logger = createLogger('encryption-service');

// پیکربندی رمزنگاری
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SALT_ROUNDS = 12;
const IV_LENGTH = 16; // برای AES، IV همیشه ۱۶ بایت است
const TAG_LENGTH = 16; // برای GCM mode
const KEY_LENGTH = 32; // ۲۵۶ بیت

export class EncryptionService {
  constructor() {
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * دریافت کلید رمزنگاری از متغیر محیطی
   */
  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('کلید رمزنگاری در متغیر محیطی ENCRYPTION_KEY تعریف نشده است');
    }
    
    // اگر کلید به اندازه کافی نیست، از hash استفاده می‌کنیم
    if (key.length < KEY_LENGTH) {
      return crypto.createHash('sha256').update(key).digest();
    }
    
    return Buffer.from(key.slice(0, KEY_LENGTH));
  }

  /**
   * رمزنگاری داده‌های حساس
   * @param {string} plaintext - متن خام برای رمزنگاری
   * @returns {string} - داده رمزنگاری شده به فرمت base64
   */
  encrypt(plaintext) {
    try {
      if (!plaintext) {
        throw new Error('متن برای رمزنگاری نمی‌تواند خالی باشد');
      }

      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
      cipher.setAAD(Buffer.from('tadbir-khowan-auth', 'utf8'));

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();

      // ترکیب IV، tag و داده رمزنگاری شده
      const combined = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);
      
      logger.debug('داده با موفقیت رمزنگاری شد');
      return combined.toString('base64');

    } catch (error) {
      logger.error('خطا در رمزنگاری داده', { error: error.message });
      throw new Error(`رمزنگاری ناموفق: ${error.message}`);
    }
  }

  /**
   * رمزگشایی داده‌های رمزنگاری شده
   * @param {string} encryptedData - داده رمزنگاری شده به فرمت base64
   * @returns {string} - متن خام رمزگشایی شده
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) {
        throw new Error('داده رمزنگاری شده نمی‌تواند خالی باشد');
      }

      const combined = Buffer.from(encryptedData, 'base64');
      
      // جداسازی IV، tag و داده رمزنگاری شده
      const iv = combined.slice(0, IV_LENGTH);
      const tag = combined.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = combined.slice(IV_LENGTH + TAG_LENGTH);

      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
      decipher.setAAD(Buffer.from('tadbir-khowan-auth', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('داده با موفقیت رمزگشایی شد');
      return decrypted;

    } catch (error) {
      logger.error('خطا در رمزگشایی داده', { error: error.message });
      throw new Error(`رمزگشایی ناموفق: ${error.message}`);
    }
  }

  /**
   * هش کردن رمز عبور
   * @param {string} password - رمز عبور خام
   * @returns {Promise<string>} - رمز عبور هش شده
   */
  async hashPassword(password) {
    try {
      if (!password) {
        throw new Error('رمز عبور نمی‌تواند خالی باشد');
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      logger.debug('رمز عبور با موفقیت هش شد');
      return hashedPassword;

    } catch (error) {
      logger.error('خطا در هش کردن رمز عبور', { error: error.message });
      throw new Error(`هش کردن رمز عبور ناموفق: ${error.message}`);
    }
  }

  /**
   * تأیید رمز عبور
   * @param {string} password - رمز عبور خام
   * @param {string} hashedPassword - رمز عبور هش شده
   * @returns {Promise<boolean>} - نتیجه مقایسه
   */
  async verifyPassword(password, hashedPassword) {
    try {
      if (!password || !hashedPassword) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hashedPassword);
      logger.debug('رمز عبور تأیید شد', { isValid });
      return isValid;

    } catch (error) {
      logger.error('خطا در تأیید رمز عبور', { error: error.message });
      return false;
    }
  }

  /**
   * تولید کلید تصادفی امن
   * @param {number} length - طول کلید به بایت
   * @returns {string} - کلید تصادفی به فرمت hex
   */
  generateSecureKey(length = 32) {
    try {
      const key = crypto.randomBytes(length).toString('hex');
      logger.debug('کلید امن تولید شد', { length });
      return key;
    } catch (error) {
      logger.error('خطا در تولید کلید امن', { error: error.message });
      throw new Error(`تولید کلید امن ناموفق: ${error.message}`);
    }
  }

  /**
   * تولید hash امن برای داده‌ها
   * @param {string} data - داده برای hash
   * @param {string} algorithm - الگوریتم hash (پیش‌فرض: sha256)
   * @returns {string} - hash به فرمت hex
   */
  generateHash(data, algorithm = 'sha256') {
    try {
      if (!data) {
        throw new Error('داده برای hash نمی‌تواند خالی باشد');
      }

      const hash = crypto.createHash(algorithm).update(data).digest('hex');
      logger.debug('Hash تولید شد', { algorithm });
      return hash;

    } catch (error) {
      logger.error('خطا در تولید hash', { error: error.message });
      throw new Error(`تولید hash ناموفق: ${error.message}`);
    }
  }

  /**
   * رمزنگاری اطلاعات پرداخت
   * @param {object} paymentData - اطلاعات پرداخت
   * @returns {string} - اطلاعات پرداخت رمزنگاری شده
   */
  encryptPaymentData(paymentData) {
    try {
      // حذف اطلاعات حساس قبل از رمزنگاری
      const sensitiveData = {
        cardNumber: paymentData.cardNumber,
        cvv: paymentData.cvv,
        expiryDate: paymentData.expiryDate
      };

      const jsonData = JSON.stringify(sensitiveData);
      const encrypted = this.encrypt(jsonData);

      logger.info('اطلاعات پرداخت رمزنگاری شد');
      return encrypted;

    } catch (error) {
      logger.error('خطا در رمزنگاری اطلاعات پرداخت', { error: error.message });
      throw error;
    }
  }

  /**
   * رمزگشایی اطلاعات پرداخت
   * @param {string} encryptedPaymentData - اطلاعات پرداخت رمزنگاری شده
   * @returns {object} - اطلاعات پرداخت رمزگشایی شده
   */
  decryptPaymentData(encryptedPaymentData) {
    try {
      const decryptedJson = this.decrypt(encryptedPaymentData);
      const paymentData = JSON.parse(decryptedJson);

      logger.info('اطلاعات پرداخت رمزگشایی شد');
      return paymentData;

    } catch (error) {
      logger.error('خطا در رمزگشایی اطلاعات پرداخت', { error: error.message });
      throw error;
    }
  }

  /**
   * ماسک کردن اطلاعات حساس برای نمایش
   * @param {string} data - داده حساس
   * @param {number} visibleChars - تعداد کاراکترهای قابل مشاهده
   * @returns {string} - داده ماسک شده
   */
  maskSensitiveData(data, visibleChars = 4) {
    try {
      if (!data || data.length <= visibleChars) {
        return '*'.repeat(data?.length || 4);
      }

      const visible = data.slice(-visibleChars);
      const masked = '*'.repeat(data.length - visibleChars);
      
      return masked + visible;

    } catch (error) {
      logger.error('خطا در ماسک کردن داده', { error: error.message });
      return '****';
    }
  }
}

// نمونه singleton برای استفاده در سراسر برنامه
let _encryptionService = null;

export const encryptionService = {
  get instance() {
    if (!_encryptionService) {
      _encryptionService = new EncryptionService();
    }
    return _encryptionService;
  }
};