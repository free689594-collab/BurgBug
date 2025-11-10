-- =====================================================
-- Phase 7: 報表與分析功能
-- 建立日期: 2025-11-09
-- 說明: 建立報表分析相關的資料庫函數
-- =====================================================

-- =====================================================
-- 1. 訂閱統計函數
-- =====================================================

-- 1.1 取得訂閱統計總覽
CREATE OR REPLACE FUNCTION get_subscription_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_subscriptions BIGINT,
  active_subscriptions BIGINT,
  trial_subscriptions BIGINT,
  expired_subscriptions BIGINT,
  cancelled_subscriptions BIGINT,
  trial_to_vip_conversion_rate NUMERIC,
  total_vip_members BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_trial_count BIGINT;
  v_converted_count BIGINT;
BEGIN
  -- 設定預設時間範圍（如果未提供）
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  -- 計算試用轉 VIP 的轉換率
  SELECT COUNT(*) INTO v_trial_count
  FROM member_subscriptions
  WHERE subscription_type = 'free_trial'
    AND created_at BETWEEN v_start_date AND v_end_date;

  SELECT COUNT(DISTINCT user_id) INTO v_converted_count
  FROM member_subscriptions
  WHERE subscription_type = 'vip_monthly'
    AND user_id IN (
      SELECT user_id 
      FROM member_subscriptions 
      WHERE subscription_type = 'free_trial'
        AND created_at BETWEEN v_start_date AND v_end_date
    );

  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_subscriptions,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_subscriptions,
    COUNT(*) FILTER (WHERE status = 'trial')::BIGINT as trial_subscriptions,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired_subscriptions,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_subscriptions,
    CASE 
      WHEN v_trial_count > 0 THEN ROUND((v_converted_count::NUMERIC / v_trial_count::NUMERIC) * 100, 2)
      ELSE 0
    END as trial_to_vip_conversion_rate,
    (SELECT COUNT(*) FROM members WHERE is_vip = true)::BIGINT as total_vip_members
  FROM member_subscriptions
  WHERE created_at BETWEEN v_start_date AND v_end_date;
END;
$$;

COMMENT ON FUNCTION get_subscription_stats IS '取得訂閱統計總覽，包含各狀態訂閱數、轉換率等';

-- 1.2 取得訂閱趨勢資料（按日/週/月）
CREATE OR REPLACE FUNCTION get_subscription_trends(
  p_period TEXT DEFAULT 'day', -- 'day', 'week', 'month'
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  new_subscriptions BIGINT,
  new_trials BIGINT,
  new_vip BIGINT,
  expired_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_trunc_format TEXT;
BEGIN
  -- 設定預設時間範圍
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  -- 根據週期設定截斷格式
  v_trunc_format := CASE p_period
    WHEN 'week' THEN 'week'
    WHEN 'month' THEN 'month'
    ELSE 'day'
  END;

  RETURN QUERY
  SELECT
    DATE_TRUNC(v_trunc_format, created_at) as period_start,
    COUNT(*)::BIGINT as new_subscriptions,
    COUNT(*) FILTER (WHERE subscription_type = 'free_trial')::BIGINT as new_trials,
    COUNT(*) FILTER (WHERE subscription_type = 'vip_monthly')::BIGINT as new_vip,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as expired_count
  FROM member_subscriptions
  WHERE created_at BETWEEN v_start_date AND v_end_date
  GROUP BY DATE_TRUNC(v_trunc_format, created_at)
  ORDER BY period_start DESC;
END;
$$;

COMMENT ON FUNCTION get_subscription_trends IS '取得訂閱趨勢資料，可按日/週/月統計';

-- =====================================================
-- 2. 收入分析函數
-- =====================================================

-- 2.1 取得收入統計總覽
CREATE OR REPLACE FUNCTION get_revenue_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC,
  completed_payments BIGINT,
  pending_payments BIGINT,
  failed_payments BIGINT,
  average_order_amount NUMERIC,
  atm_revenue NUMERIC,
  barcode_revenue NUMERIC,
  cvs_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_revenue,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_payments,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_payments,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT as failed_payments,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
      THEN ROUND(SUM(amount) FILTER (WHERE status = 'completed') / COUNT(*) FILTER (WHERE status = 'completed'), 2)
      ELSE 0
    END as average_order_amount,
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'atm' AND status = 'completed'), 0) as atm_revenue,
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'barcode' AND status = 'completed'), 0) as barcode_revenue,
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'cvs' AND status = 'completed'), 0) as cvs_revenue
  FROM payments
  WHERE created_at BETWEEN v_start_date AND v_end_date;
