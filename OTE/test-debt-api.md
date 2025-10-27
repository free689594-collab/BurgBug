# 債務管理 API 測試文檔

## 測試前準備

### 1. 取得認證 Token
```bash
# 登入取得 token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "test001",
    "password": "Test1234"
  }'

# 回應中會包含 access_token，後續請求需要使用
```

### 2. 設定環境變數
```bash
export TOKEN="your_access_token_here"
```

---

## API 測試案例

### 1. 債務上傳 API

#### 測試案例 1.1：完整資訊上傳（成功）
```bash
curl -X POST http://localhost:3000/api/debts/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "debtor_name": "王小明",
    "debtor_id_full": "A123456789",
    "debtor_phone": "0912345678",
    "gender": "男",
    "profession": "工程師",
    "residence": "北北基宜",
    "debt_date": "2025-01-15",
    "face_value": 500000,
    "payment_frequency": "monthly",
    "repayment_status": "待觀察",
    "note": "首次借款"
  }'
```

**預期結果**：
- HTTP 201 Created
- 回傳債務記錄 ID、debtor_id_last5、debtor_id_first_letter
- 回傳剩餘上傳次數

---

#### 測試案例 1.2：缺少必填欄位（失敗）
```bash
curl -X POST http://localhost:3000/api/debts/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "debtor_name": "王小明",
    "debtor_id_full": "A123456789"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「以下欄位為必填：性別、居住地、債務日期、票面金額、還款配合、還款狀況」

---

#### 測試案例 1.3：無效的身分證格式（失敗）
```bash
curl -X POST http://localhost:3000/api/debts/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "debtor_name": "王小明",
    "debtor_id_full": "12345",
    "gender": "男",
    "residence": "北北基宜",
    "debt_date": "2025-01-15",
    "face_value": 500000,
    "payment_frequency": "monthly",
    "repayment_status": "待觀察"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「身分證格式錯誤，應為 1 個英文字母 + 9 個數字（例如：A123456789）」

---

#### 測試案例 1.4：超過每日上傳配額（失敗）
```bash
# 連續上傳 11 次（超過每日限制 10 次）
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/debts/upload \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "debtor_name": "測試'$i'",
      "debtor_id_full": "A12345678'$i'",
      "gender": "男",
      "residence": "北北基宜",
      "debt_date": "2025-01-15",
      "face_value": 100000,
      "payment_frequency": "monthly",
      "repayment_status": "待觀察"
    }'
  echo ""
done
```

**預期結果**：
- 前 10 次：HTTP 201 Created
- 第 11 次：HTTP 429 Too Many Requests
- 錯誤訊息：「您今日的上傳次數已達上限（10 次），請明天再試」

---

### 2. 債務查詢 API

#### 測試案例 2.1：基本查詢（成功）
```bash
curl -X GET "http://localhost:3000/api/debts/search?firstLetter=A&last5=56789" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 回傳查詢結果（遮罩版）
- 回傳剩餘查詢次數
- 債務人姓名、身分證、電話已遮罩

---

#### 測試案例 2.2：帶居住地篩選（成功）
```bash
curl -X GET "http://localhost:3000/api/debts/search?firstLetter=A&last5=56789&residence=北北基宜" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 只回傳居住地為「北北基宜」的記錄

---

#### 測試案例 2.3：缺少必填參數（失敗）
```bash
curl -X GET "http://localhost:3000/api/debts/search?firstLetter=A" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「請提供身分證首字母（firstLetter）和後5碼（last5）」

---

#### 測試案例 2.4：無效的首字母格式（失敗）
```bash
curl -X GET "http://localhost:3000/api/debts/search?firstLetter=1&last5=56789" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「身分證首字母必須為 A-Z 的英文字母」

---

