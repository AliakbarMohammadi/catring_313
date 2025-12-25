import { AuditLogger } from './auditLogger.js';
import { createLogger } from './logger.js';
import { query } from '../config/database.js';

const logger = createLogger('security-monitor');

/**
 * سیستم نظارت و تشخیص نقض امنیت
 */
export class SecurityMonitor {
  constructor() {
    this.alertThresholds = {
      failedLoginAttempts: 5, // حداکثر تلاش ناموفق ورود در ۱۵ دقیقه
      suspiciousIPs: 3, // حداکثر IP مختلف برای یک کاربر در ساعت
      rapidRequests: 100, // حداکثر درخواست در دقیقه
      dataAccessAttempts: 20, // حداکثر دسترسی به داده‌های حساس در ساعت
      timeWindows: {
        short: 15 * 60 * 1000, // ۱۵ دقیقه
        medium: 60 * 60 * 1000, // ۱ ساعت
        long: 24 * 60 * 60 * 1000 // ۲۴ ساعت
      }
    };

    this.securityEvents = new Map(); // کش موقت برای رویدادهای امنیتی
  }

  /**
   * بررسی تلاش‌های ورود ناموفق
   */
  async checkFailedLoginAttempts(userId, ipAddress) {
    try {
      const timeWindow = new Date(Date.now() - this.alertThresholds.timeWindows.short);
      
      const result = await query(`
        SELECT COUNT(*) as failed_count
        FROM audit_logs
        WHERE action = 'USER_LOGIN' 
        AND success = false
        AND (user_id = $1 OR ip_address = $2)
        AND created_at >= $3
      `, [userId, ipAddress, timeWindow]);

      const failedCount = parseInt(result.rows[0].failed_count);

      if (failedCount >= this.alertThresholds.failedLoginAttempts) {
        await this.triggerSecurityAlert({
          type: 'FAILED_LOGIN_ATTEMPTS',
          severity: 'HIGH',
          userId,
          ipAddress,
          details: {
            failedAttempts: failedCount,
            timeWindow: '15 minutes',
            threshold: this.alertThresholds.failedLoginAttempts
          }
        });

        return {
          isBlocked: true,
          reason: 'تعداد زیادی تلاش ناموفق ورود',
          failedCount
        };
      }

      return { isBlocked: false, failedCount };

    } catch (error) {
      logger.error('خطا در بررسی تلاش‌های ورود ناموفق', { error: error.message });
      return { isBlocked: false, failedCount: 0 };
    }
  }

  /**
   * بررسی IP های مشکوک
   */
  async checkSuspiciousIPs(userId) {
    try {
      const timeWindow = new Date(Date.now() - this.alertThresholds.timeWindows.medium);
      
      const result = await query(`
        SELECT 
          COUNT(DISTINCT ip_address) as unique_ips,
          array_agg(DISTINCT ip_address) as ip_list
        FROM audit_logs
        WHERE user_id = $1 AND created_at >= $2
      `, [userId, timeWindow]);

      const { unique_ips, ip_list } = result.rows[0];

      if (unique_ips >= this.alertThresholds.suspiciousIPs) {
        await this.triggerSecurityAlert({
          type: 'SUSPICIOUS_IP_ACTIVITY',
          severity: 'MEDIUM',
          userId,
          details: {
            uniqueIPs: unique_ips,
            ipList: ip_list,
            timeWindow: '1 hour',
            threshold: this.alertThresholds.suspiciousIPs
          }
        });

        return {
          isSuspicious: true,
          reason: 'استفاده از IP های متعدد',
          uniqueIPs: unique_ips
        };
      }

      return { isSuspicious: false, uniqueIPs: unique_ips };

    } catch (error) {
      logger.error('خطا در بررسی IP های مشکوک', { error: error.message });
      return { isSuspicious: false, uniqueIPs: 0 };
    }
  }

  /**
   * بررسی درخواست‌های سریع (Rate Limiting)
   */
  async checkRapidRequests(ipAddress, endpoint) {
    try {
      const key = `${ipAddress}:${endpoint}`;
      const now = Date.now();
      const timeWindow = 60 * 1000; // ۱ دقیقه

      // دریافت تعداد درخواست‌ها از کش
      let requests = this.securityEvents.get(key) || [];
      
      // حذف درخواست‌های قدیمی
      requests = requests.filter(timestamp => now - timestamp < timeWindow);
      
      // اضافه کردن درخواست جدید
      requests.push(now);
      this.securityEvents.set(key, requests);

      if (requests.length > this.alertThresholds.rapidRequests) {
        await this.triggerSecurityAlert({
          type: 'RAPID_REQUESTS',
          severity: 'HIGH',
          ipAddress,
          details: {
            requestCount: requests.length,
            endpoint,
            timeWindow: '1 minute',
            threshold: this.alertThresholds.rapidRequests
          }
        });

        return {
          isBlocked: true,
          reason: 'تعداد زیادی درخواست در زمان کوتاه',
          requestCount: requests.length
        };
      }

      return { isBlocked: false, requestCount: requests.length };

    } catch (error) {
      logger.error('خطا در بررسی درخواست‌های سریع', { error: error.message });
      return { isBlocked: false, requestCount: 0 };
    }
  }

