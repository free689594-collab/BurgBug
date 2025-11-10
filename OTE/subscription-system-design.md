# 訂閱制度系統設計文檔

## 📋 目錄
1. [資料庫架構設計](#資料庫架構設計)
2. [API 設計](#api-設計)
3. [前端頁面設計](#前端頁面設計)
4. [綠界金流整合](#綠界金流整合)
5. [通知系統設計](#通知系統設計)
6. [權限控制設計](#權限控制設計)

---

## 1. 資料庫架構設計

### 1.1 新增資料表

#### A. 訂閱計畫表 (subscription_plans)
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name VARCHAR(50) NOT NULL,           -- 'free_trial', 'vip_monthly'
  display_name VARCHAR(100) NOT NULL,       -- '免費試用', 'VIP 月費會員'
  price DECIMAL(10, 2) NOT NULL,            -- 價格（0 或 1500）
  duration_days INTEGER NOT NULL,           -- 天數（30）
  upload_quota_daily INTEGER,               -- 每日上傳次數（免費：null，VIP：20）
  query_quota_daily INTEGER,                -- 每日查詢次數（免費：null，VIP：30）
  upload_quota_total INTEGER,               -- 總上傳次數（免費：10，VIP：null）
  query_quota_total INTEGER,                -- 總查詢次數（免費：10，VIP：null）
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### B. 會員訂閱記錄表 (member_subscriptions)
```sql
CREATE TABLE member_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES subscription_plans(id),
  
  -- 訂閱狀態
  status VARCHAR(20) NOT NULL,              -- 'trial', 'active', 'expired', 'cancelled'
  subscription_type VARCHAR(20) NOT NULL,   -- 'free_trial', 'paid'
  
  -- 時間管理
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  trial_end_date TIMESTAMPTZ,               -- 試用期結束日期
  
  -- 付款資訊
  payment_id UUID REFERENCES payments(id),
  auto_renew BOOLEAN DEFAULT FALSE,
  
  -- 使用額度（免費會員用總額度，付費會員用每日額度）
  remaining_upload_quota INTEGER,           -- 剩餘上傳次數（僅免費會員使用）
  remaining_query_quota INTEGER,            -- 剩餘查詢次數（僅免費會員使用）
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_subscription_status CHECK (
    status IN ('trial', 'active', 'expired', 'cancelled')
  ),
  CONSTRAINT chk_subscription_type CHECK (
    subscription_type IN ('free_trial', 'paid')
  )
);

-- 索引
CREATE INDEX idx_member_subscriptions_user_id ON member_subscriptions(user_id);
CREATE INDEX idx_member_subscriptions_status ON member_subscriptions(status);
CREATE INDEX idx_member_subscriptions_end_date ON member_subscriptions(end_date);
```

#### C. 付款記錄表 (payments)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 訂單資訊
  order_number VARCHAR(50) UNIQUE NOT NULL,  -- 訂單編號
  amount DECIMAL(10, 2) NOT NULL,            -- 金額
  currency VARCHAR(3) DEFAULT 'TWD',
  
  -- 綠界金流資訊
  ecpay_merchant_trade_no VARCHAR(20) UNIQUE, -- 綠界訂單編號
  ecpay_trade_no VARCHAR(20),                 -- 綠界交易編號
  ecpay_payment_type VARCHAR(20),             -- 付款方式
  ecpay_rtn_code INTEGER,                     -- 回傳代碼
  ecpay_rtn_msg TEXT,                         -- 回傳訊息
  
  -- 付款狀態
  status VARCHAR(20) NOT NULL,               -- 'pending', 'completed', 'failed', 'refunded'
  paid_at TIMESTAMPTZ,
  
  -- 訂閱關聯
  subscription_id UUID REFERENCES member_subscriptions(id),
  
  -- 備註
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_payment_status CHECK (
    status IN ('pending', 'completed', 'failed', 'refunded')
  )
);

-- 索引
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_order_number ON payments(order_number);
```

#### D. 每日使用額度表 (daily_usage_quotas)
```sql
CREATE TABLE daily_usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- 每日使用次數
  uploads_used INTEGER DEFAULT 0,
  queries_used INTEGER DEFAULT 0,
  
  -- 每日限額（從訂閱計畫複製）
  uploads_limit INTEGER NOT NULL,
  queries_limit INTEGER NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- 索引
CREATE INDEX idx_daily_usage_quotas_user_date ON daily_usage_quotas(user_id, date);
```

#### E. 訂閱通知記錄表 (subscription_notifications)
```sql
CREATE TABLE subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES member_subscriptions(id),
  
  -- 通知類型
  notification_type VARCHAR(30) NOT NULL,    -- 'expiry_7days', 'expiry_3days', 'expiry_1day', 'expired'
  
  -- 發送狀態
  sent_at TIMESTAMPTZ,
  is_sent BOOLEAN DEFAULT FALSE,
  
  -- 訊息內容
  message_id UUID REFERENCES messages(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT chk_notification_type CHECK (
    notification_type IN ('expiry_7days', 'expiry_3days', 'expiry_1day', 'expired')
  )
);

-- 索引
CREATE INDEX idx_subscription_notifications_user_id ON subscription_notifications(user_id);
CREATE INDEX idx_subscription_notifications_sent ON subscription_notifications(is_sent);
```

### 1.2 修改現有資料表

#### A. members 表新增欄位
```sql
ALTER TABLE members
ADD COLUMN current_subscription_id UUID REFERENCES member_subscriptions(id),
ADD COLUMN is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN vip_since TIMESTAMPTZ;
```

#### B. system_config 表新增設定
```sql
-- 新增訂閱相關系統設定
INSERT INTO system_config (config_key, config_value, description, value_type) VALUES
('subscription_trial_days', '30', '新會員免費試用天數', 'integer'),
('subscription_monthly_price', '1500', 'VIP 月費金額（新台幣）', 'decimal'),
('subscription_free_upload_quota', '10', '免費會員總上傳次數', 'integer'),
('subscription_free_query_quota', '10', '免費會員總查詢次數', 'integer'),
('subscription_vip_upload_daily', '20', 'VIP 會員每日上傳次數', 'integer'),
('subscription_vip_query_daily', '30', 'VIP 會員每日查詢次數', 'integer'),
('ecpay_merchant_id', '', '綠界商店代號', 'string'),
('ecpay_hash_key', '', '綠界 HashKey', 'string'),
('ecpay_hash_iv', '', '綠界 HashIV', 'string'),
('ecpay_test_mode', 'true', '綠界測試模式', 'boolean');
```

### 1.3 觸發器和函數

#### A. 自動建立訂閱記錄（會員審核通過時）
```sql
CREATE OR REPLACE FUNCTION create_trial_subscription()
RETURNS TRIGGER AS $$
DECLARE
  trial_plan_id UUID;
  trial_days INTEGER;
BEGIN
  -- 只在狀態從 pending 變更為 approved 時執行
  IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    -- 取得試用天數設定
    SELECT CAST(config_value AS INTEGER) INTO trial_days
    FROM system_config
    WHERE config_key = 'subscription_trial_days';
    
    -- 取得免費試用計畫 ID
    SELECT id INTO trial_plan_id
    FROM subscription_plans
    WHERE plan_name = 'free_trial' AND is_active = TRUE
    LIMIT 1;
    
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
      trial_plan_id,
      'trial',
      'free_trial',
      NOW(),
      NOW() + (trial_days || ' days')::INTERVAL,
      NOW() + (trial_days || ' days')::INTERVAL,
      sp.upload_quota_total,
      sp.query_quota_total
    FROM subscription_plans sp
    WHERE sp.id = trial_plan_id;
    
    -- 更新 members 表
    UPDATE members
    SET current_subscription_id = (
      SELECT id FROM member_subscriptions
      WHERE user_id = NEW.user_id
      ORDER BY created_at DESC
      LIMIT 1
    )
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_trial_subscription
AFTER UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION create_trial_subscription();
```

#### B. 檢查訂閱狀態函數
```sql
CREATE OR REPLACE FUNCTION check_subscription_status(p_user_id UUID)
RETURNS TABLE (
  is_active BOOLEAN,
  subscription_type VARCHAR(20),
  end_date TIMESTAMPTZ,
  days_remaining INTEGER,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (ms.status IN ('trial', 'active') AND ms.end_date > NOW()) as is_active,
    ms.subscription_type,
    ms.end_date,
    EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER as days_remaining,
    (ms.end_date <= NOW()) as is_expired
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

#### C. 檢查使用額度函數
```sql
CREATE OR REPLACE FUNCTION check_usage_quota(
  p_user_id UUID,
  p_action_type VARCHAR(10) -- 'upload' or 'query'
)
RETURNS TABLE (
  has_quota BOOLEAN,
  remaining INTEGER,
  limit_value INTEGER,
  quota_type VARCHAR(10) -- 'daily' or 'total'
) AS $$
DECLARE
  v_subscription_type VARCHAR(20);
  v_status VARCHAR(20);
  v_today DATE := CURRENT_DATE;
BEGIN
  -- 取得當前訂閱狀態
  SELECT ms.subscription_type, ms.status
  INTO v_subscription_type, v_status
  FROM member_subscriptions ms
  WHERE ms.user_id = p_user_id
  ORDER BY ms.created_at DESC
  LIMIT 1;
  
  -- 如果訂閱已過期，返回無額度
  IF v_status NOT IN ('trial', 'active') THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'none'::VARCHAR(10);
    RETURN;
  END IF;
  
  -- 免費會員：檢查總額度
  IF v_subscription_type = 'free_trial' THEN
    IF p_action_type = 'upload' THEN
      RETURN QUERY
      SELECT
        (ms.remaining_upload_quota > 0),
        ms.remaining_upload_quota,
        sp.upload_quota_total,
        'total'::VARCHAR(10)
      FROM member_subscriptions ms
      JOIN subscription_plans sp ON ms.plan_id = sp.id
      WHERE ms.user_id = p_user_id
      ORDER BY ms.created_at DESC
      LIMIT 1;
    ELSE
      RETURN QUERY
      SELECT
        (ms.remaining_query_quota > 0),
        ms.remaining_query_quota,
        sp.query_quota_total,
        'total'::VARCHAR(10)
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
      sp.upload_quota_daily,
      sp.query_quota_daily
    FROM subscription_plans sp
    JOIN member_subscriptions ms ON ms.plan_id = sp.id
    WHERE ms.user_id = p_user_id
    ORDER BY ms.created_at DESC
    LIMIT 1
    ON CONFLICT (user_id, date) DO NOTHING;
    
    IF p_action_type = 'upload' THEN
      RETURN QUERY
      SELECT
        (duq.uploads_limit - duq.uploads_used > 0),
        (duq.uploads_limit - duq.uploads_used),
        duq.uploads_limit,
        'daily'::VARCHAR(10)
      FROM daily_usage_quotas duq
      WHERE duq.user_id = p_user_id AND duq.date = v_today;
    ELSE
      RETURN QUERY
      SELECT
        (duq.queries_limit - duq.queries_used > 0),
        (duq.queries_limit - duq.queries_used),
        duq.queries_limit,
        'daily'::VARCHAR(10)
      FROM daily_usage_quotas duq
      WHERE duq.user_id = p_user_id AND duq.date = v_today;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. API 設計

### 2.1 訂閱狀態 API

#### GET /api/subscription/status
取得當前會員的訂閱狀態
```typescript
Response: {
  subscription: {
    id: string
    status: 'trial' | 'active' | 'expired'
    type: 'free_trial' | 'paid'
    startDate: string
    endDate: string
    daysRemaining: number
    isExpired: boolean
  }
  quotas: {
    upload: {
      type: 'daily' | 'total'
      used: number
      limit: number
      remaining: number
    }
    query: {
      type: 'daily' | 'total'
      used: number
      limit: number
      remaining: number
    }
  }
  isVip: boolean
}
```

### 2.2 繳費續費 API

#### POST /api/subscription/create-payment
建立付款訂單（整合綠界）
```typescript
Request: {
  planId: string  // 訂閱計畫 ID
}

Response: {
  orderId: string
  amount: number
  ecpayFormHtml: string  // 綠界付款表單 HTML
}
```

#### POST /api/subscription/ecpay-callback
綠界付款回調處理
```typescript
Request: {
  // 綠界回傳的參數
  MerchantTradeNo: string
  TradeNo: string
  RtnCode: number
  RtnMsg: string
  PaymentType: string
  // ... 其他綠界參數
}
```

### 2.3 管理後台 API

#### GET /api/admin/subscription/stats
取得訂閱統計資料
```typescript
Response: {
  totalMembers: number
  paidMembers: number
  trialMembers: number
  expiredMembers: number
  totalRevenue: number
  monthlyRevenue: number
  subscriptionDistribution: {
    trial: number
    active: number
    expired: number
  }
}
```

#### PATCH /api/admin/subscription/settings
更新訂閱設定
```typescript
Request: {
  trialDays?: number
  monthlyPrice?: number
  freeUploadQuota?: number
  freeQueryQuota?: number
  vipUploadDaily?: number
  vipQueryDaily?: number
}
```

---

## 3. 前端頁面設計

### 3.1 會員 Dashboard 修改
- 顯示訂閱狀態標籤（免費/VIP）
- 顯示剩餘天數或到期日
- 顯示使用額度進度條
- 到期提醒橫幅

### 3.2 繳費續費頁面 (/subscription/payment)
- 當前訂閱狀態
- 續費方案選擇
- 價格顯示
- 綠界付款表單
- 付款歷史記錄

### 3.3 管理後台新增
- 訂閱統計儀表板
- 訂閱設定管理
- 付款記錄查詢
- 會員訂閱狀態管理

---

## 4. 實作優先順序

### Phase 1: 資料庫基礎（第1-2天）
1. 建立所有資料表
2. 建立觸發器和函數
3. 插入初始資料（訂閱計畫）
4. 測試資料庫邏輯

### Phase 2: 後端 API（第3-4天）
1. 訂閱狀態查詢 API
2. 額度檢查整合到現有上傳/查詢 API
3. 管理後台統計 API
4. 系統設定 API

### Phase 3: 綠界金流整合（第5-6天）
1. 綠界 SDK 整合
2. 付款訂單建立
3. 付款回調處理
4. 訂閱自動續期

### Phase 4: 前端介面（第7-8天）
1. 會員訂閱狀態顯示
2. 繳費續費頁面
3. 管理後台訂閱管理
4. 到期提醒 UI

### Phase 5: 通知系統（第9天）
1. 到期前通知（7/3/1天）
2. 登入提醒
3. 站內信整合

### Phase 6: 強制續費機制（第10天）
1. Middleware 訂閱檢查
2. 到期後功能鎖定
3. 強制跳轉邏輯

### Phase 7: 測試與部署（第11-12天）
1. 本地完整測試
2. 綠界測試環境驗證
3. 生產環境部署
4. 監控與調整

---

## 5. 注意事項

### 安全性
- 綠界金鑰必須存在環境變數，不可提交到 Git
- 付款回調需要驗證 CheckMacValue
- 訂閱狀態檢查必須在伺服器端進行

### 效能
- 使用索引優化查詢
- 每日額度記錄定期清理（保留 90 天）
- 訂閱狀態快取（Redis，未來考慮）

### 相容性
- 現有會員自動獲得 30 天試用期
- 不影響現有功能的正常運作
- 平滑過渡，無需停機維護

