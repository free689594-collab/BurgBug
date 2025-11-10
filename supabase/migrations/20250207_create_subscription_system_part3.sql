-- =====================================================
-- 訂閱系統 Part 3: 系統設定和測試工具
-- 建立日期: 2025-02-07
-- 說明: 新增系統設定、測試用 SQL 函數
-- =====================================================

-- 1. 新增訂閱相關系統設定
INSERT INTO system_config (config_key, config_value, description, value_type, category)
VALUES
  ('subscription_trial_days', '30', '新會員免費試用天數', 'integer', 'subscription'),
  ('subscription_monthly_price', '1500', 'VIP 月費金額（新台幣）', 'decimal', 'subscription'),
  ('subscription_free_upload_quota', '10', '免費會員總上傳次數', 'integer', 'subscription'),
  ('subscription_free_query_quota', '10', '免費會員總查詢次數', 'integer', 'subscription'),
  ('subscription_vip_upload_daily', '20', 'VIP 會員每日上傳次數', 'integer', 'subscription'),
  ('subscription_vip_query_daily', '30', 'VIP 會員每日查詢次數', 'integer', 'subscription'),
  ('ecpay_merchant_id', '', '綠界商店代號', 'string', 'payment'),
  ('ecpay_hash_key', '', '綠界 HashKey（請勿直接儲存，使用環境變數）', 'string', 'payment'),
  ('ecpay_hash_iv', '', '綠界 HashIV（請勿直接儲存，使用環境變數）', 'string', 'payment'),
  ('ecpay_test_mode', 'true', '綠界測試模式（true=測試環境, false=正式環境）', 'boolean', 'payment'),
  ('subscription_notify_days', '7,3,1', '訂閱到期前通知天數（逗號分隔）', 'string', 'subscription')
ON CONFLICT (config_key) DO UPDATE
SET 
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category;


-- 2. 為現有會員建立試用訂閱（僅執行一次）
-- 注意：這個函數會為所有已審核但沒有訂閱的會員建立試用訂閱
CREATE OR REPLACE FUNCTION create_trial_for_existing_members()
RETURNS TABLE (
  user_id UUID,
  account VARCHAR(100),
  subscription_id UUID,
  end_date TIMESTAMPTZ
) AS $$
DECLARE
  v_trial_plan_id UUID;
  v_trial_days INTEGER;
  v_member RECORD;
  v_new_subscription_id UUID;
BEGIN
  -- 取得試用計畫 ID
  SELECT id INTO v_trial_plan_id
  FROM subscription_plans
  WHERE plan_name = 'free_trial' AND is_active = TRUE
  LIMIT 1;
  
  IF v_trial_plan_id IS NULL THEN
    RAISE EXCEPTION '找不到免費試用計畫';
  END IF;
  
  -- 取得試用天數
  SELECT COALESCE(
    (SELECT CAST(config_value AS INTEGER) 
     FROM system_config 
     WHERE config_key = 'subscription_trial_days'),
    30
  ) INTO v_trial_days;
  
  -- 為所有已審核但沒有訂閱的會員建立試用訂閱
  FOR v_member IN
    SELECT m.user_id, m.account
    FROM members m
    WHERE m.status = 'approved'
      AND m.current_subscription_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM member_subscriptions ms
        WHERE ms.user_id = m.user_id
      )
  LOOP
    -- 建立試用訂閱
    INSERT INTO member_subscriptions (
      user_id,
      plan_id,
      status,
      subscription_type,
      start_date,
      end_date,
      trial_end_date,
      remaining_upload_quota,
      remaining_query_quota
    )
    SELECT
      v_member.user_id,
      v_trial_plan_id,
      'trial',
      'free_trial',
      NOW(),
      NOW() + (v_trial_days || ' days')::INTERVAL,
      NOW() + (v_trial_days || ' days')::INTERVAL,
      sp.upload_quota_total,
      sp.query_quota_total
    FROM subscription_plans sp
    WHERE sp.id = v_trial_plan_id
    RETURNING id INTO v_new_subscription_id;
    
    -- 更新 members 表
    UPDATE members
    SET current_subscription_id = v_new_subscription_id
    WHERE members.user_id = v_member.user_id;
    
    -- 返回結果
    RETURN QUERY
    SELECT 
      v_member.user_id,
      v_member.account,
      v_new_subscription_id,
      NOW() + (v_trial_days || ' days')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_trial_for_existing_members() IS '為現有已審核會員建立試用訂閱（僅執行一次）';


