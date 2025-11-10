-- =====================================================
-- 新增 subscription_id 欄位到 payments 表
-- 建立日期: 2025-11-08
-- 說明: 關聯付款記錄與訂閱記錄
-- =====================================================

-- 新增 subscription_id 欄位
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES member_subscriptions(id);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);

-- 註解
COMMENT ON COLUMN payments.subscription_id IS '關聯的訂閱記錄 ID';

