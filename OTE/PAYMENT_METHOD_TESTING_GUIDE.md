# 付款方式測試指南

## 🎯 測試目標
驗證 ATM 虛擬帳號、網路 ATM、超商條碼、超商代碼四種付款方式是否正常運作。

---

## 📋 測試前準備

### 1. 執行資料庫 Migration

#### 方法 1：使用 Supabase Dashboard（推薦）

1. 登入 Supabase Dashboard
2. 前往「SQL Editor」
3. 複製 `supabase/migrations/20251108_add_payment_method_fields.sql` 的內容
4. 貼上並執行

#### 方法 2：使用 Supabase CLI

```bash
# 確保已安裝 Supabase CLI
supabase db push
```

### 2. 驗證資料庫結構

在 Supabase SQL Editor 執行：

```sql
-- 檢查新增的欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN (
  'payment_method', 'bank_code', 'virtual_account',
  'barcode_1', 'barcode_2', 'barcode_3',
  'payment_no', 'payment_deadline', 'payment_url'
)
ORDER BY column_name;
```

預期結果：應該看到 9 個新欄位。

### 3. 確認綠界設定

在 Supabase SQL Editor 執行：

```sql
SELECT 
  ecpay_merchant_id,
  ecpay_test_mode
FROM subscription_config
WHERE id = 1;
```

確認：
- `ecpay_merchant_id` 有值
- `ecpay_test_mode` 為 `true`（測試環境）

### 4. 啟動開發伺服器

```bash
npm run dev
```

---

## 🧪 測試流程

### 測試 1：ATM 虛擬帳號

#### 步驟 1：選擇付款方式
1. 登入會員帳號（例如：`a689594`）
2. 前往「訂閱管理」→「立即續費」
3. 選擇「ATM 虛擬帳號」付款方式
4. 確認選中狀態（黃色邊框 + 背景）

#### 步驟 2：發起付款
1. 點擊「立即訂閱」按鈕
2. 確認按鈕顯示「處理中...」
3. 等待跳轉到綠界頁面

#### 步驟 3：取得虛擬帳號
1. 在綠界測試環境頁面
2. 確認顯示虛擬帳號資訊：
   - 銀行代碼（例如：013）
   - 虛擬帳號（例如：9103522175887271）
   - 繳費期限（例如：2025/11/11 23:59:59）

#### 步驟 4：驗證資料庫
在 Supabase SQL Editor 執行：

```sql
SELECT 
  id,
  payment_method,
  bank_code,
  virtual_account,
  payment_deadline,
  status,
  ecpay_rtn_code
FROM payments
ORDER BY created_at DESC
LIMIT 1;
```

預期結果：
- `payment_method`: `atm`
- `bank_code`: 有值（例如：`013`）
- `virtual_account`: 有值
- `payment_deadline`: 有值
- `status`: `pending`
- `ecpay_rtn_code`: `2`（ATM 取號成功）

#### 步驟 5：模擬繳費完成（測試環境）
在綠界測試環境中，可能有「模擬付款」按鈕，點擊後：

1. 綠界會發送第二次回調（RtnCode=1）
2. 系統更新付款狀態為 `completed`
3. 系統啟用 VIP 訂閱

驗證：
```sql
SELECT 
  status,
  paid_at,
  ecpay_rtn_code
FROM payments
WHERE payment_method = 'atm'
ORDER BY created_at DESC
LIMIT 1;
```

預期結果：
- `status`: `completed`
- `paid_at`: 有值
- `ecpay_rtn_code`: `1`

---

### 測試 2：網路 ATM

#### 步驟 1：選擇付款方式
1. 前往「訂閱管理」→「立即續費」
2. 選擇「網路 ATM」付款方式

#### 步驟 2：發起付款
1. 點擊「立即訂閱」按鈕
2. 跳轉到綠界網路 ATM 頁面

#### 步驟 3：完成付款
1. 在綠界測試環境中完成付款
2. 付款完成後應導向 `/subscription/payment/result`
3. 等待 5 秒自動導向 `/subscription`

#### 步驟 4：驗證訂閱狀態
1. 確認導覽列顯示「V.I.P」標籤
2. 確認訂閱管理頁面顯示 VIP 會員資訊

驗證資料庫：
```sql
SELECT 
  payment_method,
  status,
  paid_at,
  ecpay_rtn_code
FROM payments
WHERE payment_method = 'webatm'
ORDER BY created_at DESC
LIMIT 1;
```

預期結果：
- `payment_method`: `webatm`
- `status`: `completed`
- `paid_at`: 有值
- `ecpay_rtn_code`: `1`

---

### 測試 3：超商條碼

#### 步驟 1：選擇付款方式
1. 前往「訂閱管理」→「立即續費」
2. 選擇「超商條碼」付款方式

