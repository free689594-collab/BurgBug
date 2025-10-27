# 平台功能完整分析報告

**生成日期**：2025-10-26  
**目的**：重新深入了解平台功能，確保壓力測試腳本的正確性

---

## 📋 **第一階段：深入了解網站功能**

### **1.1 會員功能區域** ✅

#### **會員註冊 API** (`POST /api/auth/register`)

**必填欄位**：
1. ✅ `account`（帳號）- 5-15 字元，僅允許英文字母和數字
2. ✅ `password`（密碼）- 至少 8 字元，包含大小寫字母和數字
3. ✅ `nickname`（暱稱）- 會員暱稱
4. ✅ `businessType`（業務類型）- 當鋪、融資公司、代書、資產管理公司
5. ✅ `businessRegion`（業務區域）- 北北基宜、桃竹苗、中彰投、雲嘉南、高屏澎、花東

**選填欄位**：
- `phone`（電話）- 格式：09XXXXXXXX

**驗證規則**：
- 帳號格式：`/^[A-Za-z0-9]{5,15}$/`
- 密碼強度：至少 8 字元 + 大寫字母 + 小寫字母 + 數字
- 電話格式：`/^09\d{8}$/`（選填）
- 業務區域約束：必須是 6 個指定區域之一

**註冊流程**：
1. 檢查註冊節流（每小時最多 3 次）
2. 驗證人機驗證（reCAPTCHA）
3. 驗證必填欄位和格式
4. 檢查帳號是否已存在
5. 建立 Supabase Auth 使用者（email 格式：`${account}@auth.local`）
6. 建立 members 表記錄（狀態：`pending`）
7. 建立 user_roles 表記錄（角色：`user`）
8. 返回成功回應

---

#### **會員登入 API** (`POST /api/auth/login`)

**必填欄位**：
1. ✅ `account`（帳號）
2. ✅ `password`（密碼）

**登入流程**：
1. 驗證帳號密碼格式
2. 轉換帳號為 email 格式
3. 使用 Supabase Auth 登入
4. 檢查會員狀態（必須是 `approved`）
5. 生成裝置指紋
6. 檢查單裝置控制（UPSERT `active_sessions` 表）
7. 更新最後登入時間
8. 檢查每日登入積分（呼叫 `/api/activity/add-points` API）
9. 返回 session 和 user 資訊

**效能問題**：
- ⚠️ 每日登入積分使用 HTTP 呼叫內部 API，導致回應時間過長（平均 2.29 秒）

---

### **1.2 債務管理功能** ✅

#### **債務上傳 API** (`POST /api/debts/upload`)

**完整的必填欄位**（8 個）：
1. ✅ `debtor_name`（債務人姓名）- VARCHAR
2. ✅ `debtor_id_full`（身分證字號）- 格式：1 個英文字母 + 9 個數字（例如：A123456789）
3. ✅ `gender`（性別）- 男、女、其他
4. ✅ `residence`（居住地）- 北北基宜、桃竹苗、中彰投、雲嘉南、高屏澎、花東
5. ✅ `debt_date`（債務日期）- 格式：YYYY-MM-DD
6. ✅ `face_value`（票面金額）- 數字，必須 > 0
7. ✅ `payment_frequency`（還款配合）- daily、weekly、monthly
8. ✅ `repayment_status`（還款狀況）- 待觀察、正常、結清、議價結清、代償、疲勞、呆帳

**選填欄位**（3 個）：
- `debtor_phone`（電話）- 格式：09XXXXXXXX
- `profession`（職業）- VARCHAR
- `note`（備註）- TEXT

**驗證規則**：
- 身分證格式：`/^[A-Z][0-9]{9}$/i`
- 性別：`['男', '女', '其他']`
- 居住地：`['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']`
- 還款配合：`['daily', 'weekly', 'monthly']`
- 還款狀況：`['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳']`
- 票面金額：必須是數字且 > 0
- 債務日期：`/^\d{4}-\d{2}-\d{2}$/`
- 電話：`/^09\d{8}$/`（選填）

