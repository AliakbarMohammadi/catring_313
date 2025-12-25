import { sequelize } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from './logger.js';

const logger = createLogger('audit-logger');

/**
 * سیستم لاگ‌گیری حسابرسی برای ردیابی تمام عملیات حساس
 */
export class AuditLogger {
  /**
   * ثبت لاگ حسابرسی
   * @param {object} auditData - اطلاعات لاگ حسابرسی
   */
  static async log(auditData) {
    try {
      const {
        userId,
        action,
        resource,
        resourceId,
        details = {},
        ipAddress,
        userAgent,
        success = true,
        errorMessage = null
      } = auditData;

      // اعتبارسنجی داده‌های ورودی
      if (!action || !resource) {
        throw new Error('action و resource الزامی هستند');
      }

      const auditId = uuidv4();
      const timestamp = new Date();

      // ثبت در پایگاه داده (فعلاً فقط لاگ می‌کنیم)
      logger.info('لاگ حسابرسی', {
        auditId,
        userId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        success,
        errorMessage,
        timestamp
      });

      logger.info('لاگ حسابرسی ثبت شد', {
        auditId,
        userId,
        action,
        resource,
        success
      });

      return auditId;

    } catch (error) {
      logger.error('خطا در ثبت لاگ حسابرسی', { 
        error: error.message,
        auditData 
      });
      // در صورت خطا در لاگ‌گیری، خطا را پرتاب نمی‌کنیم تا عملیات اصلی متوقف نشود
    }
  }

  /**
   * ثبت لاگ ورود کاربر
   */
  static async logUserLogin(userId, ipAddress, userAgent, success = true, errorMessage = null) {
    return await this.log({
      userId,
      action: 'USER_LOGIN',
      resource: 'authentication',
      resourceId: userId,
      details: { loginAttempt: true },
      ipAddress,
      userAgent,
      success,
      errorMessage
    });
  }

  /**
   * ثبت لاگ خروج کاربر
   */
  static async logUserLogout(userId, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'USER_LOGOUT',
      resource: 'authentication',
      resourceId: userId,
      details: { logoutAction: true },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ تراکنش مالی
   */
  static async logFinancialTransaction(userId, transactionType, amount, orderId, paymentId, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'FINANCIAL_TRANSACTION',
      resource: 'payment',
      resourceId: paymentId,
      details: {
        transactionType,
        amount,
        orderId,
        currency: 'IRR'
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ تغییر داده‌های حساس
   */
  static async logSensitiveDataChange(userId, dataType, resourceId, oldValue, newValue, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'SENSITIVE_DATA_CHANGE',
      resource: dataType,
      resourceId,
      details: {
        oldValue: this.sanitizeForLog(oldValue),
        newValue: this.sanitizeForLog(newValue),
        changeType: 'update'
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ دسترسی به داده‌های حساس
   */
  static async logSensitiveDataAccess(userId, dataType, resourceId, accessType, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'SENSITIVE_DATA_ACCESS',
      resource: dataType,
      resourceId,
      details: {
        accessType, // 'read', 'export', 'print'
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ تلاش دسترسی غیرمجاز
   */
  static async logUnauthorizedAccess(userId, attemptedAction, resource, resourceId, ipAddress, userAgent, reason) {
    return await this.log({
      userId,
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      resource,
      resourceId,
      details: {
        attemptedAction,
        reason,
        blocked: true
      },
      ipAddress,
      userAgent,
      success: false,
      errorMessage: `دسترسی غیرمجاز: ${reason}`
    });
  }

  /**
   * ثبت لاگ تغییر نقش کاربر
   */
  static async logRoleChange(adminUserId, targetUserId, oldRole, newRole, ipAddress, userAgent) {
    return await this.log({
      userId: adminUserId,
      action: 'USER_ROLE_CHANGE',
      resource: 'user',
      resourceId: targetUserId,
      details: {
        oldRole,
        newRole,
        targetUserId,
        adminAction: true
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ حذف داده
   */
  static async logDataDeletion(userId, dataType, resourceId, deletedData, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'DATA_DELETION',
      resource: dataType,
      resourceId,
      details: {
        deletedData: this.sanitizeForLog(deletedData),
        permanent: true
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * ثبت لاگ صادرات داده
   */
  static async logDataExport(userId, dataType, exportFormat, recordCount, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'DATA_EXPORT',
      resource: dataType,
      resourceId: null,
      details: {
        exportFormat,
        recordCount,
        exportedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
      success: true
    });
  }

  /**
   * دریافت لاگ‌های حسابرسی بر اساس فیلتر
   */
  static async getAuditLogs(filters = {}) {
    try {
      const {
        userId,
        action,
        resource,
        startDate,
        endDate,
        success,
        limit = 100,
        offset = 0
      } = filters;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramCount = 0;

      if (userId) {
        paramCount++;
        whereClause += ` AND user_id = $${paramCount}`;
        params.push(userId);
      }

      if (action) {
        paramCount++;
        whereClause += ` AND action = $${paramCount}`;
        params.push(action);
      }

      if (resource) {
        paramCount++;
        whereClause += ` AND resource = $${paramCount}`;
        params.push(resource);
      }

      if (startDate) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(startDate);
      }

      if (endDate) {
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(endDate);
      }

      if (success !== undefined) {
        paramCount++;
        whereClause += ` AND success = $${paramCount}`;
        params.push(success);
      }

      const result = await query(`
        SELECT 
          id, user_id, action, resource, resource_id, details,
          ip_address, user_agent, success, error_message, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `, [...params, limit, offset]);

      return result.rows;

    } catch (error) {
      logger.error('خطا در دریافت لاگ‌های حسابرسی', { error: error.message });
      throw error;
    }
  }

  /**
   * دریافت آمار لاگ‌های حسابرسی
   */
  static async getAuditStats(startDate, endDate) {
    try {
      const result = await query(`
        SELECT 
          action,
          resource,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE success = true) as success_count,
          COUNT(*) FILTER (WHERE success = false) as failure_count
        FROM audit_logs
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY action, resource
        ORDER BY count DESC
      `, [startDate, endDate]);

      return result.rows;

    } catch (error) {
      logger.error('خطا در دریافت آمار لاگ‌های حسابرسی', { error: error.message });
      throw error;
    }
  }

  /**
   * پاک‌سازی داده‌ها برای لاگ (حذف اطلاعات حساس)
   */
  static sanitizeForLog(data) {
    if (!data) return null;

    if (typeof data === 'string') {
      // ماسک کردن اطلاعات حساس
      if (data.includes('password') || data.includes('token')) {
        return '[REDACTED]';
      }
      return data;
    }

    if (typeof data === 'object') {
      const sanitized = { ...data };
      
      // حذف فیلدهای حساس
      const sensitiveFields = ['password', 'token', 'cardNumber', 'cvv', 'ssn'];
      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '[REDACTED]';
        }
      });

      return sanitized;
    }

    return data;
  }

  /**
   * تشخیص فعالیت مشکوک
   */
  static async detectSuspiciousActivity(userId, timeWindow = 3600000) { // ۱ ساعت
    try {
      // فعلاً فقط false برمی‌گردانیم
      logger.info('بررسی فعالیت مشکوک', { userId, timeWindow });
      
      return {
        isSuspicious: false,
        indicators: {},
        stats: {}
      };

    } catch (error) {
      logger.error('خطا در تشخیص فعالیت مشکوک', { error: error.message });
      return { isSuspicious: false, indicators: {}, stats: {} };
    }
  }
}