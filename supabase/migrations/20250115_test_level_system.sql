-- =====================================================
-- 臻好尋債務平台 - 等級系統測試腳本
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：測試等級與勳章系統的資料庫結構
-- =====================================================

-- =====================================================
-- 測試 1：檢查資料表是否建立成功
-- =====================================================

DO $$
DECLARE
  v_table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'level_config',
      'badge_config',
      'activity_point_rules',
      'member_badges',
      'activity_point_history'
    );

  IF v_table_count = 5 THEN
    RAISE NOTICE '✅ 測試 1 通過：所有 5 個資料表已建立成功';
  ELSE
    RAISE WARNING '❌ 測試 1 失敗：只建立了 % 個資料表（預期 5 個）', v_table_count;
  END IF;
END $$;

-- =====================================================
-- 測試 2：檢查 member_statistics 欄位是否新增成功
-- =====================================================

DO $$
DECLARE
  v_column_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_column_count
  FROM information_schema.columns
  WHERE table_name = 'member_statistics'
    AND column_name IN (
      'activity_points',
      'activity_level',
      'title',
      'title_color',
      'total_upload_quota_bonus',
      'total_query_quota_bonus',
      'consecutive_login_days',
      'last_login_date',
      'level_updated_at'
    );

  IF v_column_count = 9 THEN
    RAISE NOTICE '✅ 測試 2 通過：member_statistics 所有 9 個欄位已新增成功';
  ELSE
    RAISE WARNING '❌ 測試 2 失敗：只新增了 % 個欄位（預期 9 個）', v_column_count;
  END IF;
END $$;

-- =====================================================
-- 測試 3：檢查等級配置資料是否插入成功
-- =====================================================

DO $$
DECLARE
  v_level_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_level_count FROM level_config;

  IF v_level_count >= 31 THEN
    RAISE NOTICE '✅ 測試 3 通過：已插入 % 個等級配置（包含 LV1-LV30 + LV99）', v_level_count;
  ELSE
    RAISE WARNING '❌ 測試 3 失敗：只插入了 % 個等級配置（預期至少 31 個）', v_level_count;
  END IF;
END $$;

-- =====================================================
-- 測試 4：檢查勳章配置資料是否插入成功
-- =====================================================

DO $$
DECLARE
  v_badge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_badge_count FROM badge_config;

  IF v_badge_count >= 32 THEN
    RAISE NOTICE '✅ 測試 4 通過：已插入 % 個勳章配置（包含 27 個一般勳章 + 5 個管理員勳章）', v_badge_count;
  ELSE
    RAISE WARNING '❌ 測試 4 失敗：只插入了 % 個勳章配置（預期至少 32 個）', v_badge_count;
  END IF;
END $$;

-- =====================================================
-- 測試 5：檢查活躍度點數規則是否插入成功
-- =====================================================

DO $$
DECLARE
  v_rule_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_rule_count FROM activity_point_rules;

  IF v_rule_count >= 5 THEN
    RAISE NOTICE '✅ 測試 5 通過：已插入 % 個活躍度點數規則', v_rule_count;
  ELSE
    RAISE WARNING '❌ 測試 5 失敗：只插入了 % 個活躍度點數規則（預期至少 5 個）', v_rule_count;
  END IF;
END $$;

-- =====================================================
-- 測試 6：檢查資料庫函數是否建立成功
-- =====================================================

DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'calculate_member_level'
  ) INTO v_function_exists;

  IF v_function_exists THEN
    RAISE NOTICE '✅ 測試 6 通過：calculate_member_level 函數已建立成功';
  ELSE
    RAISE WARNING '❌ 測試 6 失敗：calculate_member_level 函數未建立';
  END IF;
END $$;

-- =====================================================
-- 測試 7：檢查 LV99 管理員等級是否存在
-- =====================================================

DO $$
DECLARE
  v_lv99_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM level_config
    WHERE level = 99
      AND title = '至高無上'
      AND title_color = '#FF0000'
  ) INTO v_lv99_exists;

  IF v_lv99_exists THEN
    RAISE NOTICE '✅ 測試 7 通過：LV99 管理員等級已建立成功';
  ELSE
    RAISE WARNING '❌ 測試 7 失敗：LV99 管理員等級未建立';
  END IF;
END $$;

-- =====================================================
-- 測試 8：檢查管理員特殊勳章是否存在
-- =====================================================

DO $$
DECLARE
  v_admin_badge_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_admin_badge_count
  FROM badge_config
  WHERE difficulty = 'special'
    AND badge_key LIKE 'admin_%';

  IF v_admin_badge_count >= 5 THEN
    RAISE NOTICE '✅ 測試 8 通過：已建立 % 個管理員特殊勳章', v_admin_badge_count;
  ELSE
    RAISE WARNING '❌ 測試 8 失敗：只建立了 % 個管理員特殊勳章（預期至少 5 個）', v_admin_badge_count;
  END IF;
END $$;

-- =====================================================
-- 測試總結
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '等級與勳章系統資料庫測試完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '請檢查上方的測試結果';
  RAISE NOTICE '如果所有測試都顯示 ✅，則資料庫結構建立成功';
  RAISE NOTICE '如果有任何測試顯示 ❌，請檢查對應的 SQL 遷移檔案';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 查詢統計資訊（供參考）
-- =====================================================

-- 顯示等級配置統計
SELECT 
  '等級配置' AS 項目,
  COUNT(*) AS 數量,
  MIN(level) AS 最低等級,
  MAX(level) AS 最高等級,
  SUM(bonus_upload_quota) AS 總上傳配額獎勵,
  SUM(bonus_query_quota) AS 總查詢配額獎勵
FROM level_config;

-- 顯示勳章配置統計
SELECT 
  '勳章配置' AS 項目,
  difficulty AS 難度,
  COUNT(*) AS 數量,
  COUNT(CASE WHEN is_hidden THEN 1 END) AS 隱藏數量
FROM badge_config
GROUP BY difficulty
ORDER BY 
  CASE difficulty
    WHEN 'easy' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'hard' THEN 3
    WHEN 'extreme' THEN 4
    WHEN 'special' THEN 5
  END;

-- 顯示活躍度點數規則
SELECT 
  action AS 行為,
  points AS 點數,
  max_daily_count AS 每日上限,
  cooldown_seconds AS 冷卻時間秒,
  is_active AS 是否啟用
FROM activity_point_rules
ORDER BY points DESC;

