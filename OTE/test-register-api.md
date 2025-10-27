# 註冊 API 測試文檔

## 測試目的
驗證更新後的註冊 API 是否正確處理新增的會員資訊欄位。

## 測試案例

### 案例 1：完整資訊註冊（成功）
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser001",
    "password": "Test1234",
    "nickname": "小明",
    "businessType": "當鋪",
    "businessRegion": "北北基宜",
    "phone": "0912345678"
  }'
```

**預期結果**：
- HTTP 201 Created
- 回傳包含 nickname, business_type, business_region 的使用者資訊
- members 表中正確儲存所有欄位

---

### 案例 2：缺少必填欄位（失敗）
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser002",
    "password": "Test1234"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「以下欄位為必填：暱稱、業務類型、業務區域」

---

### 案例 3：無效的業務區域（失敗）
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser003",
    "password": "Test1234",
    "nickname": "小華",
    "businessType": "當鋪",
    "businessRegion": "台北市"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「業務區域無效，請選擇：北北基宜、桃竹苗、中彰投、雲嘉南、高屏澎、花東」

---

### 案例 4：無效的電話格式（失敗）
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser004",
    "password": "Test1234",
    "nickname": "小李",
    "businessType": "小額",
    "businessRegion": "北北基宜",
    "phone": "12345678"
  }'
```

**預期結果**：
- HTTP 400 Bad Request
- 錯誤訊息：「電話格式錯誤，請輸入正確的手機號碼（例如：0912345678）」

---

### 案例 5：不提供電話（成功）
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "account": "testuser005",
    "password": "Test1234",
    "nickname": "小王",
    "businessType": "融資",
    "businessRegion": "桃竹苗"
  }'
```

**預期結果**：
- HTTP 201 Created
- phone 欄位為 null

---

## 資料庫驗證

註冊成功後，檢查 members 表：

```sql
SELECT 
  user_id,
  account,
  nickname,
  business_type,
  business_region,
  phone,
  status,
  created_at
FROM members
WHERE account LIKE 'testuser%'
ORDER BY created_at DESC;
```

**預期結果**：
- 所有欄位正確儲存
- status 為 'pending'
- nickname, business_type, business_region 不為 NULL

---

## 前端測試步驟

1. 啟動開發伺服器：`npm run dev`
2. 訪問註冊頁面：http://localhost:3000/register
3. 驗證表單欄位：
   - ✅ 帳號（必填，標示 *）
   - ✅ 暱稱（必填，標示 *）
   - ✅ 業務類型（必填，下拉選單，標示 *）
   - ✅ 業務區域（必填，下拉選單，標示 *）
   - ✅ 電話（選填）
   - ✅ 密碼（必填，標示 *）
   - ✅ 確認密碼（必填，標示 *）
4. 測試驗證：
   - 不填寫必填欄位，按鈕應該 disabled
   - 填寫無效電話格式，應顯示錯誤訊息
   - 填寫完整資訊，應成功註冊並導向等待審核頁面

---

## 清理測試資料

```sql
-- 刪除測試帳號
DELETE FROM members WHERE account LIKE 'testuser%';

-- 刪除對應的 auth 使用者（需要使用 Supabase Dashboard 或 Admin API）
```

