-- =====================================================
-- 訂閱系統 Part 1: 基礎資料表
-- 建立日期: 2025-02-07
-- 說明: 建立訂閱計畫、會員訂閱、付款記錄等核心資料表
-- =====================================================

-- 1. 訂閱計畫表 (subscription_plans)
-- 用途: 定義不同的訂閱方案（免費試用、VIP 月費等）
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 計畫識別
  plan_name VARCHAR(50) NOT NULL UNIQUE,        -- 'free_trial', 'vip_monthly'
  display_name VARCHAR(100) NOT NULL,           -- '免費試用', 'VIP 月費會員'
  description TEXT,                             -- 計畫說明
  
  -- 價格與期限
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,      -- 價格（0 或 1500）
  currency VARCHAR(3) DEFAULT 'TWD',            -- 幣別
  duration_days INTEGER NOT NULL,               -- 天數（30）
  
  -- 使用額度設定
  upload_quota_daily INTEGER,                   -- 每日上傳次數（VIP：20，免費：null）
  query_quota_daily INTEGER,                    -- 每日查詢次數（VIP：30，免費：null）
  upload_quota_total INTEGER,                   -- 總上傳次數（免費：10，VIP：null）
  query_quota_total INTEGER,                    -- 總查詢次數（免費：10，VIP：null）
  
  -- 狀態
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 約束條件
  CONSTRAINT chk_plan_price CHECK (price >= 0),
  CONSTRAINT chk_plan_duration CHECK (duration_days > 0)
);

-- 索引
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_name ON subscription_plans(plan_name);

-- 註解
COMMENT ON TABLE subscription_plans IS '訂閱計畫表：定義不同的訂閱方案';
COMMENT ON COLUMN subscription_plans.plan_name IS '計畫名稱（系統識別用）';
COMMENT ON COLUMN subscription_plans.display_name IS '顯示名稱（給用戶看）';
COMMENT ON COLUMN subscription_plans.upload_quota_daily IS '每日上傳次數限制（null 表示不使用每日限制）';
COMMENT ON COLUMN subscription_plans.upload_quota_total IS '總上傳次數限制（null 表示不使用總量限制）';


-- 2. 付款記錄表 (payments)
-- 用途: 記錄所有付款交易（包含綠界金流資訊）
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 訂單資訊
  order_number VARCHAR(50) UNIQUE NOT NULL,     -- 系統訂單編號
  amount DECIMAL(10, 2) NOT NULL,               -- 金額
  currency VARCHAR(3) DEFAULT 'TWD',            -- 幣別
  
  -- 綠界金流資訊
  ecpay_merchant_trade_no VARCHAR(20) UNIQUE,   -- 綠界訂單編號（MerchantTradeNo）
  ecpay_trade_no VARCHAR(20),                   -- 綠界交易編號（TradeNo）
  ecpay_payment_type VARCHAR(20),               -- 付款方式（Credit_CreditCard, ATM_TAISHIN 等）
  ecpay_payment_date TIMESTAMPTZ,               -- 付款時間
  ecpay_rtn_code INTEGER,                       -- 回傳代碼（1=成功）
  ecpay_rtn_msg TEXT,                           -- 回傳訊息
  ecpay_simulate_paid INTEGER DEFAULT 0,        -- 模擬付款（測試用）
  
  -- 付款狀態
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'refunded'
  paid_at TIMESTAMPTZ,                          -- 實際付款時間
  
  -- 備註
  notes TEXT,
  admin_notes TEXT,                             -- 管理員備註
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 約束條件
  CONSTRAINT chk_payment_status CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')
  ),
  CONSTRAINT chk_payment_amount CHECK (amount >= 0)
);

-- 索引
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_order_number ON payments(order_number);
CREATE INDEX idx_payments_ecpay_merchant_trade_no ON payments(ecpay_merchant_trade_no);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- 註解
COMMENT ON TABLE payments IS '付款記錄表：記錄所有付款交易';
COMMENT ON COLUMN payments.order_number IS '系統內部訂單編號';
COMMENT ON COLUMN payments.ecpay_merchant_trade_no IS '綠界商店訂單編號（由系統產生）';
COMMENT ON COLUMN payments.ecpay_trade_no IS '綠界交易編號（由綠界產生）';
COMMENT ON COLUMN payments.ecpay_rtn_code IS '綠界回傳代碼（1=付款成功）';


