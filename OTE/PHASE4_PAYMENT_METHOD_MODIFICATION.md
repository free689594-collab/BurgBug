# Phase 4: 付款方式修改 - ATM/超商支付

## 📅 修改時間
2025-11-08

## 🎯 修改目標
將付款方式從信用卡改為 ATM 虛擬帳號、網路 ATM、超商條碼、超商代碼，以符合實際可用的綠界金流服務。

---

## ✅ 完成的修改

### 1. 資料庫結構修改（100%）

#### 檔案：`supabase/migrations/20251108_add_payment_method_fields.sql`

**新增欄位到 payments 表**：
- `payment_method` VARCHAR(20) - 付款方式（atm, webatm, barcode, cvs）
- `bank_code` VARCHAR(10) - ATM 銀行代碼
- `virtual_account` VARCHAR(20) - ATM 虛擬帳號
- `barcode_1` VARCHAR(20) - 超商條碼第一段
- `barcode_2` VARCHAR(20) - 超商條碼第二段
- `barcode_3` VARCHAR(20) - 超商條碼第三段
- `payment_no` VARCHAR(20) - 超商代碼繳費編號
- `payment_deadline` TIMESTAMPTZ - 繳費期限
- `payment_url` TEXT - 網路 ATM 付款網址

**新增索引**：
- `idx_payments_payment_method`
- `idx_payments_payment_deadline`

**新增約束條件**：
- `chk_payment_method` - 驗證付款方式值

---

### 2. 綠界工具函數修改（100%）

#### 檔案：`src/lib/ecpay.ts`

**新增類型定義**：
```typescript
export type PaymentMethod = 'atm' | 'webatm' | 'barcode' | 'cvs' | 'credit'

export const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  atm: 'ATM',           // ATM 虛擬帳號
  webatm: 'WebATM',     // 網路 ATM
  barcode: 'BARCODE',   // 超商條碼
  cvs: 'CVS',           // 超商代碼
  credit: 'Credit',     // 信用卡（保留但不使用）
}

export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  atm: 'ATM 虛擬帳號',
  webatm: '網路 ATM',
  barcode: '超商條碼',
  cvs: '超商代碼',
  credit: '信用卡',
}
```

**修改 ECPayCallbackParams 介面**：
```typescript
export interface ECPayCallbackParams {
  // ... 原有欄位
  
  // ATM 虛擬帳號相關
  BankCode?: string               // 銀行代碼
  vAccount?: string               // 虛擬帳號
  ExpireDate?: string             // 繳費期限
  
  // 超商條碼相關
  Barcode1?: string               // 第一段條碼
  Barcode2?: string               // 第二段條碼
  Barcode3?: string               // 第三段條碼
  
  // 超商代碼相關
  PaymentNo?: string              // 繳費代碼
}
```

**修改 createPaymentFormData 函數**：
- 新增 `paymentMethod` 參數
- 根據付款方式設定 `ChoosePayment`
- ATM/超商付款設定 `NeedExtraPaidInfo: 'Y'`

**修改 parsePaymentCallback 函數**：
- 新增 `isPending` 回傳值
- 處理 RtnCode=2（ATM 取號成功）
- 處理 RtnCode=10100073（超商取號成功）

---

### 3. 建立付款訂單 API 修改（100%）

#### 檔案：`src/app/api/subscription/payment/create/route.ts`

**修改請求介面**：
```typescript
interface CreatePaymentRequest {
  plan_type: 'vip_monthly'        // 目前只支援 VIP 月費
  payment_method: PaymentMethod   // 付款方式：atm, webatm, barcode, cvs
}
```

**新增付款方式驗證**：
```typescript
const validPaymentMethods: PaymentMethod[] = ['atm', 'webatm', 'barcode', 'cvs']
if (!payment_method || !validPaymentMethods.includes(payment_method)) {
  return NextResponse.json(
    errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的付款方式'),
    { status: 400 }
  )
}
```

**儲存付款方式到資料庫**：
```typescript
const { data: payment, error: paymentError } = await supabaseAdmin
  .from('payments')
  .insert({
    user_id: user.id,
    plan_id: plan.id,
    amount: plan.price,
    status: 'pending',
    payment_method: payment_method,  // 儲存付款方式
  })
```

**傳遞付款方式給綠界**：
```typescript
const formData = createPaymentFormData(
  { ... },
  {
    amount: plan.price,
    itemName: plan.name,
    tradeDesc: `臻好尋 - ${plan.name}`,
    returnURL: `${baseURL}/api/subscription/payment/callback`,
    paymentMethod: payment_method,  // 傳遞付款方式
    clientBackURL: `${baseURL}/subscription`,
    orderResultURL: `${baseURL}/subscription/payment/result`,
  }
)
```

---

### 4. 付款回調 API 修改（100%）

#### 檔案：`src/app/api/subscription/payment/callback/route.ts`

