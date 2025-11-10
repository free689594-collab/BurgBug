-- ============================================================
-- Phase 6: 訂閱管理功能（簡化版）
-- ============================================================

-- ============================================================
-- 1. 查詢訂閱歷史（最近 3 筆）
-- ============================================================
CREATE OR REPLACE FUNCTION get_subscription_history(
  p_user_id UUID
)
RETURNS TABLE (
  subscription_id UUID,
  plan_name VARCHAR(50),
  display_name VARCHAR(100),
  status VARCHAR(20),
  subscription_type VARCHAR(20),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  days_duration INTEGER,
  payment_amount DECIMAL(10, 2),
  payment_status VARCHAR(20),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id AS subscription_id,
    sp.plan_name,
    sp.display_name,
    ms.status,
    ms.subscription_type,
    ms.start_date,
    ms.end_date,
    EXTRACT(DAY FROM (ms.end_date - ms.start_date))::INTEGER AS days_duration,
    p.amount AS payment_amount,
    p.status AS payment_status,
    ms.created_at
  FROM member_subscriptions ms
  INNER JOIN subscription_plans sp ON ms.plan_id = sp.id
  LEFT JOIN payments p ON p.subscription_id = ms.id
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. 查詢付款記錄（會員端：最近 3 筆）
-- ============================================================
CREATE OR REPLACE FUNCTION get_payment_history(
  p_user_id UUID
)
RETURNS TABLE (
  payment_id UUID,
  order_number VARCHAR(50),
  amount DECIMAL(10, 2),
  payment_method VARCHAR(20),
  payment_status VARCHAR(20),
  ecpay_trade_no VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  plan_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS payment_id,
    p.order_number,
    p.amount,
    p.payment_method,
    p.status AS payment_status,
    p.ecpay_trade_no,
    p.paid_at,
    p.created_at,
    sp.display_name AS plan_name
  FROM payments p
  LEFT JOIN member_subscriptions ms ON p.subscription_id = ms.id
  LEFT JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE p.user_id = p_user_id
  ORDER BY p.created_at DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. 查詢即將到期的訂閱（管理員用）
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_expiring_subscriptions(
  p_days_threshold INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  account VARCHAR(50),
  nickname VARCHAR(50),
  plan_name VARCHAR(100),
  status VARCHAR(20),
  end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ms.id AS subscription_id,
    ms.user_id,
    m.account,
    m.nickname,
    sp.display_name AS plan_name,
    ms.status,
    ms.end_date,
    EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER AS days_remaining,
    ms.created_at
  FROM member_subscriptions ms
  INNER JOIN members m ON ms.user_id = m.user_id
  INNER JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE ms.status IN ('trial', 'active')
    AND ms.end_date > NOW()
    AND ms.end_date <= NOW() + (p_days_threshold || ' days')::INTERVAL
  ORDER BY ms.end_date ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 4. 管理員延長訂閱期限
-- ============================================================
CREATE OR REPLACE FUNCTION admin_extend_subscription(
  p_subscription_id UUID,
  p_extend_days INTEGER,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  subscription_id UUID,
  old_end_date TIMESTAMPTZ,
  new_end_date TIMESTAMPTZ,
  extended_days INTEGER
) AS $$
DECLARE
  v_old_end_date TIMESTAMPTZ;
  v_new_end_date TIMESTAMPTZ;
  v_status VARCHAR(20);
BEGIN
  -- 驗證延長天數
  IF p_extend_days < 1 OR p_extend_days > 100 THEN
    RETURN QUERY SELECT 
      FALSE,
      '延長天數必須在 1-100 天之間'::TEXT,
      p_subscription_id,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      0;
    RETURN;
  END IF;

  -- 查詢訂閱資訊
  SELECT end_date, status INTO v_old_end_date, v_status
  FROM member_subscriptions
  WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      '訂閱不存在'::TEXT,
      p_subscription_id,
      NULL::TIMESTAMPTZ,
      NULL::TIMESTAMPTZ,
      0;
    RETURN;
  END IF;

  -- 計算新的結束日期
  v_new_end_date := v_old_end_date + (p_extend_days || ' days')::INTERVAL;

  -- 更新訂閱
  UPDATE member_subscriptions
  SET 
    end_date = v_new_end_date,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  -- 記錄延長歷史（如果有備註）
  IF p_admin_note IS NOT NULL THEN
    -- 這裡可以記錄到一個管理員操作日誌表
    -- 目前先省略，之後可以擴充
    NULL;
  END IF;

  RETURN QUERY SELECT 
    TRUE,
    '訂閱已成功延長 ' || p_extend_days || ' 天'::TEXT,
    p_subscription_id,
    v_old_end_date,
    v_new_end_date,
    p_extend_days;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. 管理員更新訂閱狀態
-- ============================================================
CREATE OR REPLACE FUNCTION admin_update_subscription_status(
  p_subscription_id UUID,
  p_new_status VARCHAR(20),
  p_admin_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  subscription_id UUID,
  old_status VARCHAR(20),
  new_status VARCHAR(20)
) AS $$
DECLARE
  v_old_status VARCHAR(20);
  v_user_id UUID;
BEGIN
  -- 驗證狀態值
  IF p_new_status NOT IN ('trial', 'active', 'expired', 'cancelled') THEN
    RETURN QUERY SELECT 
      FALSE,
      '無效的訂閱狀態'::TEXT,
      p_subscription_id,
      NULL::VARCHAR(20),
      NULL::VARCHAR(20);
    RETURN;
  END IF;

  -- 查詢訂閱資訊
  SELECT status, user_id INTO v_old_status, v_user_id
  FROM member_subscriptions
  WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      '訂閱不存在'::TEXT,
      p_subscription_id,
      NULL::VARCHAR(20),
      NULL::VARCHAR(20);
    RETURN;
  END IF;

  -- 更新訂閱狀態
  UPDATE member_subscriptions
  SET 
    status = p_new_status,
    updated_at = NOW()
  WHERE id = p_subscription_id;

  -- 更新會員 VIP 狀態
  UPDATE members
  SET 
    is_vip = CASE 
      WHEN p_new_status IN ('trial', 'active') THEN TRUE
      ELSE FALSE
    END,
    updated_at = NOW()
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT 
    TRUE,
    '訂閱狀態已更新'::TEXT,
    p_subscription_id,
    v_old_status,
    p_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. 查詢所有付款記錄（管理員用，支援分頁和篩選）
-- ============================================================
CREATE OR REPLACE FUNCTION admin_get_payment_records(
  p_payment_status VARCHAR(20) DEFAULT NULL,
  p_payment_method VARCHAR(20) DEFAULT NULL,
  p_account VARCHAR(50) DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  payment_id UUID,
  order_number VARCHAR(50),
  user_id UUID,
  account VARCHAR(50),
  nickname VARCHAR(50),
  amount DECIMAL(10, 2),
  payment_method VARCHAR(20),
  payment_status VARCHAR(20),
  ecpay_trade_no VARCHAR(100),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  plan_name VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS payment_id,
    p.order_number,
    p.user_id,
    m.account,
    m.nickname,
    p.amount,
    p.payment_method,
    p.status AS payment_status,
    p.ecpay_trade_no,
    p.paid_at,
    p.created_at,
    sp.display_name AS plan_name
  FROM payments p
  INNER JOIN members m ON p.user_id = m.user_id
  LEFT JOIN member_subscriptions ms ON p.subscription_id = ms.id
  LEFT JOIN subscription_plans sp ON ms.plan_id = sp.id
  WHERE 
    (p_payment_status IS NULL OR p.status = p_payment_status)
    AND (p_payment_method IS NULL OR p.payment_method = p_payment_method)
    AND (p_account IS NULL OR m.account ILIKE '%' || p_account || '%')
    AND (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. 統計付款記錄總數（管理員用）
-- ============================================================
CREATE OR REPLACE FUNCTION admin_count_payment_records(
  p_payment_status VARCHAR(20) DEFAULT NULL,
  p_payment_method VARCHAR(20) DEFAULT NULL,
  p_account VARCHAR(50) DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM payments p
  INNER JOIN members m ON p.user_id = m.user_id
  WHERE 
    (p_payment_status IS NULL OR p.status = p_payment_status)
    AND (p_payment_method IS NULL OR p.payment_method = p_payment_method)
    AND (p_account IS NULL OR m.account ILIKE '%' || p_account || '%')
    AND (p_start_date IS NULL OR p.created_at >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at <= p_end_date);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

