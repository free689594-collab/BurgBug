# Phase 1 測試指引：資料庫基礎建設

## 📋 本階段完成內容

### ✅ 已建立的資料表
1. **subscription_plans** - 訂閱計畫表
2. **payments** - 付款記錄表
3. **member_subscriptions** - 會員訂閱記錄表
4. **daily_usage_quotas** - 每日使用額度表
5. **subscription_notifications** - 訂閱通知記錄表

### ✅ 已建立的函數
1. **create_trial_subscription()** - 自動為審核通過的會員建立試用訂閱
2. **check_subscription_status()** - 檢查會員訂閱狀態
3. **check_usage_quota()** - 檢查使用額度
4. **deduct_usage_quota()** - 扣除使用額度
5. **update_expired_subscriptions()** - 更新過期訂閱狀態

### ✅ 已建立的測試工具
1. **create_trial_for_existing_members()** - 為現有會員建立試用訂閱
2. **set_member_as_vip_test()** - 手動設定會員為 VIP（測試用）
3. **reset_member_quota_test()** - 重置會員額度（測試用）
4. **get_member_subscription_detail()** - 查看會員訂閱詳情

### ✅ 已建立的觸發器
1. **trigger_create_trial_subscription** - 會員審核通過時自動建立試用訂閱

### ✅ 已建立的 RLS 政策
- 所有資料表都已啟用 RLS
- 會員只能查看自己的資料
- 管理員可以查看所有資料

---

## 🚀 執行 Migration

### 步驟 1: 在 Supabase Dashboard 執行 Migration

1. 登入 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇專案：**GoGoMay**
3. 進入 **SQL Editor**
4. 依序執行以下三個檔案：

#### A. 執行 Part 1（基礎資料表）
```sql
-- 複製 supabase/migrations/20250207_create_subscription_system_part1.sql 的內容
-- 貼上並執行
```

**預期結果：**
- ✅ 建立 5 個新資料表
- ✅ 插入 2 筆訂閱計畫資料（免費試用、VIP 月費）
- ✅ 修改 members 表，新增 3 個欄位

#### B. 執行 Part 2（函數和 RLS）
```sql
-- 複製 supabase/migrations/20250207_create_subscription_system_part2.sql 的內容
-- 貼上並執行
```

**預期結果：**
- ✅ 建立 5 個核心函數
- ✅ 建立 1 個觸發器
- ✅ 啟用所有資料表的 RLS 政策

#### C. 執行 Part 3（系統設定和測試工具）
```sql
-- 複製 supabase/migrations/20250207_create_subscription_system_part3.sql 的內容
-- 貼上並執行
```

**預期結果：**
- ✅ 新增 11 筆系統設定到 system_config
- ✅ 建立 4 個測試工具函數

---

## 🧪 測試步驟

### 測試 1: 檢查資料表是否建立成功

```sql
-- 查看所有訂閱相關資料表
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
```

**預期結果：** 應該看到 5 個資料表


### 測試 2: 檢查訂閱計畫資料

```sql
-- 查看訂閱計畫
SELECT 
  plan_name,
  display_name,
  price,
  duration_days,
  upload_quota_total,
  query_quota_total,
  upload_quota_daily,
  query_quota_daily,
  is_active
FROM subscription_plans
ORDER BY price;
```

**預期結果：**
| plan_name | display_name | price | duration_days | upload_quota_total | query_quota_total | upload_quota_daily | query_quota_daily |
|-----------|--------------|-------|---------------|--------------------|--------------------|--------------------|--------------------|
| free_trial | 免費試用 | 0.00 | 30 | 10 | 10 | NULL | NULL |
| vip_monthly | VIP 月費會員 | 1500.00 | 30 | NULL | NULL | 20 | 30 |


### 測試 3: 為現有會員建立試用訂閱

```sql
-- 為所有現有已審核會員建立試用訂閱
SELECT * FROM create_trial_for_existing_members();
```

**預期結果：**
- 應該看到所有現有會員的列表
- 每個會員都有一個新的 subscription_id
- end_date 應該是 30 天後


### 測試 4: 檢查會員訂閱狀態

```sql
-- 查看所有會員的訂閱狀態
SELECT 
  m.account,
  m.nickname,
  m.is_vip,
  ms.status,
  ms.subscription_type,
  ms.start_date,
  ms.end_date,
  ms.remaining_upload_quota,
  ms.remaining_query_quota
FROM members m
LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
WHERE m.status = 'approved'
ORDER BY m.created_at;
```

**預期結果：**
- 所有會員都應該有訂閱記錄
- status 應該是 'trial'
- subscription_type 應該是 'free_trial'
- remaining_upload_quota 和 remaining_query_quota 都應該是 10


### 測試 5: 測試訂閱狀態檢查函數

```sql
-- 替換成你的測試帳號 user_id
SELECT * FROM check_subscription_status('YOUR_USER_ID_HERE');
```

**預期結果：**
```
is_active: true
subscription_type: free_trial
status: trial
days_remaining: 30 (或接近 30)
is_expired: false
is_vip: false
```


### 測試 6: 測試額度檢查函數

```sql
-- 檢查上傳額度（替換成你的 user_id）
SELECT * FROM check_usage_quota('YOUR_USER_ID_HERE', 'upload');

-- 檢查查詢額度
SELECT * FROM check_usage_quota('YOUR_USER_ID_HERE', 'query');
```

