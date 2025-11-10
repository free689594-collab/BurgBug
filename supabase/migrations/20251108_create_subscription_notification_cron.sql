-- =====================================================
-- 訂閱通知系統 - pg_cron 排程任務
-- 建立日期: 2025-11-08
-- 用途: 設定自動執行訂閱通知檢查的排程任務
-- =====================================================

-- 1. 確保 pg_cron 擴充功能已啟用
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 建立每日執行的訂閱通知排程（每天 10:00 UTC = 18:00 台灣時間）
SELECT cron.schedule(
  'send-subscription-notifications',  -- 排程名稱
  '0 10 * * *',                       -- Cron 表達式：每天 10:00 UTC
  $$SELECT send_subscription_notifications();$$
);

-- 3. 建立每日執行的過期訂閱通知排程（每天 10:30 UTC = 18:30 台灣時間）
SELECT cron.schedule(
  'send-expired-subscription-notifications',  -- 排程名稱
  '30 10 * * *',                              -- Cron 表達式：每天 10:30 UTC
  $$SELECT send_expired_subscription_notifications();$$
);

-- 4. 查詢已建立的排程任務
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname IN ('send-subscription-notifications', 'send-expired-subscription-notifications')
ORDER BY jobname;

-- 5. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱通知排程任務建立完成';
  RAISE NOTICE '📅 排程 1: send-subscription-notifications (每天 10:00 UTC / 18:00 台灣時間)';
  RAISE NOTICE '📅 排程 2: send-expired-subscription-notifications (每天 10:30 UTC / 18:30 台灣時間)';
  RAISE NOTICE '🔍 使用 SELECT * FROM cron.job; 查看所有排程任務';
  RAISE NOTICE '🗑️ 使用 SELECT cron.unschedule(''排程名稱''); 刪除排程任務';
END $$;