-- 3. 會員訂閱記錄表 (member_subscriptions)
-- 用途: 記錄每個會員的訂閱狀態和期限
CREATE TABLE IF NOT EXISTS member_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  
  -- 訂閱狀態
  status VARCHAR(20) NOT NULL,                  -- 'trial', 'active', 'expired', 'cancelled'
  subscription_type VARCHAR(20) NOT NULL,       -- 'free_trial', 'paid'
  
  -- 時間管理
  start_date TIMESTAMPTZ NOT NULL,              -- 訂閱開始日期
  end_date TIMESTAMPTZ NOT NULL,                -- 訂閱結束日期
  trial_end_date TIMESTAMPTZ,                   -- 試用期結束日期（僅試用訂閱有值）
  
  -- 付款資訊
  payment_id UUID REFERENCES payments(id),      -- 關聯的付款記錄
  auto_renew BOOLEAN DEFAULT FALSE,             -- 自動續約（未來功能）
  
  -- 使用額度（僅免費會員使用總額度）
  remaining_upload_quota INTEGER,               -- 剩餘上傳次數（僅免費會員）
  remaining_query_quota INTEGER,                -- 剩餘查詢次數（僅免費會員）
  
  -- 取消資訊
  cancelled_at TIMESTAMPTZ,                     -- 取消時間
  cancelled_reason TEXT,                        -- 取消原因
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 約束條件
  CONSTRAINT chk_subscription_status CHECK (
    status IN ('trial', 'active', 'expired', 'cancelled')
  ),
  CONSTRAINT chk_subscription_type CHECK (
    subscription_type IN ('free_trial', 'paid')
  ),
  CONSTRAINT chk_subscription_dates CHECK (end_date > start_date)
);

-- 索引
CREATE INDEX idx_member_subscriptions_user_id ON member_subscriptions(user_id);
CREATE INDEX idx_member_subscriptions_status ON member_subscriptions(status);
CREATE INDEX idx_member_subscriptions_end_date ON member_subscriptions(end_date);
CREATE INDEX idx_member_subscriptions_type ON member_subscriptions(subscription_type);
CREATE INDEX idx_member_subscriptions_user_status ON member_subscriptions(user_id, status);

-- 註解
COMMENT ON TABLE member_subscriptions IS '會員訂閱記錄表：記錄每個會員的訂閱狀態';
COMMENT ON COLUMN member_subscriptions.status IS '訂閱狀態：trial=試用中, active=付費中, expired=已過期, cancelled=已取消';
COMMENT ON COLUMN member_subscriptions.subscription_type IS '訂閱類型：free_trial=免費試用, paid=付費訂閱';
COMMENT ON COLUMN member_subscriptions.remaining_upload_quota IS '剩餘上傳次數（僅免費會員使用，VIP 會員為 null）';


-- 4. 每日使用額度表 (daily_usage_quotas)
-- 用途: 記錄 VIP 會員的每日使用額度
CREATE TABLE IF NOT EXISTS daily_usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,                           -- 日期
  
  -- 每日使用次數
  uploads_used INTEGER DEFAULT 0,               -- 已使用上傳次數
  queries_used INTEGER DEFAULT 0,               -- 已使用查詢次數
  
  -- 每日限額（從訂閱計畫複製）
  uploads_limit INTEGER NOT NULL,               -- 上傳次數限額
  queries_limit INTEGER NOT NULL,               -- 查詢次數限額
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 約束條件
  UNIQUE(user_id, date),
  CONSTRAINT chk_daily_usage_positive CHECK (
    uploads_used >= 0 AND queries_used >= 0 AND
    uploads_limit >= 0 AND queries_limit >= 0
  )
);

-- 索引
CREATE INDEX idx_daily_usage_quotas_user_date ON daily_usage_quotas(user_id, date);
CREATE INDEX idx_daily_usage_quotas_date ON daily_usage_quotas(date);

-- 註解
COMMENT ON TABLE daily_usage_quotas IS '每日使用額度表：記錄 VIP 會員的每日使用情況';
COMMENT ON COLUMN daily_usage_quotas.uploads_used IS '今日已使用的上傳次數';
COMMENT ON COLUMN daily_usage_quotas.queries_used IS '今日已使用的查詢次數';