**預期結果：**
```
has_quota: true
remaining: 10
limit_value: 10
quota_type: total
subscription_type: free_trial
```


### 測試 7: 手動設定測試帳號為 VIP

```sql
-- 將某個測試帳號設定為 VIP（30 天）
SELECT * FROM set_member_as_vip_test('YOUR_USER_ID_HERE', 30);
```

**預期結果：**
```
success: true
message: 成功設定為 VIP（30 天）
subscription_id: [新的訂閱 ID]
end_date: [30 天後的日期]
```

**驗證 VIP 狀態：**
```sql
-- 查看該會員的訂閱詳情
SELECT * FROM get_member_subscription_detail('YOUR_USER_ID_HERE');
```

**預期結果：**
```
plan_name: vip_monthly
status: active
subscription_type: paid
is_vip: true
quota_type: daily
upload_limit: 20
query_limit: 30
upload_remaining: 20
query_remaining: 30
```


### 測試 8: 測試額度扣除

```sql
-- 扣除一次上傳額度
SELECT deduct_usage_quota('YOUR_USER_ID_HERE', 'upload');

-- 再次檢查額度
SELECT * FROM check_usage_quota('YOUR_USER_ID_HERE', 'upload');
```

**免費會員預期結果：**
```
remaining: 9 (從 10 變成 9)
```

**VIP 會員預期結果：**
```
remaining: 19 (從 20 變成 19)
```


### 測試 9: 重置額度（測試用）

```sql
-- 重置額度
SELECT * FROM reset_member_quota_test('YOUR_USER_ID_HERE');

-- 驗證額度已重置
SELECT * FROM check_usage_quota('YOUR_USER_ID_HERE', 'upload');
```

**預期結果：** 額度應該恢復到原始值


### 測試 10: 檢查系統設定

```sql
-- 查看訂閱相關系統設定
SELECT 
  config_key,
  config_value,
  description,
  value_type,
  category
FROM system_config
WHERE category IN ('subscription', 'payment')
ORDER BY category, config_key;
```

**預期結果：** 應該看到 11 筆設定


---

## ✅ 測試檢查清單

完成以下所有測試後，請在每項前打勾：

- [ ] 所有 3 個 migration 檔案都成功執行，沒有錯誤
- [ ] 5 個新資料表都已建立
- [ ] 2 筆訂閱計畫資料已插入
- [ ] 所有現有會員都已自動獲得 30 天試用訂閱
- [ ] 可以成功查詢會員的訂閱狀態
- [ ] 可以成功檢查會員的使用額度
- [ ] 可以成功扣除使用額度
- [ ] 可以手動設定測試帳號為 VIP
- [ ] VIP 會員的每日額度正常運作
- [ ] 可以重置會員額度（測試用）
- [ ] 系統設定已正確新增

---

## 🐛 常見問題排查

### 問題 1: Migration 執行失敗

**可能原因：**
- system_config 表不存在或結構不同
- members 表缺少某些欄位

**解決方法：**
```sql
-- 檢查 system_config 表結構
\d system_config

-- 如果缺少 category 欄位，執行：
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS category VARCHAR(50);
```

### 問題 2: 現有會員沒有自動獲得訂閱

**解決方法：**
```sql
-- 手動執行建立試用訂閱函數
SELECT * FROM create_trial_for_existing_members();
```

### 問題 3: 觸發器沒有自動執行

**檢查方法：**
```sql
-- 查看觸發器是否存在
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_trial_subscription';
```

### 問題 4: RLS 政策導致無法查詢

**臨時解決方法（僅測試用）：**
```sql
-- 暫時停用 RLS（測試完記得重新啟用）
ALTER TABLE member_subscriptions DISABLE ROW LEVEL SECURITY;

-- 測試完成後重新啟用
ALTER TABLE member_subscriptions ENABLE ROW LEVEL SECURITY;
```

---

## 📝 測試完成後

請回報以下資訊：

1. **所有測試是否通過？** ✅ / ❌
2. **遇到的問題：** （如果有）
3. **現有會員數量：** 
4. **成功建立訂閱的會員數量：**
5. **測試 VIP 帳號是否正常：** ✅ / ❌

**確認無誤後，我們將進入 Phase 2：後端 API 開發**

---

## 🔧 測試用 SQL 快速參考

```sql
-- 查看我的訂閱詳情（替換 user_id）
SELECT * FROM get_member_subscription_detail('YOUR_USER_ID');

-- 設定為 VIP（30 天）
SELECT * FROM set_member_as_vip_test('YOUR_USER_ID', 30);

-- 重置額度
SELECT * FROM reset_member_quota_test('YOUR_USER_ID');

-- 檢查額度
SELECT * FROM check_usage_quota('YOUR_USER_ID', 'upload');
SELECT * FROM check_usage_quota('YOUR_USER_ID', 'query');

-- 扣除額度
SELECT deduct_usage_quota('YOUR_USER_ID', 'upload');
SELECT deduct_usage_quota('YOUR_USER_ID', 'query');

-- 查看所有會員訂閱狀態
SELECT 
  m.account,
  m.nickname,
  m.is_vip,
  ms.status,
  ms.subscription_type,
  EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER as days_remaining
FROM members m
LEFT JOIN member_subscriptions ms ON m.current_subscription_id = ms.id
WHERE m.status = 'approved';
```

