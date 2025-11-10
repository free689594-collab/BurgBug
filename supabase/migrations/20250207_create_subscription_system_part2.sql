-- =====================================================
-- 訂閱系統 Part 2: 觸發器、函數和 RLS 政策
-- 建立日期: 2025-02-07
-- 說明: 建立自動化邏輯和安全政策
-- =====================================================

-- 1. 自動建立試用訂閱（當會員審核通過時）
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_trial_plan_id UUID;
  v_trial_days INTEGER;
  v_new_subscription_id UUID;
BEGIN
  -- 只在狀態從 pending 變更為 approved 時執行
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    
    -- 取得試用天數設定（從 system_config 或使用預設值 30）
    SELECT COALESCE(
      (SELECT CAST(config_value AS INTEGER) 
       FROM system_config 
       WHERE config_key = 'subscription_trial_days'),
      30
    ) INTO v_trial_days;
    
    -- 取得免費試用計畫 ID
    SELECT id INTO v_trial_plan_id
    FROM subscription_plans
    WHERE plan_name = 'free_trial' AND is_active = TRUE
    LIMIT 1;
    
    -- 如果找不到試用計畫，記錄錯誤並跳過
    IF v_trial_plan_id IS NULL THEN
      RAISE WARNING '找不到免費試用計畫，無法自動建立訂閱';
      RETURN NEW;
    END IF;
    
    -- 建立試用訂閱記錄
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
      NEW.user_id,
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
    
    -- 更新 members 表的 current_subscription_id
    UPDATE members
    SET 
      current_subscription_id = v_new_subscription_id,
      is_vip = FALSE
    WHERE user_id = NEW.user_id;
    
    RAISE NOTICE '✅ 已為會員 % 建立免費試用訂閱（% 天）', NEW.user_id, v_trial_days;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
DROP TRIGGER IF EXISTS trigger_create_trial_subscription ON members;
CREATE TRIGGER trigger_create_trial_subscription
  AFTER UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION create_trial_subscription();

COMMENT ON FUNCTION create_trial_subscription() IS '自動為審核通過的會員建立免費試用訂閱';