-- 3. 測試工具：手動設定會員為 VIP（測試用）
CREATE OR REPLACE FUNCTION set_member_as_vip_test(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  subscription_id UUID,
  end_date TIMESTAMPTZ
) AS $$
DECLARE
  v_vip_plan_id UUID;
  v_new_subscription_id UUID;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- 取得 VIP 計畫 ID
  SELECT id INTO v_vip_plan_id
  FROM subscription_plans
  WHERE plan_name = 'vip_monthly' AND is_active = TRUE
  LIMIT 1;
  
  IF v_vip_plan_id IS NULL THEN
    RETURN QUERY SELECT FALSE, '找不到 VIP 計畫'::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- 計算結束日期
  v_end_date := NOW() + (p_days || ' days')::INTERVAL;
  
  -- 將現有訂閱設為已取消
  UPDATE member_subscriptions
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_reason = '測試：手動升級為 VIP'
  WHERE user_id = p_user_id
    AND status IN ('trial', 'active');
  
  -- 建立新的 VIP 訂閱
  INSERT INTO member_subscriptions (
    user_id,
    plan_id,
    status,
    subscription_type,
    start_date,
    end_date,
    payment_id
  )
  VALUES (
    p_user_id,
    v_vip_plan_id,
    'active',
    'paid',
    NOW(),
    v_end_date,
    NULL  -- 測試用，沒有實際付款記錄
  )
  RETURNING id INTO v_new_subscription_id;
  
  -- 更新 members 表
  UPDATE members
  SET 
    current_subscription_id = v_new_subscription_id,
    is_vip = TRUE,
    vip_since = NOW()
  WHERE user_id = p_user_id;
  
  -- 建立今日的每日額度記錄
  INSERT INTO daily_usage_quotas (user_id, date, uploads_limit, queries_limit, uploads_used, queries_used)
  SELECT
    p_user_id,
    CURRENT_DATE,
    sp.upload_quota_daily,
    sp.query_quota_daily,
    0,
    0
  FROM subscription_plans sp
  WHERE sp.id = v_vip_plan_id
  ON CONFLICT (user_id, date) DO UPDATE
  SET 
    uploads_limit = EXCLUDED.uploads_limit,
    queries_limit = EXCLUDED.queries_limit;
  
  RETURN QUERY SELECT 
    TRUE, 
    format('成功設定為 VIP（%s 天）', p_days)::TEXT,
    v_new_subscription_id,
    v_end_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_member_as_vip_test(UUID, INTEGER) IS '測試工具：手動設定會員為 VIP';


