# 執行 Phase 1 Migrations 指引

由於 Supabase JavaScript 客戶端不支援直接執行複雜的 DDL SQL，我們需要在 Supabase Dashboard 手動執行 migration 檔案。

## 📋 執行步驟

### 步驟 1: 登入 Supabase Dashboard

1. 開啟瀏覽器，前往：https://supabase.com/dashboard
2. 登入你的帳號
3. 選擇專案：**GoGoMay** (gwbmahlclpysbqeqkhez)

### 步驟 2: 開啟 SQL Editor

1. 在左側選單點選 **SQL Editor**
2. 點選 **New query** 建立新的查詢

### 步驟 3: 執行 Part 1 - 基礎資料表

1. 開啟檔案：`supabase/migrations/20250207_create_subscription_system_part1.sql`
2. 複製整個檔案內容
3. 貼上到 SQL Editor
4. 點選 **Run** 執行

**預期結果：**
```
✅ 訂閱系統 Part 1 建立完成
📊 已建立資料表: subscription_plans, payments, member_subscriptions, daily_usage_quotas, subscription_notifications
📝 已插入初始訂閱計畫: free_trial, vip_monthly
🔄 已建立 updated_at 觸發器
```

### 步驟 4: 執行 Part 2 - 函數和 RLS 政策

1. 點選 **New query** 建立新的查詢
2. 開啟檔案：`supabase/migrations/20250207_create_subscription_system_part2.sql`
3. 複製整個檔案內容
4. 貼上到 SQL Editor
5. 點選 **Run** 執行

**預期結果：**
```
✅ 訂閱系統 Part 2 建立完成
🔧 已建立函數: create_trial_subscription, check_subscription_status, check_usage_quota, deduct_usage_quota, update_expired_subscriptions
🔒 已建立 RLS 政策
⚡ 已建立觸發器: trigger_create_trial_subscription
```

### 步驟 5: 執行 Part 3 - 系統設定和測試工具

1. 點選 **New query** 建立新的查詢
2. 開啟檔案：`supabase/migrations/20250207_create_subscription_system_part3.sql`
3. 複製整個檔案內容
4. 貼上到 SQL Editor
5. 點選 **Run** 執行

**預期結果：**
```
✅ 訂閱系統 Part 3 建立完成
⚙️  已新增系統設定到 system_config
🧪 已建立測試工具函數
```

### 步驟 6: 為現有會員建立試用訂閱

執行以下 SQL：

```sql
SELECT * FROM create_trial_for_existing_members();
```

**預期結果：** 應該看到所有現有會員的列表，每個會員都有新的訂閱記錄

### 步驟 7: 驗證資料表建立成功

執行以下 SQL：

```sql
-- 檢查資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'subscription_plans',
    'payments',
    'member_subscriptions',
    'daily_usage_quotas',
    'subscription_notifications'
  )
ORDER BY table_name;

-- 檢查訂閱計畫
SELECT * FROM subscription_plans;

-- 檢查會員訂閱狀態
SELECT 
  m.account,
  m.nickname,
  m.is_vip,
  ms.status,
  ms.subscription_type,
  ms.remaining_upload_quota,
  ms.remaining_query_quota
FROM members m
LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
WHERE m.status = 'approved'
LIMIT 10;
```

## ✅ 完成後

執行完所有 migration 後，請回到終端機執行測試腳本：

```bash
node scripts/test-subscription-phase1.js
```

這個腳本會自動測試所有功能並產生測試報告。

