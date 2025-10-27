# 管理員無法訪問後台問題診斷指南

## 問題描述
管理員帳號 q689594（role: super_admin）登入後被導向 `/dashboard` 而非 `/admin/dashboard`，且手動訪問 `/admin/dashboard` 會被重導向回 `/dashboard`。

## 已完成的修復

### 修復 1：移除 role 的預設值
**問題**：`getCurrentUser()` 函數中，當 `roleData` 查詢失敗時，會將 role 設為 `'user'`（字串），導致 middleware 無法判斷查詢是否真的成功。

**修改位置**：`src/middleware.ts` 第 144 行

**修改前**：
```typescript
role: roleData?.role || 'user',  // ❌ 查詢失敗時會變成 'user'
```

**修改後**：
```typescript
role: roleData?.role,  // ✅ 保持原始值，失敗時為 undefined
```

**影響**：現在如果 role 查詢失敗，`user.role` 會是 `undefined`，middleware 可以正確判斷並在開發模式下放行。

### 修復 2：改進管理路徑檢查邏輯
**問題**：開發模式的容錯邏輯放在「非管理員」判斷之後，導致即使 role 是 undefined，也會先被判定為「非管理員」而重導向。

**修改位置**：`src/middleware.ts` 第 255-277 行

**修改後的邏輯順序**：
1. 先檢查是否為開發模式且 role 未知 → 放行
2. 再檢查是否為管理員 → 放行或重導向

### 修復 3：加強除錯日誌
在關鍵位置加上詳細的 console.log，包括：
- `[getCurrentUser]` 查詢錯誤和結果
- `[Middleware]` 使用者認證狀態
- `[Middleware]` 管理路徑檢查的詳細資訊

## 測試步驟

### 步驟 1：啟動開發伺服器
```bash
pnpm dev
```

### 步驟 2：清除瀏覽器資料
1. 打開 Chrome DevTools（F12）
2. Application → Clear site data
3. 點擊「Clear site data」按鈕

### 步驟 3：登入並觀察終端機
1. 前往 http://localhost:3000/login
2. 輸入 `q689594` / `q6969520`
3. 點擊登入
4. **同時觀察終端機輸出**

### 步驟 4：檢查除錯 API
登入後，在新分頁打開：
```
http://localhost:3000/api/debug/me
```

## 預期的終端機輸出

### 情況 A：一切正常（role 查詢成功）
```
[getCurrentUser] User object: {"id":"5a3b6190-...","account":"q689594","status":"approved","role":"super_admin",...}
[getCurrentUser] roleData: {"role":"super_admin"}
[Middleware] 使用者已認證: id=5a3b6190-..., account=q689594, role=super_admin, status=approved
[Middleware] 管理路徑檢查: pathname=/admin/dashboard, role=super_admin, user.role type=string, isAdmin=true
[Middleware] ✅ 管理員存取管理路徑: role=super_admin, pathname=/admin/dashboard
```
**結果**：成功進入 `/admin/dashboard`

### 情況 B：role 查詢失敗（RLS 阻擋或其他問題）
```
[getCurrentUser] Role query error: {...}
[getCurrentUser] Role error details: {...}
[getCurrentUser] User object: {"id":"5a3b6190-...","account":"q689594","status":"approved","role":null,...}
[getCurrentUser] roleData: null
[Middleware] 使用者已認證: id=5a3b6190-..., account=q689594, role=null, status=approved
[Middleware] 管理路徑檢查: pathname=/admin/dashboard, role=null, user.role type=object, isAdmin=false
[Middleware] 開發模式：role 未知或查詢失敗，暫時放行管理路徑以便除錯
[Middleware] 提示：請檢查 user_roles 表的 RLS 政策和資料是否正確
```
**結果**：開發模式下仍然能進入 `/admin/dashboard`（但需要修復 RLS）

## 預期的 /api/debug/me 回應

### 正常情況
```json
{
  "hasCookieToken": true,
  "hasHeaderToken": false,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "5a3b6190-...", "email": "q689594@burgbug.local" },
  "member": { "account": "q689594", "status": "approved" },
  "role": "super_admin",
  "roleFromAdmin": "super_admin",
  "error": null
}
```

### RLS 阻擋情況
```json
{
  "hasCookieToken": true,
  "user": { "id": "5a3b6190-...", "email": "q689594@burgbug.local" },
  "member": { "account": "q689594", "status": "approved" },
  "role": null,
  "roleFromAdmin": "super_admin",  // ← admin client 能查到，證明資料存在
  "error": "Role error: ... (PGRST116)",  // ← RLS 阻擋
  "roleErrorDetails": {...}
}
```

## 如果還是無法訪問管理後台

### 檢查清單
1. ✅ 終端機是否顯示 `[Middleware] ✅ 管理員存取管理路徑`？
2. ✅ `/api/debug/me` 的 `role` 是否為 `"super_admin"`？
3. ✅ 瀏覽器網址列是否停留在 `/admin/dashboard`？

### 需要提供的資訊
請提供以下資訊給開發者：

1. **終端機的完整輸出**（從登入開始到訪問 `/admin/dashboard` 的所有日誌）
2. **`/api/debug/me` 的完整 JSON 回應**
3. **DevTools Network 面板**：
   - POST /api/auth/login 的 Response Headers（特別是 Set-Cookie）
   - GET /admin/dashboard 的請求和回應（狀態碼、Location header）
4. **DevTools Console 是否有錯誤**

## 問題嚴重性評估

**嚴重程度**：🔴 嚴重（阻擋核心功能）

**影響範圍**：
- ✅ 一般會員登入正常
- ❌ 管理員無法訪問管理後台
- ❌ 阻擋 4.2 階段的管理功能開發

**是否需要立即修復**：是

**預計修復時間**：
- 如果是 RLS 問題：5 分鐘（調整政策）
- 如果是其他問題：需要根據日誌進一步診斷

## 可能的根本原因

### 原因 1：RLS 政策阻擋（最可能）
Supabase 的 RLS 在某些情況下可能無法正確識別 `auth.uid()`，導致查詢被阻擋。

**解決方案**：暫時在開發環境停用 user_roles 的 RLS，或調整政策。

### 原因 2：Token 格式問題
middleware 使用的 token 可能與 Supabase Auth 預期的格式不同。

**解決方案**：檢查 token 是否正確傳遞給 Supabase client。

### 原因 3：資料庫連線問題
網路延遲或資料庫連線不穩定導致查詢失敗。

**解決方案**：檢查 Supabase 專案狀態和網路連線。

## 下一步行動

1. **立即執行**：按照「測試步驟」重新測試
2. **收集資訊**：記錄終端機輸出和 `/api/debug/me` 回應
3. **回報結果**：將資訊提供給開發者進行進一步診斷

