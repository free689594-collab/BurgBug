-- 審計日誌清理函數與排程
-- 功能：根據 system_config.audit_retention_days 設定，自動清理過期的審計日誌

-- 1. 建立清理函數
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  retention_days INTEGER;
  deleted_count INTEGER;
BEGIN
  -- 讀取保留天數設定（預設 30 天）
  SELECT COALESCE(audit_retention_days, 30)
  INTO retention_days
  FROM system_config
  WHERE id = 1;

  -- 刪除超過保留期限的審計日誌
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;

  -- 取得刪除筆數
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 記錄清理操作（避免無限遞迴，只在有刪除記錄時才記錄）
  IF deleted_count > 0 THEN
    INSERT INTO audit_logs (user_id, action, resource, meta, created_at)
    VALUES (
      NULL,
      'AUDIT_CLEANUP',
      'audit_logs',
      jsonb_build_object(
        'deleted_count', deleted_count,
        'retention_days', retention_days,
        'cleanup_time', NOW()
      ),
      NOW()
    );
  END IF;

  -- 輸出清理結果（用於手動執行時查看）
  RAISE NOTICE 'Cleaned up % audit log records older than % days', deleted_count, retention_days;
END;
$$;

-- 2. 建立 pg_cron 排程（每天凌晨 2:00 執行）
-- 注意：需要先啟用 pg_cron 擴充功能
-- 在 Supabase Dashboard 執行：CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 檢查 pg_cron 是否已啟用
DO $$
BEGIN
  -- 嘗試建立排程
  BEGIN
    -- 先刪除舊的排程（如果存在）
    PERFORM cron.unschedule('cleanup-audit-logs');
  EXCEPTION
    WHEN undefined_table THEN
      RAISE NOTICE 'pg_cron extension not enabled. Please enable it in Supabase Dashboard.';
      RAISE NOTICE 'Run: CREATE EXTENSION IF NOT EXISTS pg_cron;';
      RETURN;
  END;

  -- 建立新的排程（每天凌晨 2:00 執行）
  PERFORM cron.schedule(
    'cleanup-audit-logs',           -- 排程名稱
    '0 2 * * *',                    -- Cron 表達式（每天 02:00）
    'SELECT cleanup_old_audit_logs();'
  );

  RAISE NOTICE 'Audit log cleanup schedule created successfully. Will run daily at 02:00 UTC.';
END;
$$;

-- 3. 建立手動清理函數（供管理員使用）
COMMENT ON FUNCTION cleanup_old_audit_logs() IS '清理超過保留期限的審計日誌。根據 system_config.audit_retention_days 設定自動刪除舊記錄。';

-- 4. 授予執行權限（僅限 service_role）
-- 注意：此函數使用 SECURITY DEFINER，會以函數擁有者的權限執行
-- 因此不需要額外授予權限給一般使用者

-- 5. 測試說明
-- 手動執行清理函數：
-- SELECT cleanup_old_audit_logs();
--
-- 查看排程狀態：
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-audit-logs';
--
-- 查看排程執行歷史：
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-audit-logs') ORDER BY start_time DESC LIMIT 10;