  /**
   * بررسی دسترسی غیرعادی به داده‌های حساس
   */
  async checkSensitiveDataAccess(userId) {
    try {
      const timeWindow = new Date(Date.now() - this.alertThresholds.timeWindows.medium);
      
      const result = await query(`
        SELECT 
          COUNT(*) as access_count,
          array_agg(DISTINCT resource) as accessed_resources
        FROM audit_logs
        WHERE user_id = $1 
        AND action IN ('SENSITIVE_DATA_ACCESS', 'SENSITIVE_DATA_CHANGE')
        AND created_at >= $2
      `, [userId, timeWindow]);

      const { access_count, accessed_resources } = result.rows[0];

      if (access_count >= this.alertThresholds.dataAccessAttempts) {
        await this.triggerSecurityAlert({
          type: 'EXCESSIVE_DATA_ACCESS',
          severity: 'HIGH',
          userId,
          details: {
            accessCount: access_count,
            accessedResources: accessed_resources,
            timeWindow: '1 hour',
            threshold: this.alertThresholds.dataAccessAttempts
          }
        });

        return {
          isSuspicious: true,
          reason: 'دسترسی غیرعادی به داده‌های حساس',
          accessCount: access_count
        };
      }

      return { isSuspicious: false, accessCount: access_count };

    } catch (error) {
      logger.error('خطا در بررسی دسترسی به داده‌های حساس', { error: error.message });
      return { isSuspicious: false, accessCount: 0 };
    }
  }