**處理不同付款狀態**：
```typescript
// 根據回調狀態更新付款狀態
if (result.isSuccess) {
  // 付款成功
  updateData.status = 'completed'
  updateData.paid_at = new Date().toISOString()
} else if (result.isPending) {
  // ATM/超商取號成功（待繳費）
  updateData.status = 'pending'
  
  // 儲存 ATM 虛擬帳號資訊
  if (callbackData.BankCode && callbackData.vAccount) {
    updateData.bank_code = callbackData.BankCode
    updateData.virtual_account = callbackData.vAccount
    updateData.payment_deadline = callbackData.ExpireDate
  }
  
  // 儲存超商條碼資訊
  if (callbackData.Barcode1 && callbackData.Barcode2 && callbackData.Barcode3) {
    updateData.barcode_1 = callbackData.Barcode1
    updateData.barcode_2 = callbackData.Barcode2
    updateData.barcode_3 = callbackData.Barcode3
    updateData.payment_deadline = callbackData.ExpireDate
  }
  
  // 儲存超商代碼資訊
  if (callbackData.PaymentNo) {
    updateData.payment_no = callbackData.PaymentNo
    updateData.payment_deadline = callbackData.ExpireDate
  }
} else {
  // 付款失敗
  updateData.status = 'failed'
}
```

---

### 5. 續費頁面修改（100%）

#### 檔案：`src/app/subscription/renew/page.tsx`

**新增付款方式狀態**：
```typescript
type PaymentMethod = 'atm' | 'webatm' | 'barcode' | 'cvs'

const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('atm')
```

**修改 handleRenew 函數**：
```typescript
body: JSON.stringify({
  plan_type: 'vip_monthly',
  payment_method: selectedPaymentMethod, // 付款方式
}),
```

**新增付款方式選擇 UI**：
- ATM 虛擬帳號（取得虛擬帳號後轉帳）
- 網路 ATM（線上即時付款）
- 超商條碼（列印條碼到超商繳費）
- 超商代碼（取得代碼到超商繳費）

**UI 特點**：
- 2x2 網格佈局
- 選中狀態高亮顯示（黃色邊框 + 背景）
- 每個選項顯示名稱和說明
- 響應式設計

---

## 📊 修改統計

### 修改檔案（5 個）
| 檔案 | 修改類型 | 修改行數 |
|------|----------|----------|
| `supabase/migrations/20251108_add_payment_method_fields.sql` | 新增 | 40 行 |
| `src/lib/ecpay.ts` | 修改 | +60 行 |
| `src/app/api/subscription/payment/create/route.ts` | 修改 | +12 行 |
| `src/app/api/subscription/payment/callback/route.ts` | 修改 | +29 行 |
| `src/app/subscription/renew/page.tsx` | 修改 | +67 行 |

### 總計
- **新增程式碼**: 40 行（migration）
- **修改程式碼**: 168 行
- **修改檔案**: 5 個

---

## 🔧 付款方式說明

### 1. ATM 虛擬帳號（ChoosePayment: 'ATM'）

**流程**：
1. 使用者選擇 ATM 虛擬帳號
2. 綠界產生虛擬帳號（第一次回調，RtnCode=2）
3. 系統儲存虛擬帳號資訊
4. 使用者到 ATM 轉帳（1-3 天內）
5. 轉帳完成後綠界回調（第二次回調，RtnCode=1）
6. 系統啟用 VIP 訂閱

**回調資料**：
- `BankCode`: 銀行代碼（例如：013 國泰世華）
- `vAccount`: 虛擬帳號
- `ExpireDate`: 繳費期限

---

### 2. 網路 ATM（ChoosePayment: 'WebATM'）

**流程**：
1. 使用者選擇網路 ATM
2. 跳轉到綠界網路 ATM 頁面
3. 使用者插入晶片卡完成付款
4. 付款完成後綠界回調（RtnCode=1）
5. 系統啟用 VIP 訂閱

**特點**：
- 即時付款（類似信用卡）
- 需要讀卡機
- 只有一次回調

---

### 3. 超商條碼（ChoosePayment: 'BARCODE'）

**流程**：
1. 使用者選擇超商條碼
2. 綠界產生三段條碼（第一次回調，RtnCode=10100073）
3. 系統儲存條碼資訊
4. 使用者列印條碼到超商繳費（1-3 天內）
5. 繳費完成後綠界回調（第二次回調，RtnCode=1）
6. 系統啟用 VIP 訂閱

**回調資料**：
- `Barcode1`: 第一段條碼
- `Barcode2`: 第二段條碼
- `Barcode3`: 第三段條碼
- `ExpireDate`: 繳費期限

**適用超商**：
- 7-11
- 全家
- 萊爾富
- OK 超商

---

### 4. 超商代碼（ChoosePayment: 'CVS'）

