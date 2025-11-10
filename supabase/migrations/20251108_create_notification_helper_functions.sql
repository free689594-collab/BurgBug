-- =====================================================
-- 訂閱通知系統 - 輔助函數
-- 建立日期: 2025-11-08
-- 用途: 提供管理員 API 使用的統計和查詢函數
-- =====================================================

-- 1. 建立通知統計函數
CREATE OR REPLACE FUNCTION get_notification_stats()
RETURNS TABLE (
  total_notifications BIGINT,
  sent_today BIGINT,
  sent_this_week BIGINT,
  sent_this_month BIGINT,
  by_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_notifications,
    COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE)::BIGINT as sent_today,
    COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as sent_this_week,
    COUNT(*) FILTER (WHERE sent_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as sent_this_month,
    jsonb_build_object(
      'expiry_7days', COUNT(*) FILTER (WHERE notification_type = 'expiry_7days'),
      'expiry_3days', COUNT(*) FILTER (WHERE notification_type = 'expiry_3days'),
      'expiry_1day', COUNT(*) FILTER (WHERE notification_type = 'expiry_1day'),
      'expired', COUNT(*) FILTER (WHERE notification_type = 'expired')
    ) as by_type
  FROM subscription_notifications
  WHERE is_sent = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 註解
COMMENT ON FUNCTION get_notification_stats() IS '取得訂閱通知統計資訊，包含總數、今日、本週、本月發送數量，以及各類型通知數量。';


-- 2. 建立查詢 pg_cron 排程任務函數
CREATE OR REPLACE FUNCTION get_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  jobname TEXT,
  schedule TEXT,
  command TEXT,
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.jobname,
    j.schedule,
    j.command,
    j.active
  FROM cron.job j
  WHERE j.jobname LIKE '%subscription%'
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 註解
COMMENT ON FUNCTION get_cron_jobs() IS '查詢訂閱相關的 pg_cron 排程任務。';


-- 3. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱通知輔助函數建立完成';
  RAISE NOTICE '📊 已建立函數: get_notification_stats, get_cron_jobs';
END $$;