-- 2. 檢查訂閱狀態函數
CREATE OR REPLACE FUNCTION check_subscription_status(p_user_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  is_active BOOLEAN,
  subscription_type VARCHAR(20),
  status VARCHAR(20),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  is_expired BOOLEAN,
  is_vip BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ms.id as subscription_id,
    (ms.status IN ('trial', 'active') AND ms.end_date > NOW()) as is_active,
    ms.subscription_type,
    ms.status,
    ms.start_date,
    ms.end_date,
    GREATEST(0, EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER) as days_remaining,
    (ms.end_date <= NOW()) as is_expired,
    (ms.subscription_type = 'paid' AND ms.status = 'active') as is_vip
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_subscription_status(UUID) IS '檢查會員的訂閱狀態';


-- 3. 檢查使用額度函數
CREATE OR REPLACE FUNCTION check_usage_quota(
  p_user_id UUID,
  p_action_type VARCHAR(10) -- 'upload' or 'query'
)
RETURNS TABLE (
  has_quota BOOLEAN,
  remaining INTEGER,
  limit_value INTEGER,
  quota_type VARCHAR(10), -- 'daily' or 'total'
  subscription_type VARCHAR(20)
) AS $$
DECLARE
  v_subscription_type VARCHAR(20);
  v_status VARCHAR(20);
  v_today DATE := CURRENT_DATE;
  v_plan_id UUID;
BEGIN
  -- 取得當前訂閱狀態
  SELECT ms.subscription_type, ms.status, ms.plan_id
  INTO v_subscription_type, v_status, v_plan_id
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
  
  -- 如果沒有訂閱記錄或訂閱已過期，返回無額度
  IF v_subscription_type IS NULL OR v_status NOT IN ('trial', 'active') THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'none'::VARCHAR(10), 'none'::VARCHAR(20);
    RETURN;
  END IF;
  
  -- 免費會員：檢查總額度
  IF v_subscription_type = 'free_trial' THEN
    IF p_action_type = 'upload' THEN
      RETURN QUERY
      SELECT
        (ms.remaining_upload_quota > 0),
        COALESCE(ms.remaining_upload_quota, 0),
        COALESCE(sp.upload_quota_total, 0),
        'total'::VARCHAR(10),
        v_subscription_type
      FROM member_subscriptions ms
      JOIN subscription_plans sp ON ms.plan_id = sp.id
      WHERE ms.user_id = p_user_id
      ORDER BY ms.created_at DESC
      LIMIT 1;
    ELSE -- query
      RETURN QUERY
      SELECT
        (ms.remaining_query_quota > 0),
        COALESCE(ms.remaining_query_quota, 0),
        COALESCE(sp.query_quota_total, 0),
        'total'::VARCHAR(10),
        v_subscription_type
      FROM member_subscriptions ms
      JOIN subscription_plans sp ON ms.plan_id = sp.id
      WHERE ms.user_id = p_user_id
      ORDER BY ms.created_at DESC
      LIMIT 1;
    END IF;
    
  -- VIP 會員：檢查每日額度
  ELSE
    -- 確保今日額度記錄存在
    INSERT INTO daily_usage_quotas (user_id, date, uploads_limit, queries_limit)
    SELECT
      p_user_id,
      v_today,
      COALESCE(sp.upload_quota_daily, 0),
      COALESCE(sp.query_quota_daily, 0)
    FROM subscription_plans sp
    WHERE sp.id = v_plan_id
    ON CONFLICT (user_id, date) DO NOTHING;
    
    IF p_action_type = 'upload' THEN
      RETURN QUERY
      SELECT
        (duq.uploads_limit - duq.uploads_used > 0),
        (duq.uploads_limit - duq.uploads_used),
        duq.uploads_limit,
        'daily'::VARCHAR(10),
        v_subscription_type
      FROM daily_usage_quotas duq
      WHERE duq.user_id = p_user_id AND duq.date = v_today;
    ELSE -- query
      RETURN QUERY
      SELECT
        (duq.queries_limit - duq.queries_used > 0),
        (duq.queries_limit - duq.queries_used),
        duq.queries_limit,
        'daily'::VARCHAR(10),
        v_subscription_type
      FROM daily_usage_quotas duq
      WHERE duq.user_id = p_user_id AND duq.date = v_today;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_usage_quota(UUID, VARCHAR) IS '檢查會員的上傳或查詢額度';


-- 4. 扣除使用額度函數
CREATE OR REPLACE FUNCTION deduct_usage_quota(
  p_user_id UUID,
  p_action_type VARCHAR(10) -- 'upload' or 'query'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription_type VARCHAR(20);
  v_today DATE := CURRENT_DATE;
  v_has_quota BOOLEAN;
BEGIN
  -- 先檢查是否有額度
  SELECT has_quota, subscription_type
  INTO v_has_quota, v_subscription_type
  FROM check_usage_quota(p_user_id, p_action_type);
  
  -- 如果沒有額度，返回 FALSE
  IF NOT v_has_quota THEN
    RETURN FALSE;
  END IF;
  
  -- 免費會員：扣除總額度
  IF v_subscription_type = 'free_trial' THEN
    IF p_action_type = 'upload' THEN
      UPDATE member_subscriptions
      SET remaining_upload_quota = remaining_upload_quota - 1
      WHERE user_id = p_user_id
        AND subscription_type = 'free_trial'
        AND status IN ('trial', 'active')
        AND remaining_upload_quota > 0;
    ELSE -- query
      UPDATE member_subscriptions
      SET remaining_query_quota = remaining_query_quota - 1
      WHERE user_id = p_user_id
        AND subscription_type = 'free_trial'
        AND status IN ('trial', 'active')
        AND remaining_query_quota > 0;
    END IF;
    
  -- VIP 會員：扣除每日額度
  ELSE
    IF p_action_type = 'upload' THEN
      UPDATE daily_usage_quotas
      SET uploads_used = uploads_used + 1
      WHERE user_id = p_user_id
        AND date = v_today
        AND uploads_used < uploads_limit;
    ELSE -- query
      UPDATE daily_usage_quotas
      SET queries_used = queries_used + 1
      WHERE user_id = p_user_id
        AND date = v_today
        AND queries_used < queries_limit;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION deduct_usage_quota(UUID, VARCHAR) IS '扣除會員的上傳或查詢額度';


-- 5. 自動更新訂閱狀態為過期（定期執行）
CREATE OR REPLACE FUNCTION update_expired_subscriptions()
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- 將已過期但狀態仍為 trial 或 active 的訂閱更新為 expired
  UPDATE member_subscriptions
  SET status = 'expired'
  WHERE status IN ('trial', 'active')
    AND end_date <= NOW();
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- 同步更新 members 表的 is_vip 狀態
  UPDATE members m
  SET is_vip = FALSE
  WHERE is_vip = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM member_subscriptions ms
      WHERE ms.user_id = m.user_id
        AND ms.status = 'active'
        AND ms.subscription_type = 'paid'
        AND ms.end_date > NOW()
    );
  
  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_expired_subscriptions() IS '自動更新已過期的訂閱狀態';


-- 6. RLS 政策

-- subscription_plans: 所有人可讀，只有管理員可寫
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "所有人可查看訂閱計畫" ON subscription_plans;
CREATE POLICY "所有人可查看訂閱計畫"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "管理員可管理訂閱計畫" ON subscription_plans;
CREATE POLICY "管理員可管理訂閱計畫"
  ON subscription_plans FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  );


-- member_subscriptions: 會員只能看自己的，管理員可看全部
ALTER TABLE member_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員可查看自己的訂閱" ON member_subscriptions;
CREATE POLICY "會員可查看自己的訂閱"
  ON member_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "管理員可查看所有訂閱" ON member_subscriptions;
CREATE POLICY "管理員可查看所有訂閱"
  ON member_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  );


-- payments: 會員只能看自己的，管理員可看全部
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員可查看自己的付款記錄" ON payments;
CREATE POLICY "會員可查看自己的付款記錄"
  ON payments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "管理員可查看所有付款記錄" ON payments;
CREATE POLICY "管理員可查看所有付款記錄"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  );


-- daily_usage_quotas: 會員只能看自己的
ALTER TABLE daily_usage_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員可查看自己的每日額度" ON daily_usage_quotas;
CREATE POLICY "會員可查看自己的每日額度"
  ON daily_usage_quotas FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- subscription_notifications: 會員只能看自己的
ALTER TABLE subscription_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "會員可查看自己的訂閱通知" ON subscription_notifications;
CREATE POLICY "會員可查看自己的訂閱通知"
  ON subscription_notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());


-- 7. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱系統 Part 2 建立完成';
  RAISE NOTICE '🔧 已建立函數: create_trial_subscription, check_subscription_status, check_usage_quota, deduct_usage_quota, update_expired_subscriptions';
  RAISE NOTICE '🔒 已建立 RLS 政策';
  RAISE NOTICE '⚡ 已建立觸發器: trigger_create_trial_subscription';
END $$;

