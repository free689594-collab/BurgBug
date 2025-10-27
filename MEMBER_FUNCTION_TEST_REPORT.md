# 會員功能測試報告

**報告日期**：2025-10-26  
**測試範圍**：會員註冊、登入、審核、權限控制  
**測試方式**：程式碼審查 + 功能測試計畫

---

## 📋 目錄

1. [程式碼審查結果](#程式碼審查結果)
2. [發現的潛在問題](#發現的潛在問題)
3. [測試計畫](#測試計畫)
4. [建議修復項目](#建議修復項目)

---

## 1. 程式碼審查結果

### ✅ 會員註冊功能（`/api/auth/register`）

#### 優點：
1. ✅ **完整的輸入驗證**
   - 帳號格式驗證（5-15 字元，僅英數字）
   - 密碼強度驗證（至少 8 字元，包含大小寫字母和數字）
   - 暱稱長度限制（最多 10 字元）
   - 業務區域驗證（限定 6 個區域）
   - 電話格式驗證（09 開頭，10 碼）

2. ✅ **安全機制完善**
   - IP 節流限制（每小時最多 3 次註冊）
   - reCAPTCHA 人機驗證（生產環境）
   - 帳號重複檢查（大小寫不敏感）
   - 密碼強度要求

3. ✅ **資料一致性保護**
   - 使用 Supabase Admin API 建立使用者
   - 建立 members 記錄
   - 建立 user_roles 記錄
   - 失敗時自動回滾（刪除已建立的記錄）

4. ✅ **審計日誌記錄**
   - 記錄註冊動作
   - 包含 IP、帳號、業務資訊

#### 潛在問題：
⚠️ **問題 1：帳號重複檢查的錯誤處理**
- **位置**：`src/app/api/auth/register/route.ts` 第 223-247 行
- **問題**：使用 `.single()` 查詢可能導致誤判
- **影響**：當帳號不存在時，會拋出 PGRST116 錯誤，需要額外處理

```typescript
// 當前程式碼
const { data: existingMember, error: checkError } = await supabaseAdmin
  .from('members')
  .select('account')
  .ilike('account', account)
  .single()  // ⚠️ 問題：帳號不存在時會拋出錯誤

if (existingMember) {
  // 帳號已存在
}

// 建議改為
const { data: existingMembers } = await supabaseAdmin
  .from('members')
  .select('account')
  .ilike('account', account)
  .limit(1)

if (existingMembers && existingMembers.length > 0) {
  // 帳號已存在
}
```

⚠️ **問題 2：密碼驗證不一致**
- **位置**：前端和後端的密碼驗證邏輯
- **問題**：前端要求特殊字元，但後端不要求
- **影響**：可能造成使用者困惑

**前端**（`src/app/register/page.tsx`）：
```typescript
// 前端沒有要求特殊字元，只要求大小寫字母和數字
```

**後端**（`src/app/api/auth/register/route.ts`）：
```typescript
const passwordValidation = validatePasswordStrength(password, false) // false = 不要求特殊字元
```

✅ **這個是一致的，沒有問題！**

---

### ✅ 會員登入功能（`/api/auth/login`）

#### 優點：
1. ✅ **完整的認證流程**
   - 帳號格式驗證
   - 密碼驗證
   - Supabase Auth 整合
   - 會員狀態檢查

2. ✅ **單裝置控制**
   - 更新 active_sessions 表
   - 記錄 session_id 和 device_fingerprint
   - 支援會話驗證

3. ✅ **活躍度系統整合**
   - 每日登入積分
   - 連續登入天數計算
   - 等級升級檢查
   - 勳章解鎖檢查

4. ✅ **智能導向**
   - 根據角色和狀態決定導向路徑
   - 管理員 → `/admin/dashboard`
   - 已核准會員 → `/dashboard`
   - 待審核會員 → `/waiting-approval?status=pending`
   - 停用會員 → `/waiting-approval?status=suspended`

5. ✅ **Cookie 安全設定**
   - HttpOnly Cookie（防止 XSS）
   - Secure 標記（HTTPS）
   - SameSite=Lax（防止 CSRF）

#### 潛在問題：
⚠️ **問題 3：停用會員可以登入**
- **位置**：`src/app/api/auth/login/route.ts` 第 115-120 行
- **問題**：程式碼註解說「僅阻擋 suspended 會員登入」，但實際上 suspended 會員可以登入
- **影響**：停用會員可以取得 token，雖然會被導向 `/waiting-approval`，但仍可能存取 API

```typescript
// 當前程式碼
if (member.status === 'suspended') {
  return NextResponse.json(
    errorResponse(ErrorCodes.FORBIDDEN, '帳號已被停用，請聯絡管理員'),
    { status: 403 }
  )
}
```

✅ **這個邏輯是正確的！suspended 會員無法登入。**

⚠️ **問題 4：每日登入積分 API 呼叫可能失敗**
- **位置**：`src/app/api/auth/login/route.ts` 第 216-234 行
- **問題**：使用 `fetch` 呼叫內部 API，可能因為 URL 錯誤或網路問題失敗
- **影響**：登入成功但積分未增加

```typescript
const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authData.session.access_token}`
  },
  body: JSON.stringify({
    action: 'daily_login',
    metadata: {
      consecutive_days: newConsecutiveDays,
      login_date: today
    }
  })
})
```

**建議**：直接呼叫資料庫函數，而不是透過 HTTP API

---

### ✅ 中間件（Middleware）

#### 優點：
1. ✅ **完整的路由保護**
   - 公開路徑清單
   - 管理路徑檢查
   - 會員狀態檢查

2. ✅ **靈活的認證機制**
   - 支援 Cookie 和 Authorization Header
   - Token 驗證
   - 使用者資料查詢

3. ✅ **單裝置控制**
   - 會話驗證
   - 裝置衝突檢測
   - 開發模式可關閉

4. ✅ **智能導向**
   - 未認證 → `/login`
   - 待審核 → `/waiting-approval`
   - 停用 → `/account-suspended`
   - 非管理員存取管理路徑 → `/dashboard`

#### 潛在問題：
⚠️ **問題 5：開發模式的安全性降低**
- **位置**：`src/middleware.ts` 第 274-278 行
- **問題**：開發模式下，如果 role 查詢失敗，會放行管理路徑
- **影響**：可能讓非管理員存取管理功能

```typescript
// 開發模式：如果 role 是 null/undefined/空字串，可能是查詢失敗，先放行以便除錯
if (process.env.NODE_ENV !== 'production' && !user.role) {
  console.log('[Middleware] 開發模式：role 未知或查詢失敗，暫時放行管理路徑以便除錯')
  return NextResponse.next()
}
```

**建議**：即使在開發模式，也應該檢查 user_roles 表，而不是直接放行

⚠️ **問題 6：Token 解析的重複程式碼**
- **位置**：`src/middleware.ts` 第 76-102 行和第 109-127 行
- **問題**：Token 解析邏輯重複兩次
- **影響**：程式碼維護困難

**建議**：提取為獨立函數

---

### ✅ 前端頁面

#### 註冊頁面（`src/app/register/page.tsx`）

**優點**：
1. ✅ 即時密碼強度驗證
2. ✅ 密碼顯示/隱藏切換
3. ✅ 表單欄位驗證
4. ✅ 友善的錯誤訊息
5. ✅ 註冊須知說明

**潛在問題**：
⚠️ **問題 7：電話驗證正則表達式不夠嚴格**
- **位置**：`src/app/register/page.tsx` 第 86 行
- **問題**：`/^09\d{8}$/` 允許任何 09 開頭的 10 碼數字
- **影響**：可能接受無效的手機號碼（如 0900000000）

**建議**：使用更嚴格的驗證
```typescript
// 台灣手機號碼：09 開頭，第三碼為 0-9
/^09[0-9]{8}$/
```

#### 登入頁面（`src/app/login/page.tsx`）

**優點**：
1. ✅ 簡潔的登入表單
2. ✅ 活躍度通知整合
3. ✅ 等級升級和勳章解鎖提示
4. ✅ 測試帳號資訊（開發模式）

**潛在問題**：
⚠️ **問題 8：登入後延遲導向**
- **位置**：`src/app/login/page.tsx` 第 66-69 行
- **問題**：固定延遲 2 秒才導向
- **影響**：使用者體驗不佳，特別是沒有升級或解鎖時

```typescript
// 等待 2 秒讓使用者看到通知，再進行導向
setTimeout(() => {
  router.replace(redirectTo)
}, 2000)
```

**建議**：根據是否有通知決定延遲時間
```typescript
const delay = (data.data.activity?.level_up || data.data.activity?.badge_check?.newBadges?.length > 0) ? 2000 : 500
setTimeout(() => {
  router.replace(redirectTo)
}, delay)
```

---

## 2. 發現的潛在問題總結

| # | 問題 | 嚴重程度 | 位置 | 建議修復 |
|---|------|---------|------|---------|
| 1 | 帳號重複檢查使用 `.single()` | 🟡 中 | `register/route.ts:223` | 改用 `.limit(1)` |
| 2 | ~~密碼驗證不一致~~ | ✅ 無問題 | - | - |
| 3 | ~~停用會員可以登入~~ | ✅ 已阻擋 | - | - |
| 4 | 每日登入積分 API 呼叫 | 🟡 中 | `login/route.ts:216` | 直接呼叫資料庫函數 |
| 5 | 開發模式安全性降低 | 🟡 中 | `middleware.ts:274` | 改善 role 查詢邏輯 |
| 6 | Token 解析重複程式碼 | 🟢 低 | `middleware.ts:76,109` | 提取為函數 |
| 7 | 電話驗證不夠嚴格 | 🟢 低 | `register/page.tsx:86` | 使用更嚴格的正則 |
| 8 | 登入後固定延遲導向 | 🟢 低 | `login/page.tsx:66` | 根據通知決定延遲 |

---

## 3. 測試計畫

### 測試 1：會員註冊功能

#### 測試案例 1.1：正常註冊
**步驟**：
1. 開啟 http://localhost:3000/register
2. 填寫有效資料：
   - 帳號：testuser001
   - 暱稱：測試用戶001
   - 業務類型：當鋪
   - 業務區域：北北基宜
   - 電話：0912345678
   - 密碼：TestPass123
   - 確認密碼：TestPass123
3. 點擊「註冊」按鈕

**預期結果**：
- ✅ 註冊成功
- ✅ 導向 `/waiting-approval?registered=true`
- ✅ 資料庫中建立 members 記錄（status=pending）
- ✅ 資料庫中建立 user_roles 記錄（role=user）
- ✅ 審計日誌記錄註冊動作

#### 測試案例 1.2：帳號重複
**步驟**：
1. 使用已存在的帳號註冊（如 testuser1）

**預期結果**：
- ❌ 註冊失敗
- ✅ 顯示錯誤訊息：「此帳號已被註冊，請使用其他帳號」

#### 測試案例 1.3：密碼強度不足
**步驟**：
1. 使用弱密碼註冊（如 test123）

**預期結果**：
- ❌ 註冊失敗
- ✅ 顯示密碼強度錯誤訊息

#### 測試案例 1.4：電話格式錯誤
**步驟**：
1. 輸入無效電話號碼（如 0800123456）

**預期結果**：
- ❌ 註冊失敗
- ✅ 顯示錯誤訊息：「電話格式錯誤」

#### 測試案例 1.5：註冊節流
**步驟**：
1. 在 1 小時內註冊 4 次（使用不同帳號）

**預期結果**：
- ✅ 前 3 次成功
- ❌ 第 4 次失敗，顯示「註冊次數過多」

---

### 測試 2：會員登入功能

#### 測試案例 2.1：正常登入（已核准會員）
**步驟**：
1. 開啟 http://localhost:3000/login
2. 輸入已核准會員的帳號密碼
3. 點擊「登入」按鈕

**預期結果**：
- ✅ 登入成功
- ✅ 導向 `/dashboard`
- ✅ 顯示等級升級通知（如果有）
- ✅ 顯示勳章解鎖通知（如果有）
- ✅ 增加每日登入積分
- ✅ 更新連續登入天數

#### 測試案例 2.2：待審核會員登入
**步驟**：
1. 使用待審核會員的帳號登入

**預期結果**：
- ✅ 登入成功
- ✅ 導向 `/waiting-approval?status=pending`
- ✅ 顯示「等待審核」訊息

#### 測試案例 2.3：停用會員登入
**步驟**：
1. 使用已停用會員的帳號登入

**預期結果**：
- ❌ 登入失敗
- ✅ 顯示錯誤訊息：「帳號已被停用，請聯絡管理員」

#### 測試案例 2.4：管理員登入
**步驟**：
1. 使用管理員帳號登入（如 q689594）

**預期結果**：
- ✅ 登入成功
- ✅ 導向 `/admin/dashboard`

#### 測試案例 2.5：錯誤的帳號或密碼
**步驟**：
1. 輸入不存在的帳號或錯誤的密碼

**預期結果**：
- ❌ 登入失敗
- ✅ 顯示錯誤訊息：「帳號或密碼錯誤」

---

### 測試 3：會員審核流程

#### 測試案例 3.1：核准會員
**步驟**：
1. 管理員登入
2. 前往 `/admin/members`
3. 找到待審核會員
4. 點擊「核准」按鈕

**預期結果**：
- ✅ 會員狀態更新為 approved
- ✅ 記錄 approved_at 和 approved_by
- ✅ 審計日誌記錄審核動作
- ✅ 會員可以正常登入並使用功能

#### 測試案例 3.2：暫停會員
**步驟**：
1. 管理員暫停已核准的會員

**預期結果**：
- ✅ 會員狀態更新為 suspended
- ✅ 記錄 suspended_at、suspended_by、suspended_reason
- ✅ 會員無法登入
- ✅ 已登入的會員被導向 `/account-suspended`

---

### 測試 4：會員權限控制

#### 測試案例 4.1：待審核會員存取限制
**步驟**：
1. 待審核會員登入
2. 嘗試存取 `/dashboard`、`/debts/upload` 等頁面

**預期結果**：
- ❌ 無法存取
- ✅ 自動導向 `/waiting-approval`

#### 測試案例 4.2：一般會員存取管理後台
**步驟**：
1. 一般會員登入
2. 嘗試存取 `/admin/dashboard`

**預期結果**：
- ❌ 無法存取
- ✅ 自動導向 `/dashboard`

#### 測試案例 4.3：管理員存取會員功能
**步驟**：
1. 管理員登入
2. 存取 `/dashboard`、`/debts/upload` 等頁面

**預期結果**：
- ✅ 可以正常存取（管理員也是會員）

---

## 4. 建議修復項目

### 🔴 必要修復（影響功能正確性）

#### 修復 1：改善帳號重複檢查邏輯
**檔案**：`src/app/api/auth/register/route.ts`

```typescript
// 修改前（第 223-247 行）
const { data: existingMember, error: checkError } = await supabaseAdmin
  .from('members')
  .select('account')
  .ilike('account', account)
  .single()

if (existingMember) {
  recordAttempt(ip)
  return NextResponse.json(
    errorResponse(ErrorCodes.CONFLICT, '此帳號已被註冊，請使用其他帳號'),
    { status: 409 }
  )
}

// 修改後
const { data: existingMembers } = await supabaseAdmin
  .from('members')
  .select('account')
  .ilike('account', account)
  .limit(1)

if (existingMembers && existingMembers.length > 0) {
  recordAttempt(ip)
  return NextResponse.json(
    errorResponse(ErrorCodes.CONFLICT, '此帳號已被註冊，請使用其他帳號'),
    { status: 409 }
  )
}
```

---

### 🟡 建議修復（改善使用者體驗）

#### 修復 2：優化每日登入積分邏輯
**檔案**：`src/app/api/auth/login/route.ts`

建議直接呼叫資料庫函數，而不是透過 HTTP API：

```typescript
// 修改前（第 216-234 行）
const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
  method: 'POST',
  // ...
})

