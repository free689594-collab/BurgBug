# Phase 6 Migration 執行指南

## 🎯 目標
在 Supabase 資料庫中執行 Phase 6 所需的 migrations，讓訂閱管理功能正常運作。

---

## 📋 需要執行的 Migrations

### Migration 1：新增 subscription_id 欄位
**檔案**：`supabase/migrations/20251108_add_subscription_id_to_payments.sql`

### Migration 2：建立訂閱管理函數
**檔案**：`supabase/migrations/20251108_create_subscription_management_v2.sql`

---

## 🚀 執行步驟

### 步驟 1：前往 Supabase Dashboard

1. 開啟瀏覽器，前往：https://supabase.com/dashboard
2. 登入你的帳號
3. 選擇專案：**GoGoMay** (gwbmahlclpysbqeqkhez)

### 步驟 2：開啟 SQL Editor

1. 在左側選單點擊 **SQL Editor**
2. 點擊 **New query** 建立新的查詢

### 步驟 3：執行 Migration 1

1. 複製以下 SQL 程式碼：

```sql
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
```

2. 貼到 SQL Editor
3. 點擊 **Run** 執行
4. 確認執行成功（應該顯示 "Success. No rows returned"）

### 步驟 4：執行 Migration 2

1. 點擊 **New query** 建立新的查詢
2. 開啟檔案：`supabase/migrations/20251108_create_subscription_management_v2.sql`
3. 複製整個檔案的內容
4. 貼到 SQL Editor
5. 點擊 **Run** 執行
6. 確認執行成功

---

## ✅ 驗證 Migrations

### 驗證 subscription_id 欄位

在 SQL Editor 執行：

```sql
-- 檢查 payments 表的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'payments'
AND column_name = 'subscription_id';
```

**預期結果**：
```
column_name      | data_type | is_nullable
-----------------|-----------|------------
subscription_id  | uuid      | YES
```

### 驗證資料庫函數

在 SQL Editor 執行：

```sql
-- 列出所有訂閱管理相關的函數
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%subscription%'
OR routine_name LIKE '%payment%'
ORDER BY routine_name;
```

**預期結果**：應該看到以下函數
- `admin_count_payment_records`
- `admin_extend_subscription`
- `admin_get_expiring_subscriptions`
- `admin_get_payment_records`
- `admin_update_subscription_status`
- `get_payment_history`
- `get_subscription_history`

---

## 🧪 測試 Migrations

### 測試 1：測試 get_subscription_history

```sql
-- 測試查詢訂閱歷史（使用測試 UUID）
SELECT * FROM get_subscription_history('00000000-0000-0000-0000-000000000000');
```

**預期結果**：
- 不應該有錯誤
- 可能返回空結果（如果沒有資料）

### 測試 2：測試 get_payment_history

```sql
-- 測試查詢付款歷史（使用測試 UUID）
SELECT * FROM get_payment_history('00000000-0000-0000-0000-000000000000');
```

**預期結果**：
- 不應該有錯誤
- 可能返回空結果（如果沒有資料）

### 測試 3：測試 admin_get_expiring_subscriptions

```sql
-- 測試查詢即將到期訂閱
SELECT * FROM admin_get_expiring_subscriptions(7, 10, 0);
```

**預期結果**：
- 不應該有錯誤
- 可能返回空結果（如果沒有即將到期的訂閱）

### 測試 4：測試 admin_get_payment_records

```sql
-- 測試查詢付款記錄
SELECT * FROM admin_get_payment_records(
  NULL,  -- payment_status
  NULL,  -- payment_method
  NULL,  -- account
  NULL,  -- start_date
  NULL,  -- end_date
  10,    -- limit
  0      -- offset
);
```

**預期結果**：
- 不應該有錯誤
- 可能返回空結果（如果沒有付款記錄）

---

## 🎉 完成確認

如果所有測試都沒有錯誤，表示 migrations 執行成功！

### 下一步

1. **執行自動化測試**：
   ```bash
   node scripts/test-phase6-apis.js
   ```
   
   預期結果：所有 22 個測試都應該通過

2. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

3. **測試前端功能**：
   - 會員端：http://localhost:3000/subscription
   - 管理員端：http://localhost:3000/admin/subscription-management

---

## ⚠️ 常見問題

### Q1：執行 Migration 時出現 "permission denied" 錯誤

**解決方案**：
- 確認你使用的是專案擁有者帳號
- 或確認你的帳號有足夠的權限執行 DDL 語句

### Q2：函數已存在的錯誤

**解決方案**：
- 這是正常的，因為使用了 `CREATE OR REPLACE FUNCTION`
- 函數會被更新為新版本

### Q3：測試時返回空結果

**解決方案**：
- 這是正常的，因為資料庫中可能還沒有訂閱或付款資料
- 可以手動新增測試資料，或等待實際使用時產生資料

---

## 📝 備註

### 關於 subscription_id 欄位
- 這個欄位用於關聯付款記錄和訂閱記錄
- 是 Phase 6 功能的核心欄位
- 執行 migration 後，未來建立的付款記錄都應該包含這個欄位

### 關於資料庫函數
- 所有函數都使用 `SECURITY DEFINER`，表示以函數擁有者的權限執行
- 這樣可以讓一般使用者也能查詢跨表的資料
- 管理員函數會在 API 層進行權限驗證

---

## 🔗 相關文檔

- [Phase 6 完成報告](./PHASE6_COMPLETION_REPORT.md)
- [Phase 6 測試報告](./PHASE6_TEST_REPORT.md)
- [Supabase SQL Editor 文檔](https://supabase.com/docs/guides/database/overview)

---

## ✅ 檢查清單

執行完成後，請確認：

- [ ] Migration 1 執行成功（subscription_id 欄位已新增）
- [ ] Migration 2 執行成功（7 個函數已建立）
- [ ] 驗證測試都沒有錯誤
- [ ] 自動化測試腳本通過（22/22）
- [ ] 前端頁面可以正常載入

完成以上檢查後，Phase 6 就完全部署完成了！🎉