**流程**：
1. 使用者選擇超商代碼
2. 綠界產生繳費代碼（第一次回調，RtnCode=10100073）
3. 系統儲存繳費代碼
4. 使用者到超商報繳費代碼繳費（1-3 天內）
5. 繳費完成後綠界回調（第二次回調，RtnCode=1）
6. 系統啟用 VIP 訂閱

**回調資料**：
- `PaymentNo`: 繳費代碼
- `ExpireDate`: 繳費期限

**適用超商**：
- 7-11（ibon）
- 全家（FamiPort）
- 萊爾富（Life-ET）

---

## 🧪 測試流程

### 1. 執行資料庫 Migration

在 Supabase SQL Editor 執行：
```sql
-- 執行 migration
\i supabase/migrations/20251108_add_payment_method_fields.sql
```

或使用 Supabase CLI：
```bash
supabase db push
```

### 2. 驗證資料庫結構

```sql
-- 檢查新增的欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name IN (
  'payment_method', 'bank_code', 'virtual_account',
  'barcode_1', 'barcode_2', 'barcode_3',
  'payment_no', 'payment_deadline', 'payment_url'
);
```

### 3. 測試付款流程

#### 測試 ATM 虛擬帳號
1. 登入會員帳號
2. 前往「訂閱管理」→「立即續費」
3. 選擇「ATM 虛擬帳號」
4. 點擊「立即訂閱」
5. 跳轉到綠界頁面
6. 取得虛擬帳號資訊
7. 確認資料庫儲存虛擬帳號

#### 測試網路 ATM
1. 選擇「網路 ATM」
2. 點擊「立即訂閱」
3. 跳轉到綠界網路 ATM 頁面
4. 使用測試環境完成付款
5. 確認訂閱狀態更新

#### 測試超商條碼
1. 選擇「超商條碼」
2. 點擊「立即訂閱」
3. 跳轉到綠界頁面
4. 取得三段條碼
5. 確認資料庫儲存條碼資訊

#### 測試超商代碼
1. 選擇「超商代碼」
2. 點擊「立即訂閱」
3. 跳轉到綠界頁面
4. 取得繳費代碼
5. 確認資料庫儲存繳費代碼

---

## ⚠️ 注意事項

### 1. 回調處理
- ATM 和超商付款有 **兩次回調**
- 第一次：取號成功（RtnCode=2 或 10100073）
- 第二次：繳費完成（RtnCode=1）
- 必須正確處理兩次回調

### 2. 繳費期限
- ATM 虛擬帳號：通常 3 天
- 超商條碼：通常 3 天
- 超商代碼：通常 3 天
- 過期後需要重新產生

### 3. 訂閱啟用時機
- 網路 ATM：立即啟用（即時付款）
- ATM 虛擬帳號：繳費完成後啟用
- 超商條碼：繳費完成後啟用
- 超商代碼：繳費完成後啟用

### 4. 使用者體驗
- 非即時付款需要等待 1-3 天
- 需要顯示繳費資訊（虛擬帳號/條碼/代碼）
- 需要提示繳費期限
- 需要提供繳費說明

---

## 🚀 下一步

### 待完成項目

1. **修改付款結果頁面**（`src/app/subscription/payment/result/page.tsx`）
   - 顯示 ATM 虛擬帳號資訊
   - 顯示超商條碼資訊
   - 顯示超商代碼資訊
   - 顯示繳費期限
   - 提供繳費說明

2. **新增付款記錄查詢頁面**
   - 查看付款狀態
   - 查看繳費資訊
   - 重新顯示虛擬帳號/條碼/代碼

3. **測試和除錯**
   - 測試所有付款方式
   - 驗證回調處理
   - 確認訂閱啟用

4. **部署到生產環境**
   - 執行 migration
   - 設定綠界正式環境
   - 監控付款流程

---

## ✅ 修改完成確認

**完成度**: 90% ✅

**已完成**:
- ✅ 資料庫結構修改
- ✅ 綠界工具函數修改
- ✅ 建立付款訂單 API 修改
- ✅ 付款回調 API 修改
- ✅ 續費頁面 UI 修改

**待完成**:
- ⏳ 付款結果頁面修改（顯示繳費資訊）
- ⏳ 完整測試（所有付款方式）
- ⏳ 部署到生產環境

**準備好進行測試**: ✅ 是

---

## 🎉 總結

已成功將付款方式從信用卡改為 ATM 虛擬帳號、網路 ATM、超商條碼、超商代碼！

**主要成果**:
- ✅ 支援 4 種付款方式
- ✅ 處理即時和非即時付款
- ✅ 儲存繳費資訊
- ✅ 優雅的 UI 設計

**技術亮點**:
- ✅ 完整的 TypeScript 類型定義
- ✅ 處理兩次回調機制
- ✅ 資料庫欄位擴充
- ✅ 使用者友善的付款方式選擇

**下一步**: 執行資料庫 migration 並進行完整測試！🚀