#### 步驟 2：發起付款
1. 點擊「立即訂閱」按鈕
2. 跳轉到綠界頁面

#### 步驟 3：取得條碼
1. 在綠界測試環境頁面
2. 確認顯示三段條碼：
   - 第一段條碼
   - 第二段條碼
   - 第三段條碼
   - 繳費期限

#### 步驟 4：驗證資料庫
```sql
SELECT 
  payment_method,
  barcode_1,
  barcode_2,
  barcode_3,
  payment_deadline,
  status,
  ecpay_rtn_code
FROM payments
WHERE payment_method = 'barcode'
ORDER BY created_at DESC
LIMIT 1;
```

預期結果：
- `payment_method`: `barcode`
- `barcode_1`: 有值
- `barcode_2`: 有值
- `barcode_3`: 有值
- `payment_deadline`: 有值
- `status`: `pending`
- `ecpay_rtn_code`: `10100073`（超商取號成功）

---

### 測試 4：超商代碼

#### 步驟 1：選擇付款方式
1. 前往「訂閱管理」→「立即續費」
2. 選擇「超商代碼」付款方式

#### 步驟 2：發起付款
1. 點擊「立即訂閱」按鈕
2. 跳轉到綠界頁面

#### 步驟 3：取得繳費代碼
1. 在綠界測試環境頁面
2. 確認顯示繳費代碼
3. 確認顯示繳費期限

#### 步驟 4：驗證資料庫
```sql
SELECT 
  payment_method,
  payment_no,
  payment_deadline,
  status,
  ecpay_rtn_code
FROM payments
WHERE payment_method = 'cvs'
ORDER BY created_at DESC
LIMIT 1;
```

預期結果：
- `payment_method`: `cvs`
- `payment_no`: 有值
- `payment_deadline`: 有值
- `status`: `pending`
- `ecpay_rtn_code`: `10100073`（超商取號成功）

---

## 🔍 除錯指南

### 問題 1：無法跳轉到綠界頁面

**可能原因**：
- 綠界設定未正確設定
- NEXT_PUBLIC_BASE_URL 未設定
- 付款方式參數錯誤

**解決方法**：
1. 檢查 subscription_config 表的綠界設定
2. 檢查 .env.local 的 NEXT_PUBLIC_BASE_URL
3. 檢查瀏覽器 Console 的錯誤訊息
4. 檢查 Network 面板的 API 請求

### 問題 2：資料庫未儲存繳費資訊

**可能原因**：
- Migration 未執行
- 回調處理失敗
- 檢查碼驗證失敗

**解決方法**：
1. 確認 migration 已執行
2. 檢查 payments 表結構
3. 檢查 API 日誌（瀏覽器 Console）
4. 檢查綠界回調參數

### 問題 3：付款完成後訂閱未啟用

**可能原因**：
- 第二次回調未收到
- 訂閱更新失敗
- RLS 權限問題

**解決方法**：
1. 檢查 payments 表的 status 和 ecpay_rtn_code
2. 檢查 member_subscriptions 表
3. 檢查 API 日誌
4. 手動觸發訂閱更新

---

## 📊 測試檢查清單

### 資料庫檢查
- [ ] Migration 已執行
- [ ] 新欄位已建立
- [ ] 索引已建立
- [ ] 約束條件已建立

### 付款方式測試
- [ ] ATM 虛擬帳號：取號成功
- [ ] ATM 虛擬帳號：資料庫儲存正確
- [ ] 網路 ATM：付款成功
- [ ] 網路 ATM：訂閱啟用
- [ ] 超商條碼：取號成功
- [ ] 超商條碼：資料庫儲存正確
- [ ] 超商代碼：取號成功
- [ ] 超商代碼：資料庫儲存正確

### 回調處理測試
- [ ] 第一次回調：取號成功（RtnCode=2 或 10100073）
- [ ] 第一次回調：繳費資訊儲存
- [ ] 第二次回調：付款成功（RtnCode=1）
- [ ] 第二次回調：訂閱啟用

### UI/UX 測試
- [ ] 付款方式選擇 UI 正常
- [ ] 選中狀態顯示正確
- [ ] 處理中狀態顯示正確
- [ ] 錯誤訊息顯示正確

---

## 🎉 測試完成

如果所有測試項目都通過，恭喜你！付款方式修改已經成功完成！

**下一步**：
1. 修改付款結果頁面（顯示繳費資訊）
2. 新增付款記錄查詢頁面
3. 準備部署到生產環境

**注意事項**：
- 測試環境不會實際扣款
- 正式環境需要申請正式商店代號
- 正式環境會實際扣款
- 建議先在測試環境充分測試後再上線

祝測試順利！🚀