END;
$$;

COMMENT ON FUNCTION get_revenue_stats IS '取得收入統計總覽，包含總收入、平均訂單金額、各付款方式收入等';

-- 2.2 取得收入趨勢資料
CREATE OR REPLACE FUNCTION get_revenue_trends(
  p_period TEXT DEFAULT 'day',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  period_start TIMESTAMPTZ,
  revenue NUMERIC,
  payment_count BIGINT,
  average_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_trunc_format TEXT;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  v_trunc_format := CASE p_period
    WHEN 'week' THEN 'week'
    WHEN 'month' THEN 'month'
    ELSE 'day'
  END;

  RETURN QUERY
  SELECT
    DATE_TRUNC(v_trunc_format, created_at) as period_start,
    COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as revenue,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as payment_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
      THEN ROUND(SUM(amount) FILTER (WHERE status = 'completed') / COUNT(*) FILTER (WHERE status = 'completed'), 2)
      ELSE 0
    END as average_amount
  FROM payments
  WHERE created_at BETWEEN v_start_date AND v_end_date
  GROUP BY DATE_TRUNC(v_trunc_format, created_at)
  ORDER BY period_start DESC;
END;
$$;

COMMENT ON FUNCTION get_revenue_trends IS '取得收入趨勢資料，可按日/週/月統計';

-- =====================================================
-- 3. 使用者行為分析函數
-- =====================================================

-- 3.1 取得使用者活躍度統計
CREATE OR REPLACE FUNCTION get_user_activity_stats(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  vip_members BIGINT,
  vip_percentage NUMERIC,
  total_uploads BIGINT,
  total_queries BIGINT,
  average_uploads_per_user NUMERIC,
  average_queries_per_user NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM members)::BIGINT as total_members,
    (SELECT COUNT(*) FROM members WHERE status = 'active')::BIGINT as active_members,
    (SELECT COUNT(*) FROM members WHERE is_vip = true)::BIGINT as vip_members,
    CASE 
      WHEN (SELECT COUNT(*) FROM members) > 0 
      THEN ROUND((SELECT COUNT(*) FROM members WHERE is_vip = true)::NUMERIC / (SELECT COUNT(*) FROM members)::NUMERIC * 100, 2)
      ELSE 0
    END as vip_percentage,
    COALESCE((SELECT SUM(uploads_used) FROM daily_usage_quotas WHERE date BETWEEN v_start_date::DATE AND v_end_date::DATE), 0)::BIGINT as total_uploads,
    COALESCE((SELECT SUM(queries_used) FROM daily_usage_quotas WHERE date BETWEEN v_start_date::DATE AND v_end_date::DATE), 0)::BIGINT as total_queries,
    CASE
      WHEN (SELECT COUNT(*) FROM members WHERE status = 'active') > 0
      THEN ROUND(COALESCE((SELECT SUM(uploads_used) FROM daily_usage_quotas WHERE date BETWEEN v_start_date::DATE AND v_end_date::DATE), 0)::NUMERIC / (SELECT COUNT(*) FROM members WHERE status = 'active')::NUMERIC, 2)
      ELSE 0
    END as average_uploads_per_user,
    CASE
      WHEN (SELECT COUNT(*) FROM members WHERE status = 'active') > 0
      THEN ROUND(COALESCE((SELECT SUM(queries_used) FROM daily_usage_quotas WHERE date BETWEEN v_start_date::DATE AND v_end_date::DATE), 0)::NUMERIC / (SELECT COUNT(*) FROM members WHERE status = 'active')::NUMERIC, 2)
      ELSE 0
    END as average_queries_per_user;
END;
$$;

COMMENT ON FUNCTION get_user_activity_stats IS '取得使用者活躍度統計，包含會員數、VIP 佔比、使用量等';

