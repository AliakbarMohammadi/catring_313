-- ایجاد جدول گزارش‌های فروش
CREATE TABLE IF NOT EXISTS sales_reports (
    id UUID PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'yearly', 'company', 'custom')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    average_order_value DECIMAL(15,2) DEFAULT 0,
    top_selling_items JSONB DEFAULT '[]',
    sales_by_category JSONB DEFAULT '{}',
    sales_by_company JSONB DEFAULT '{}',
    daily_breakdown JSONB DEFAULT '[]',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول کش آنالیتیک
CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_type VARCHAR(50) NOT NULL CHECK (cache_type IN ('dashboard', 'inventory', 'customer', 'revenue')),
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول لاگ عملکرد
CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY,
    operation_type VARCHAR(100) NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    parameters JSONB,
    result_size INTEGER,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد جدول لاگ تغییر وضعیت سفارشات
CREATE TABLE IF NOT EXISTS order_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ایجاد ایندکس‌ها برای بهبود عملکرد
CREATE INDEX IF NOT EXISTS idx_sales_reports_type ON sales_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_sales_reports_dates ON sales_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sales_reports_created_at ON sales_reports(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type ON analytics_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_performance_logs_operation ON performance_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at ON performance_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id ON order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_changed_at ON order_status_logs(changed_at);

-- ایجاد view برای آمار سریع
CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as average_order_value,
    COUNT(DISTINCT user_id) as unique_customers
FROM orders 
WHERE status NOT IN ('cancelled')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ایجاد view برای آمار ماهانه
CREATE OR REPLACE VIEW monthly_sales_summary AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as average_order_value,
    COUNT(DISTINCT user_id) as unique_customers,
    COUNT(DISTINCT company_id) as active_companies
FROM orders 
WHERE status NOT IN ('cancelled')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- تابع پاک‌سازی کش منقضی شده
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- تابع محاسبه آمار عملکرد
CREATE OR REPLACE FUNCTION calculate_performance_stats(
    operation_type_param VARCHAR(100),
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    avg_execution_time NUMERIC,
    max_execution_time INTEGER,
    min_execution_time INTEGER,
    success_rate NUMERIC,
    total_operations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        AVG(execution_time_ms)::NUMERIC as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        MIN(execution_time_ms) as min_execution_time,
        (COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*))::NUMERIC as success_rate,
        COUNT(*) as total_operations
    FROM performance_logs 
    WHERE operation_type = operation_type_param
    AND created_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;