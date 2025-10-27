-- =====================================================
-- 臻好尋債務平台 - 管理員特殊配置
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：為管理員帳號 q689594 設定 LV99 和特殊勳章
-- =====================================================

-- 注意：此腳本需要在管理員帳號已經註冊後執行
-- 如果管理員帳號尚未註冊，此腳本會跳過

DO $$
DECLARE
  v_admin_user_id UUID;
BEGIN
  -- 查找管理員帳號的 user_id
  SELECT user_id INTO v_admin_user_id
  FROM members
  WHERE account = 'q689594'
  LIMIT 1;

  -- 如果找到管理員帳號，則設定特殊配置
  IF v_admin_user_id IS NOT NULL THEN
    
    -- 1. 更新 member_statistics 為 LV99
    UPDATE member_statistics
    SET
      activity_points = 999999,
      activity_level = 99,
      title = '至高無上',
      title_color = '#FF0000',
      total_upload_quota_bonus = 9999,
      total_query_quota_bonus = 9999,
      level_updated_at = NOW()
    WHERE user_id = v_admin_user_id;

    -- 如果 member_statistics 不存在，則插入
    INSERT INTO member_statistics (
      user_id,
      activity_points,
      activity_level,
      title,
      title_color,
      total_upload_quota_bonus,
      total_query_quota_bonus,
      level_updated_at
    )
    SELECT
      v_admin_user_id,
      999999,
      99,
      '至高無上',
      '#FF0000',
      9999,
      9999,
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM member_statistics WHERE user_id = v_admin_user_id
    );

    -- 2. 解鎖所有管理員特殊勳章
    INSERT INTO member_badges (user_id, badge_key, unlocked_at, is_displayed, display_order)
    VALUES
      (v_admin_user_id, 'admin_system_creator', NOW(), TRUE, 1),
      (v_admin_user_id, 'admin_supreme_authority', NOW(), TRUE, 2),
      (v_admin_user_id, 'admin_system_guardian', NOW(), TRUE, 3),
      (v_admin_user_id, 'admin_founding_father', NOW(), TRUE, 4),
      (v_admin_user_id, 'admin_eternal_glory', NOW(), TRUE, 5)
    ON CONFLICT (user_id, badge_key) DO NOTHING;

    RAISE NOTICE '管理員帳號 q689594 已設定為 LV99，並解鎖 5 個特殊勳章';
  ELSE
    RAISE NOTICE '管理員帳號 q689594 尚未註冊，跳過特殊配置';
  END IF;
END $$;