#### 測試案例 2.5：無效的後5碼格式（失敗）
```bash
curl -X GET "http://localhost:3000/api/debts/search?firstLetter=A&last5=123" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「身分證後5碼必須為 5 位數字」

---

### 3. 我的債務人列表 API

#### 測試案例 3.1：基本查詢（成功）
```bash
curl -X GET "http://localhost:3000/api/debts/my-debtors" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 回傳使用者上傳的所有債務記錄（不遮罩）
- 回傳統計資訊（總筆數、總票面金額、按狀況統計、按區域統計）
- 回傳分頁資訊

---

#### 測試案例 3.2：帶篩選條件（成功）
```bash
curl -X GET "http://localhost:3000/api/debts/my-debtors?status=待觀察&residence=北北基宜" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 只回傳還款狀況為「待觀察」且居住地為「北北基宜」的記錄

---

#### 測試案例 3.3：分頁查詢（成功）
```bash
curl -X GET "http://localhost:3000/api/debts/my-debtors?page=2&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 回傳第 2 頁的 10 筆記錄
- 分頁資訊包含總頁數

---

### 4. 債務狀態更新 API

#### 測試案例 4.1：更新還款狀態（成功）
```bash
curl -X PATCH http://localhost:3000/api/debts/{debt_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repayment_status": "正常",
    "note": "已開始正常還款"
  }'
```

**預期結果**：
- HTTP 200 OK
- 回傳更新後的債務記錄

---

#### 測試案例 4.2：無效的還款狀況（失敗）
```bash
curl -X PATCH http://localhost:3000/api/debts/{debt_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "repayment_status": "無效狀態"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「還款狀況必須為：待觀察、正常、結清、議價結清、代償、疲勞、呆帳」

---

#### 測試案例 4.3：無權限修改（失敗）
```bash
# 使用另一個使用者的 token 嘗試修改
curl -X PATCH http://localhost:3000/api/debts/{other_user_debt_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OTHER_TOKEN" \
  -d '{
    "repayment_status": "正常"
  }'
```

**預期結果**：
- HTTP 403 Forbidden
- 錯誤訊息：「您沒有權限修改此債務記錄」

---

### 5. 刪除債務記錄 API（僅限管理員）

#### 測試案例 5.1：管理員刪除（成功）
```bash
curl -X DELETE http://localhost:3000/api/debts/{debt_id} \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**預期結果**：
- HTTP 200 OK
- 訊息：「債務記錄已刪除」

---

#### 測試案例 5.2：非管理員刪除（失敗）
```bash
curl -X DELETE http://localhost:3000/api/debts/{debt_id} \
  -H "Authorization: Bearer $TOKEN"
```

**預期結果**：
- HTTP 403 Forbidden
- 錯誤訊息：「需要管理員權限」

---

## 資料庫驗證

### 檢查債務記錄
```sql
SELECT 
  id,
  debtor_name,
  debtor_id_full,
  debtor_id_first_letter,
  debtor_id_last5,
  residence,
  face_value,
  repayment_status,
  uploaded_by,
  created_at
FROM debt_records
ORDER BY created_at DESC
LIMIT 10;
```

### 檢查遮罩視圖
```sql
SELECT 
  id,
  debtor_name,
  debtor_id_full,
  debtor_phone,
  debtor_id_first_letter,
  debtor_id_last5
FROM debt_records_masked
LIMIT 10;
```

### 檢查審計日誌
```sql
SELECT 
  action,
  resource,
  resource_id,
  meta,
  created_at
FROM audit_logs
WHERE action IN ('DEBT_UPLOAD', 'DEBT_SEARCH', 'DEBT_UPDATE', 'DEBT_DELETE')
ORDER BY created_at DESC
LIMIT 20;
```

---

## 清理測試資料

```sql
-- 刪除測試債務記錄
DELETE FROM debt_records WHERE debtor_name LIKE '測試%';

-- 刪除測試審計日誌
DELETE FROM audit_logs WHERE action IN ('DEBT_UPLOAD', 'DEBT_SEARCH', 'DEBT_UPDATE');
```