// 修改後
try {
  const { data: activityData } = await supabaseAdmin.rpc('add_activity_points', {
    p_user_id: authData.user.id,
    p_action: 'daily_login',
    p_metadata: {
      consecutive_days: newConsecutiveDays,
      login_date: today
    }
  })
  activityResult = activityData
} catch (err) {
  console.error('Failed to add daily login points:', err)
}
```

#### 修復 3：改善登入後導向延遲
**檔案**：`src/app/login/page.tsx`

```typescript
// 修改前（第 66-69 行）
setTimeout(() => {
  router.replace(redirectTo)
}, 2000)

// 修改後
const hasNotifications = data.data.activity?.level_up || data.data.activity?.badge_check?.newBadges?.length > 0
const delay = hasNotifications ? 2000 : 500

setTimeout(() => {
  router.replace(redirectTo)
}, delay)
```

---

## 5. 測試結果記錄表

| 測試案例 | 狀態 | 備註 |
|---------|------|------|
| 1.1 正常註冊 | ⏳ 待測試 | |
| 1.2 帳號重複 | ⏳ 待測試 | |
| 1.3 密碼強度不足 | ⏳ 待測試 | |
| 1.4 電話格式錯誤 | ⏳ 待測試 | |
| 1.5 註冊節流 | ⏳ 待測試 | |
| 2.1 正常登入（已核准） | ⏳ 待測試 | |
| 2.2 待審核會員登入 | ⏳ 待測試 | |
| 2.3 停用會員登入 | ⏳ 待測試 | |
| 2.4 管理員登入 | ⏳ 待測試 | |
| 2.5 錯誤帳號密碼 | ⏳ 待測試 | |
| 3.1 核准會員 | ⏳ 待測試 | |
| 3.2 暫停會員 | ⏳ 待測試 | |
| 4.1 待審核會員存取限制 | ⏳ 待測試 | |
| 4.2 一般會員存取管理後台 | ⏳ 待測試 | |
| 4.3 管理員存取會員功能 | ⏳ 待測試 | |

---

## 6. 總結

### ✅ 優點
1. **程式碼品質高**：完整的輸入驗證、錯誤處理、安全機制
2. **功能完整**：註冊、登入、審核、權限控制都已實作
3. **安全性佳**：節流限制、密碼強度、HttpOnly Cookie、單裝置控制
4. **使用者體驗好**：即時驗證、友善錯誤訊息、智能導向

### ⚠️ 需要改進
1. **帳號重複檢查邏輯**：使用 `.limit(1)` 代替 `.single()`
2. **每日登入積分**：直接呼叫資料庫函數，避免 HTTP 呼叫
3. **登入延遲**：根據通知決定延遲時間
4. **開發模式安全性**：改善 role 查詢邏輯

### 📊 整體評分
- **功能完整性**：95/100
- **程式碼品質**：90/100
- **安全性**：95/100
- **使用者體驗**：90/100

**總分**：92.5/100 ⭐⭐⭐⭐⭐

---

**報告結束**

建議優先修復「必要修復」項目，然後進行完整的功能測試。