  /**
   * تشخیص الگوهای غیرعادی رفتاری
   */
  async detectAnomalousPatterns(userId) {
    try {
      const timeWindow = new Date(Date.now() - this.alertThresholds.timeWindows.long);
      
      // تحلیل الگوی فعالیت کاربر
      const result = await query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as activity_count,
          array_agg(DISTINCT action) as actions
        FROM audit_logs
        WHERE user_id = $1 AND created_at >= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, [userId, timeWindow]);

      const hourlyActivity = result.rows;
      
      // محاسبه میانگین فعالیت
      const totalActivity = hourlyActivity.reduce((sum, hour) => sum + parseInt(hour.activity_count), 0);
      const averageActivity = totalActivity / 24;

      // تشخیص ساعات غیرعادی فعالیت
      const anomalousHours = hourlyActivity.filter(hour => {
        const activityCount = parseInt(hour.activity_count);
        return activityCount > (averageActivity * 3); // بیش از ۳ برابر میانگین
      });

      if (anomalousHours.length > 0) {
        await this.triggerSecurityAlert({
          type: 'ANOMALOUS_ACTIVITY_PATTERN',
          severity: 'MEDIUM',
          userId,
          details: {
            anomalousHours: anomalousHours.map(h => ({
              hour: h.hour,
              activityCount: h.activity_count,
              actions: h.actions
            })),
            averageActivity,
            timeWindow: '24 hours'
          }
        });

        return {
          isAnomalous: true,
          reason: 'الگوی غیرعادی فعالیت',
          anomalousHours: anomalousHours.length
        };
      }

      return { isAnomalous: false, anomalousHours: 0 };

    } catch (error) {
      logger.error('خطا در تشخیص الگوهای غیرعادی', { error: error.message });
      return { isAnomalous: false, anomalousHours: 0 };
    }
  }

  /**
   * تریگر هشدار امنیتی
   */
  async triggerSecurityAlert(alertData) {
    try {
      const {
        type,
        severity,
        userId,
        ipAddress,
        details
      } = alertData;

      // ثبت هشدار در پایگاه داده
      const alertId = await query(`
        INSERT INTO security_alerts (
          id, alert_type, severity, user_id, ip_address, details, 
          status, created_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'ACTIVE', NOW())
        RETURNING id
      `, [type, severity, userId, ipAddress, JSON.stringify(details)]);

      // ثبت در لاگ حسابرسی
      await AuditLogger.log({
        userId,
        action: 'SECURITY_ALERT_TRIGGERED',
        resource: 'security',
        resourceId: alertId.rows[0].id,
        details: {
          alertType: type,
          severity,
          ...details
        },
        ipAddress,
        success: true
      });

      // ارسال اعلان فوری (در صورت نیاز)
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        await this.sendImmediateNotification(alertData);
      }

      logger.warn('هشدار امنیتی تریگر شد', {
        alertId: alertId.rows[0].id,
        type,
        severity,
        userId,
        ipAddress
      });

      return alertId.rows[0].id;

    } catch (error) {
      logger.error('خطا در تریگر هشدار امنیتی', { error: error.message });
      throw error;
    }
  }

  /**
   * ارسال اعلان فوری
   */
  async sendImmediateNotification(alertData) {
    try {
      // در اینجا می‌توان با سرویس notification ارتباط برقرار کرد
      // برای ارسال ایمیل یا SMS فوری به مدیران سیستم
      
      logger.info('ارسال اعلان فوری امنیتی', {
        type: alertData.type,
        severity: alertData.severity
      });

      // TODO: پیاده‌سازی ارسال اعلان واقعی
      
    } catch (error) {
      logger.error('خطا در ارسال اعلان فوری', { error: error.message });
    }
  }

  /**
   * بررسی جامع امنیت برای یک کاربر
   */
  async performSecurityCheck(userId, ipAddress, userAgent, endpoint) {
    try {
      const checks = await Promise.all([
        this.checkFailedLoginAttempts(userId, ipAddress),
        this.checkSuspiciousIPs(userId),
        this.checkRapidRequests(ipAddress, endpoint),
        this.checkSensitiveDataAccess(userId),
        this.detectAnomalousPatterns(userId)
      ]);

      const [
        failedLogins,
        suspiciousIPs,
        rapidRequests,
        sensitiveAccess,
        anomalousPatterns
      ] = checks;

      // تعیین وضعیت کلی امنیت
      const isBlocked = failedLogins.isBlocked || rapidRequests.isBlocked;
      const isSuspicious = suspiciousIPs.isSuspicious || 
                          sensitiveAccess.isSuspicious || 
                          anomalousPatterns.isAnomalous;

      const securityStatus = {
        isBlocked,
        isSuspicious,
        checks: {
          failedLogins,
          suspiciousIPs,
          rapidRequests,
          sensitiveAccess,
          anomalousPatterns
        },
        timestamp: new Date()
      };

      // ثبت نتیجه بررسی امنیت
      await AuditLogger.log({
        userId,
        action: 'SECURITY_CHECK_PERFORMED',
        resource: 'security',
        details: securityStatus,
        ipAddress,
        userAgent,
        success: true
      });

      return securityStatus;

    } catch (error) {
      logger.error('خطا در بررسی جامع امنیت', { error: error.message });
      return {
        isBlocked: false,
        isSuspicious: false,
        checks: {},
        error: error.message
      };
    }
  }

  /**
   * دریافت هشدارهای امنیتی فعال
   */
  async getActiveSecurityAlerts(limit = 50) {
    try {
      const result = await query(`
        SELECT 
          id, alert_type, severity, user_id, ip_address, details,
          status, created_at, resolved_at
        FROM security_alerts
        WHERE status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;

    } catch (error) {
      logger.error('خطا در دریافت هشدارهای امنیتی', { error: error.message });
      return [];
    }
  }

  /**
   * حل کردن هشدار امنیتی
   */
  async resolveSecurityAlert(alertId, resolvedBy, resolution) {
    try {
      await query(`
        UPDATE security_alerts
        SET status = 'RESOLVED', resolved_at = NOW(), resolved_by = $1, resolution = $2
        WHERE id = $3
      `, [resolvedBy, resolution, alertId]);

      logger.info('هشدار امنیتی حل شد', { alertId, resolvedBy });

    } catch (error) {
      logger.error('خطا در حل هشدار امنیتی', { error: error.message });
      throw error;
    }
  }

  /**
   * پاک‌سازی کش رویدادهای امنیتی
   */
  cleanupSecurityEventsCache() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // ۱ ساعت

    for (const [key, events] of this.securityEvents.entries()) {
      const validEvents = events.filter(timestamp => now - timestamp < maxAge);
      
      if (validEvents.length === 0) {
        this.securityEvents.delete(key);
      } else {
        this.securityEvents.set(key, validEvents);
      }
    }

    logger.debug('کش رویدادهای امنیتی پاک‌سازی شد');
  }
}

// نمونه singleton برای استفاده در سراسر برنامه
export const securityMonitor = new SecurityMonitor();

// پاک‌سازی دوره‌ای کش
setInterval(() => {
  securityMonitor.cleanupSecurityEventsCache();
}, 5 * 60 * 1000); // هر ۵ دقیقه