**上傳流程**：
1. 驗證使用者身份（Bearer Token）
2. 檢查會員狀態（必須是 `approved`）
3. 驗證所有必填欄位
4. 驗證欄位格式
5. 檢查每日上傳配額（初始 10 次/天）
6. 插入債務記錄到 `debt_records` 表
7. 記錄審計日誌
8. 新增活躍度點數（呼叫 `add_activity_points` 函數）
9. 返回成功回應

---

#### **債務查詢 API** (`GET /api/debts/search`)

**正確的 API 路徑**：`/api/debts/search`（不是 `/api/debts`）

**必填查詢參數**：
1. ✅ `firstLetter`（身分證首字母）- A-Z
2. ✅ `last5`（身分證後5碼）- 5 位數字

**選填查詢參數**：
- `residence`（居住地篩選）

**查詢流程**：
1. 驗證使用者身份
2. 檢查會員狀態（必須是 `approved`）
3. 解析查詢參數
4. 檢查每日查詢配額（初始 20 次/天）
5. 查詢債務記錄（使用 `debt_records_masked` 視圖）
6. 記錄審計日誌
7. 扣除查詢配額
8. 返回查詢結果

**效能問題**：
- ⚠️ 平均回應時間 4.47 秒（非常慢）
- ⚠️ 最大回應時間 35.17 秒（異常）

---

### **1.3 管理員後台功能** ⏳

（待檢視）

---

### **1.4 資料庫結構** ✅

#### **debt_records 表結構**（完整的 19 個欄位）

| 欄位名稱 | 資料類型 | 必填 | 預設值 | 說明 |
|---------|---------|------|--------|------|
| `id` | UUID | ✅ | gen_random_uuid() | 主鍵 |
| `debtor_name` | VARCHAR | ✅ | - | 債務人姓名 |
| `debtor_id_full` | VARCHAR | ✅ | - | 完整身分證字號 |
| `debtor_phone` | VARCHAR | ❌ | - | 債務人電話 |
| `gender` | VARCHAR | ✅ | - | 性別 |
| `profession` | VARCHAR | ❌ | - | 職業 |
| `residence` | VARCHAR | ✅ | - | 居住地區 |
| `debt_date` | DATE | ✅ | - | 債務日期 |
| `face_value` | NUMERIC | ✅ | - | 票面金額 |
| `payment_frequency` | TEXT | ✅ | - | 還款頻率 |
| `repayment_status` | VARCHAR | ✅ | '待觀察' | 還款狀況 |
| `note` | TEXT | ❌ | - | 備註 |
| `uploaded_by` | UUID | ✅ | - | 上傳者 |
| `created_at` | TIMESTAMPTZ | ❌ | now() | 建立時間 |
| `updated_at` | TIMESTAMPTZ | ❌ | now() | 更新時間 |
| `debtor_id_first_letter` | TEXT | ❌ | - | 身分證首字母 |
| `debtor_id_last5` | TEXT | ❌ | - | 身分證後5碼 |
| `admin_edited_by` | UUID | ❌ | - | 管理員編輯者 |
| `admin_edit_reason` | TEXT | ❌ | - | 管理員編輯原因 |
| `likes_count` | INTEGER | ✅ | 0 | 按讚數 |

**約束條件**：
- `payment_frequency` CHECK：`IN ('daily','weekly','monthly')`
- `repayment_status` CHECK：`IN ('待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳')`

---

## 🔍 **第二階段：測試腳本錯誤分析**

### **錯誤 1：查詢 API 路徑錯誤** ✅ **已修復**

**原始錯誤**：
```javascript
const queryRes = http.get(
  `${BASE_URL}/api/debts?page=1&limit=10`,  // ❌ 錯誤路徑
  queryParams
);
```

**修復後**：
```javascript
const queryRes = http.get(
  `${BASE_URL}/api/debts/search?firstLetter=A&last5=12345`,  // ✅ 正確路徑
  queryParams
);
```

