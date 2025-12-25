-- ایجاد جدول لاگ‌های حسابرسی
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول هشدارهای امنیتی
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    user_id UUID,
    ip_address INET,
    details JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'DISMISSED')),
    resolved_by UUID,
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ایجاد جدول تنظیمات امنیتی
CREATE TABLE IF NOT EXISTS security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول سیاست‌های رمز عبور
CREATE TABLE IF NOT EXISTS password_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL,
    min_length INTEGER DEFAULT 8,
    require_uppercase BOOLEAN DEFAULT true,
    require_lowercase BOOLEAN DEFAULT true,
    require_numbers BOOLEAN DEFAULT true,
    require_special_chars BOOLEAN DEFAULT true,
    max_age_days INTEGER DEFAULT 90,
    history_count INTEGER DEFAULT 5,
    max_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول تاریخچه رمز عبور
CREATE TABLE IF NOT EXISTS password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول session های فعال
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول IP های مسدود شده
CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address INET UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    blocked_by UUID,
    blocked_until TIMESTAMP WITH TIME ZONE,
    is_permanent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول کلیدهای رمزنگاری
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_name VARCHAR(100) UNIQUE NOT NULL,
    key_value TEXT NOT NULL, -- رمزنگاری شده
    key_type VARCHAR(50) NOT NULL, -- 'AES', 'RSA', etc.
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد ایندکس‌ها برای بهبود عملکرد
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires_at ON active_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_until ON blocked_ips(blocked_until);

-- ایجاد view برای آمار امنیتی
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as daily_audit_logs,
    (SELECT COUNT(*) FROM security_alerts WHERE status = 'ACTIVE') as active_alerts,
    (SELECT COUNT(*) FROM security_alerts WHERE severity = 'HIGH' AND status = 'ACTIVE') as high_severity_alerts,
    (SELECT COUNT(*) FROM blocked_ips WHERE is_permanent = false AND blocked_until > NOW()) as temp_blocked_ips,
    (SELECT COUNT(*) FROM blocked_ips WHERE is_permanent = true) as permanent_blocked_ips,
    (SELECT COUNT(*) FROM active_sessions WHERE expires_at > NOW()) as active_sessions_count;

-- تابع پاک‌سازی لاگ‌های قدیمی
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- تابع پاک‌سازی session های منقضی شده
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM active_sessions 
    WHERE expires_at < NOW() OR is_active = false;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- تابع بررسی IP مسدود شده
CREATE OR REPLACE FUNCTION is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM blocked_ips 
        WHERE ip_address = check_ip 
        AND (is_permanent = true OR blocked_until > NOW())
    );
END;
$$ LANGUAGE plpgsql;

-- تابع تشخیص فعالیت مشکوک
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
    check_user_id UUID,
    time_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    is_suspicious BOOLEAN,
    failed_logins INTEGER,
    unique_ips INTEGER,
    total_actions INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN failed_login_count > 5 OR unique_ip_count > 3 OR total_action_count > 100 
            THEN true 
            ELSE false 
        END as is_suspicious,
        failed_login_count::INTEGER,
        unique_ip_count::INTEGER,
        total_action_count::INTEGER
    FROM (
        SELECT 
            COUNT(*) FILTER (WHERE action = 'USER_LOGIN' AND success = false) as failed_login_count,
            COUNT(DISTINCT ip_address) as unique_ip_count,
            COUNT(*) as total_action_count
        FROM audit_logs 
        WHERE user_id = check_user_id 
        AND created_at >= NOW() - INTERVAL '1 minute' * time_window_minutes
    ) stats;
END;
$$ LANGUAGE plpgsql;

-- درج تنظیمات امنیتی پیش‌فرض
INSERT INTO security_settings (setting_key, setting_value, description) VALUES
('max_login_attempts', '5', 'حداکثر تعداد تلاش ناموفق ورود'),
('lockout_duration_minutes', '30', 'مدت زمان قفل شدن حساب (دقیقه)'),
('session_timeout_hours', '24', 'مدت زمان انقضای session (ساعت)'),
('password_min_length', '8', 'حداقل طول رمز عبور'),
('require_2fa', 'false', 'الزام احراز هویت دو مرحله‌ای'),
('audit_log_retention_days', '365', 'مدت نگهداری لاگ‌های حسابرسی (روز)')
ON CONFLICT (setting_key) DO NOTHING;

-- درج سیاست‌های رمز عبور پیش‌فرض
INSERT INTO password_policies (user_type, min_length, require_uppercase, require_lowercase, require_numbers, require_special_chars, max_age_days, history_count, max_attempts, lockout_duration_minutes) VALUES
('individual', 8, true, true, true, false, 90, 3, 5, 15),
('company_admin', 10, true, true, true, true, 60, 5, 3, 30),
('catering_manager', 12, true, true, true, true, 30, 10, 3, 60),
('employee', 8, true, true, true, false, 90, 3, 5, 15)
ON CONFLICT DO NOTHING;