-- 4. 測試工具：重置會員額度（測試用）
CREATE OR REPLACE FUNCTION reset_member_quota_test(p_user_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_subscription_type VARCHAR(20);
  v_plan_id UUID;
BEGIN
  -- 取得會員的訂閱類型
  SELECT ms.subscription_type, ms.plan_id
  INTO v_subscription_type, v_plan_id
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
  
  IF v_subscription_type IS NULL THEN
    RETURN QUERY SELECT FALSE, '找不到訂閱記錄'::TEXT;
    RETURN;
  END IF;
  
  -- 免費會員：重置總額度
  IF v_subscription_type = 'free_trial' THEN
    UPDATE member_subscriptions ms
    SET 
      remaining_upload_quota = sp.upload_quota_total,
      remaining_query_quota = sp.query_quota_total
    FROM subscription_plans sp
    WHERE ms.user_id = p_user_id
      AND ms.plan_id = sp.id
      AND ms.status IN ('trial', 'active');
    
    RETURN QUERY SELECT TRUE, '已重置免費會員總額度'::TEXT;
    
  -- VIP 會員：重置今日額度
  ELSE
    UPDATE daily_usage_quotas
    SET 
      uploads_used = 0,
      queries_used = 0
    WHERE user_id = p_user_id
      AND date = CURRENT_DATE;
    
    -- 如果今日沒有記錄，建立一筆
    INSERT INTO daily_usage_quotas (user_id, date, uploads_limit, queries_limit, uploads_used, queries_used)
    SELECT
      p_user_id,
      CURRENT_DATE,
      sp.upload_quota_daily,
      sp.query_quota_daily,
      0,
      0
    FROM subscription_plans sp
    WHERE sp.id = v_plan_id
    ON CONFLICT (user_id, date) DO UPDATE
    SET 
      uploads_used = 0,
      queries_used = 0;
    
    RETURN QUERY SELECT TRUE, '已重置 VIP 會員今日額度'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_member_quota_test(UUID) IS '測試工具：重置會員的使用額度';


-- 5. 測試工具：查看會員訂閱詳情
CREATE OR REPLACE FUNCTION get_member_subscription_detail(p_user_id UUID)
RETURNS TABLE (
  -- 訂閱資訊
  subscription_id UUID,
  plan_name VARCHAR(50),
  display_name VARCHAR(100),
  status VARCHAR(20),
  subscription_type VARCHAR(20),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  is_expired BOOLEAN,
  is_vip BOOLEAN,
  
  -- 額度資訊
  quota_type VARCHAR(10),
  upload_used INTEGER,
  upload_limit INTEGER,
  upload_remaining INTEGER,
  query_used INTEGER,
  query_limit INTEGER,
  query_remaining INTEGER
) AS $$
DECLARE
  v_subscription_type VARCHAR(20);
  v_plan_id UUID;
BEGIN
  -- 取得訂閱資訊
  SELECT ms.subscription_type, ms.plan_id
  INTO v_subscription_type, v_plan_id
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
  
  -- 免費會員
  IF v_subscription_type = 'free_trial' THEN
    RETURN QUERY
    SELECT
      ms.id,
      sp.plan_name,
      sp.display_name,
      ms.status,
      ms.subscription_type,
      ms.start_date,
      ms.end_date,
      GREATEST(0, EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER),
      (ms.end_date <= NOW()),
      FALSE,
      'total'::VARCHAR(10),
      (sp.upload_quota_total - COALESCE(ms.remaining_upload_quota, 0)),
      sp.upload_quota_total,
      COALESCE(ms.remaining_upload_quota, 0),
      (sp.query_quota_total - COALESCE(ms.remaining_query_quota, 0)),
      sp.query_quota_total,
      COALESCE(ms.remaining_query_quota, 0)
    FROM member_subscriptions ms
    JOIN subscription_plans sp ON ms.plan_id = sp.id
    WHERE ms.user_id = p_user_id
    ORDER BY ms.created_at DESC
    LIMIT 1;
    
  -- VIP 會員
  ELSE
    RETURN QUERY
    SELECT
      ms.id,
      sp.plan_name,
      sp.display_name,
      ms.status,
      ms.subscription_type,
      ms.start_date,
      ms.end_date,
      GREATEST(0, EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER),
      (ms.end_date <= NOW()),
      TRUE,
      'daily'::VARCHAR(10),
      COALESCE(duq.uploads_used, 0),
      COALESCE(duq.uploads_limit, sp.upload_quota_daily, 0),
      COALESCE(duq.uploads_limit - duq.uploads_used, sp.upload_quota_daily, 0),
      COALESCE(duq.queries_used, 0),
      COALESCE(duq.queries_limit, sp.query_quota_daily, 0),
      COALESCE(duq.queries_limit - duq.queries_used, sp.query_quota_daily, 0)
    FROM member_subscriptions ms
    JOIN subscription_plans sp ON ms.plan_id = sp.id
    LEFT JOIN daily_usage_quotas duq ON duq.user_id = ms.user_id AND duq.date = CURRENT_DATE
    WHERE ms.user_id = p_user_id
    ORDER BY ms.created_at DESC
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_member_subscription_detail(UUID) IS '查看會員的訂閱詳情（包含額度資訊）';


-- 6. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱系統 Part 3 建立完成';
  RAISE NOTICE '⚙️  已新增系統設定到 system_config';
  RAISE NOTICE '🧪 已建立測試工具函數:';
  RAISE NOTICE '   - create_trial_for_existing_members(): 為現有會員建立試用訂閱';
  RAISE NOTICE '   - set_member_as_vip_test(user_id, days): 手動設定會員為 VIP';
  RAISE NOTICE '   - reset_member_quota_test(user_id): 重置會員額度';
  RAISE NOTICE '   - get_member_subscription_detail(user_id): 查看訂閱詳情';
  RAISE NOTICE '';
  RAISE NOTICE '📝 下一步：執行以下 SQL 為現有會員建立試用訂閱';
  RAISE NOTICE '   SELECT * FROM create_trial_for_existing_members();';
END $$;