-- 5. 訂閱通知記錄表 (subscription_notifications)
-- 用途: 記錄訂閱到期通知的發送狀態
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES member_subscriptions(id) ON DELETE CASCADE,
  
  -- 通知類型
  notification_type VARCHAR(30) NOT NULL,       -- 'expiry_7days', 'expiry_3days', 'expiry_1day', 'expired'
  
  -- 發送狀態
  sent_at TIMESTAMPTZ,                          -- 發送時間
  is_sent BOOLEAN DEFAULT FALSE,                -- 是否已發送
  
  -- 訊息內容
  message_id UUID REFERENCES messages(id),      -- 關聯的站內信 ID
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 約束條件
  CONSTRAINT chk_notification_type CHECK (
    notification_type IN ('expiry_7days', 'expiry_3days', 'expiry_1day', 'expired')
  )
);

-- 索引
CREATE INDEX idx_subscription_notifications_user_id ON subscription_notifications(user_id);
CREATE INDEX idx_subscription_notifications_sent ON subscription_notifications(is_sent);
CREATE INDEX idx_subscription_notifications_type ON subscription_notifications(notification_type);
CREATE INDEX idx_subscription_notifications_subscription ON subscription_notifications(subscription_id);

-- 註解
COMMENT ON TABLE subscription_notifications IS '訂閱通知記錄表：記錄到期通知的發送狀態';
COMMENT ON COLUMN subscription_notifications.notification_type IS '通知類型：expiry_7days=7天前, expiry_3days=3天前, expiry_1day=1天前, expired=已過期';


-- 6. 修改 members 表，新增訂閱相關欄位
ALTER TABLE members
ADD COLUMN IF NOT EXISTS current_subscription_id UUID REFERENCES member_subscriptions(id),
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vip_since TIMESTAMPTZ;

-- 索引
CREATE INDEX IF NOT EXISTS idx_members_is_vip ON members(is_vip);
CREATE INDEX IF NOT EXISTS idx_members_current_subscription ON members(current_subscription_id);

-- 註解
COMMENT ON COLUMN members.current_subscription_id IS '當前有效的訂閱記錄 ID';
COMMENT ON COLUMN members.is_vip IS '是否為 VIP 會員（快取欄位，方便查詢）';
COMMENT ON COLUMN members.vip_since IS '成為 VIP 的時間';


-- 7. 更新 updated_at 觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為新表建立 updated_at 觸發器
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_member_subscriptions_updated_at ON member_subscriptions;
CREATE TRIGGER update_member_subscriptions_updated_at
  BEFORE UPDATE ON member_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_usage_quotas_updated_at ON daily_usage_quotas;
CREATE TRIGGER update_daily_usage_quotas_updated_at
  BEFORE UPDATE ON daily_usage_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- 8. 插入初始訂閱計畫資料
INSERT INTO subscription_plans (plan_name, display_name, description, price, duration_days, upload_quota_total, query_quota_total, upload_quota_daily, query_quota_daily)
VALUES
  (
    'free_trial',
    '免費試用',
    '新會員免費試用 30 天，總共可上傳 10 次、查詢 10 次',
    0.00,
    30,
    10,  -- 總上傳次數
    10,  -- 總查詢次數
    NULL, -- 無每日限制
    NULL  -- 無每日限制
  ),
  (
    'vip_monthly',
    'VIP 月費會員',
    'VIP 會員每月 1500 元，每日可上傳 20 次、查詢 30 次',
    1500.00,
    30,
    NULL, -- 無總量限制
    NULL, -- 無總量限制
    20,   -- 每日上傳次數
    30    -- 每日查詢次數
  )
ON CONFLICT (plan_name) DO NOTHING;


-- 9. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱系統 Part 1 建立完成';
  RAISE NOTICE '📊 已建立資料表: subscription_plans, payments, member_subscriptions, daily_usage_quotas, subscription_notifications';
  RAISE NOTICE '📝 已插入初始訂閱計畫: free_trial, vip_monthly';
  RAISE NOTICE '🔄 已建立 updated_at 觸發器';
END $$;