**結果**：查詢成功率從 0% 提升到 100% ✅

---

### **錯誤 2：上傳 API CSV 格式錯誤** ❌ **仍需修復**

**測試腳本生成的 CSV**（錯誤）：
```csv
債務人姓名,身分證字號,電話,地址,債務金額,債務類型,備註
測試債務人1234,A123456789,0912345678,台北市測試路50號,500000,信用貸款,測試備註1
```

**API 要求的格式**（正確）：
```javascript
{
  debtor_name: "測試債務人1234",
  debtor_id_full: "A123456789",
  debtor_phone: "0912345678",  // 選填
  gender: "男",  // ❌ 缺少
  profession: "自由業",  // 選填
  residence: "北北基宜",  // ❌ 缺少
  debt_date: "2025-01-01",  // ❌ 缺少
  face_value: 500000,  // ❌ 缺少（欄位名稱錯誤）
  payment_frequency: "monthly",  // ❌ 缺少
  repayment_status: "正常",  // ❌ 缺少
  note: "測試備註1"  // 選填
}
```

**缺少的必填欄位**（6 個）：
1. ❌ `gender`（性別）
2. ❌ `residence`（居住地）
3. ❌ `debt_date`（債務日期）
4. ❌ `face_value`（票面金額）- 測試腳本使用「債務金額」，但 API 要求「票面金額」
5. ❌ `payment_frequency`（還款配合）
6. ❌ `repayment_status`（還款狀況）

**錯誤訊息**：
```
上傳失敗: 400 - {
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "以下欄位為必填：債務人姓名、身分證字號、性別、居住地、債務日期、票面金額、還款配合、還款狀況"
  }
}
```

---

## ✅ **修復方案**

### **修復上傳 API 的請求格式**

**注意**：上傳 API 使用 **JSON 格式**，不是 CSV 格式！

測試腳本應該直接發送 JSON 請求：

```javascript
const uploadPayload = JSON.stringify({
  debtor_name: `測試債務人${Math.floor(Math.random() * 10000)}`,
  debtor_id_full: `A${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
  debtor_phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
  gender: ['男', '女'][Math.floor(Math.random() * 2)],
  profession: '自由業',
  residence: ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'][Math.floor(Math.random() * 6)],
  debt_date: '2025-01-01',
  face_value: Math.floor(Math.random() * 1000000) + 10000,
  payment_frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
  repayment_status: ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳'][Math.floor(Math.random() * 7)],
  note: `測試備註${Math.floor(Math.random() * 100)}`
});

const uploadParams = {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  tags: { name: 'Upload_Debts' },
};

const uploadRes = http.post(
  `${BASE_URL}/api/debts/upload`,
  uploadPayload,
  uploadParams
);
```

---

## 📊 **總結**

### **已修復的問題**

1. ✅ **查詢 API 路徑錯誤**
   - 修改為正確的路徑：`/api/debts/search`
   - 查詢成功率：100%

2. ✅ **註冊帳號格式錯誤**
   - 移除底線，改用純數字和字母組合
   - 註冊成功率：100%

3. ✅ **登入功能正常**
   - 帳號密碼正確
   - 登入成功率：100%

### **仍需修復的問題**

1. ❌ **上傳 API 請求格式錯誤**
   - 缺少 6 個必填欄位
   - 需要修改測試腳本

2. ⚠️ **查詢 API 效能問題**
   - 平均回應時間 4.47 秒
   - 需要優化資料庫查詢

3. ⚠️ **登入 API 效能問題**
   - 平均回應時間 2.29 秒
   - 建議改為直接呼叫資料庫函數

---

## 🎯 **下一步行動**

1. **立即修復**：修改測試腳本的上傳請求格式
2. **重新測試**：執行小規模測試（5人）
3. **確認成功**：確認所有功能都正常
4. **擴大測試**：擴大到 20 人並發測試

