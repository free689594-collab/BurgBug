# 問題排查指南 - 首頁無法顯示

## 問題描述
使用者反映：
1. 開啟網站時直接跳到登入畫面，而不是顯示歡迎首頁
2. 登入頁面的「返回首頁」按鈕無法點擊

## 可能的原因

### 原因 1：瀏覽器 localStorage 中有舊的登入資訊 ⭐ **最可能**
當你之前登入過系統，localStorage 中會儲存：
- `access_token`
- `refresh_token`
- `user`

即使你關閉瀏覽器，這些資料仍然會保留。當你再次訪問網站時，系統會檢測到這些資料，認為你已登入，就會自動重定向。

### 原因 2：瀏覽器快取問題
瀏覽器可能快取了舊版本的程式碼。

### 原因 3：開發伺服器需要重啟
Next.js 開發伺服器可能需要重新啟動才能載入新的程式碼。

---

## 解決方案

### 🔧 方案 1：清除瀏覽器 localStorage（推薦）

#### 方法 A：使用瀏覽器開發者工具
1. 按 `F12` 開啟開發者工具
2. 切換到 **Console（控制台）** 分頁
3. 輸入以下指令並按 Enter：
   ```javascript
   localStorage.clear()
   ```
4. 重新整理頁面（按 `F5` 或 `Ctrl+R`）

#### 方法 B：使用 Application 面板
1. 按 `F12` 開啟開發者工具
2. 切換到 **Application（應用程式）** 分頁
3. 左側選單找到 **Local Storage**
4. 點擊 `http://localhost:3000`
5. 右鍵點擊 → **Clear（清除）**
6. 重新整理頁面

#### 方法 C：手動刪除特定項目
1. 按 `F12` 開啟開發者工具
2. 切換到 **Console（控制台）** 分頁
3. 輸入以下指令：
   ```javascript
   localStorage.removeItem('access_token')
   localStorage.removeItem('refresh_token')
   localStorage.removeItem('user')
   ```
4. 重新整理頁面

---

### 🔧 方案 2：清除瀏覽器快取

#### Chrome / Edge
1. 按 `Ctrl + Shift + Delete`
2. 選擇「快取的圖片和檔案」
3. 時間範圍選擇「不限時間」
4. 點擊「清除資料」

#### 或使用硬重新整理
1. 按 `Ctrl + Shift + R`（Windows）
2. 或 `Cmd + Shift + R`（Mac）

---

### 🔧 方案 3：使用無痕模式測試

1. 開啟無痕視窗：
   - Chrome/Edge: `Ctrl + Shift + N`
   - Firefox: `Ctrl + Shift + P`
2. 訪問 `http://localhost:3000/`
3. 應該會看到歡迎首頁

**如果無痕模式可以正常顯示，就確定是 localStorage 的問題！**

---

### 🔧 方案 4：重啟開發伺服器

1. 在終端機按 `Ctrl + C` 停止開發伺服器
2. 重新啟動：
   ```bash
   npm run dev
   ```
3. 等待編譯完成
4. 訪問 `http://localhost:3000/`

---

## 診斷步驟

### 步驟 1：檢查 localStorage
1. 按 `F12` 開啟開發者工具
2. 切換到 **Console（控制台）** 分頁
3. 輸入以下指令：
   ```javascript
   console.log('access_token:', localStorage.getItem('access_token'))
   console.log('refresh_token:', localStorage.getItem('refresh_token'))
   console.log('user:', localStorage.getItem('user'))
   ```

**預期結果**：
- 如果都顯示 `null`，表示 localStorage 是乾淨的 ✅
- 如果有任何一個有值，表示有舊的登入資訊 ❌

---

### 步驟 2：檢查頁面 URL
訪問 `http://localhost:3000/` 後，觀察瀏覽器網址列：

**正常情況**：
- URL 保持在 `http://localhost:3000/`
- 顯示歡迎首頁

**異常情況**：
- URL 自動變成 `http://localhost:3000/login`
- 或 `http://localhost:3000/dashboard`
- 或 `http://localhost:3000/admin/dashboard`

---

### 步驟 3：檢查 Console 錯誤
1. 按 `F12` 開啟開發者工具
2. 切換到 **Console（控制台）** 分頁
3. 查看是否有紅色錯誤訊息

**常見錯誤**：
- `Failed to load resource: the server responded with a status of 404` → 正常，只是 favicon 找不到
- 其他錯誤 → 請截圖並提供

---

## 完整的清除步驟（推薦）

### 一次性完整清除
1. **停止開發伺服器**
   - 在終端機按 `Ctrl + C`

2. **清除瀏覽器資料**
   - 按 `F12` 開啟開發者工具
   - Console 輸入：`localStorage.clear()`
   - 按 `Ctrl + Shift + Delete` 清除快取

3. **關閉所有瀏覽器分頁**
   - 完全關閉瀏覽器

4. **重啟開發伺服器**
   ```bash
   npm run dev
   ```

5. **重新開啟瀏覽器**
   - 訪問 `http://localhost:3000/`

6. **驗證結果**
   - 應該看到歡迎首頁
   - 不會自動重定向

---

## 測試「返回首頁」按鈕

### 測試步驟
1. 確保已清除 localStorage
2. 訪問 `http://localhost:3000/`
3. 點擊「會員登入」按鈕
4. 應該看到登入頁面，上方有「← 返回首頁」按鈕
5. 點擊「返回首頁」按鈕
6. 應該回到歡迎首頁

### 如果按鈕無法點擊
可能原因：
1. **瀏覽器快取了舊版本的程式碼**
   - 解決：按 `Ctrl + Shift + R` 硬重新整理

2. **JavaScript 錯誤**
   - 解決：按 `F12` 檢查 Console 是否有錯誤

3. **開發伺服器沒有重新編譯**
   - 解決：重啟開發伺服器

---

## 驗證修改是否生效

### 檢查登入頁面程式碼
1. 開啟 `src/app/login/page.tsx`
2. 搜尋「返回首頁」
3. 應該看到以下程式碼：

```typescript
{/* 返回首頁按鈕 */}
<div className="flex justify-start">
  <button
    onClick={() => router.push('/')}
    className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
  >
    <span>←</span>
    <span>返回首頁</span>
  </button>
</div>
```

如果沒有這段程式碼，表示檔案沒有儲存成功。

---

## 常見問題 FAQ

### Q1: 為什麼我清除 localStorage 後還是會跳到登入頁？
**A**: 可能是瀏覽器快取問題。請按 `Ctrl + Shift + R` 硬重新整理。

### Q2: 為什麼「返回首頁」按鈕看不到？
**A**: 可能是程式碼沒有更新。請：
1. 確認檔案已儲存
2. 重啟開發伺服器
3. 硬重新整理瀏覽器

### Q3: 為什麼無痕模式可以，但正常模式不行？
**A**: 這確定是 localStorage 或快取問題。請完整清除瀏覽器資料。

### Q4: 我已經清除 localStorage，但還是自動登入？
**A**: 檢查是否有 Cookie。在 Console 輸入：
```javascript
document.cookie
```
如果有 `access_token`，請清除 Cookie：
```javascript
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
```

---

## 如果以上方法都無效

請提供以下資訊：

1. **瀏覽器版本**
   - 例如：Chrome 120.0.6099.109

2. **Console 錯誤訊息**
   - 按 `F12` → Console 分頁 → 截圖

3. **localStorage 內容**
   - Console 輸入：`console.log(localStorage)`
   - 截圖結果

4. **當前 URL**
   - 訪問 `http://localhost:3000/` 後的實際 URL

5. **Network 請求**
   - 按 `F12` → Network 分頁
   - 重新整理頁面
   - 截圖所有請求

---

## 快速診斷腳本

複製以下程式碼到 Console，一次性檢查所有狀態：

```javascript
console.log('=== 診斷報告 ===')
console.log('當前 URL:', window.location.href)
console.log('localStorage.access_token:', localStorage.getItem('access_token') ? '有值' : 'null')
console.log('localStorage.refresh_token:', localStorage.getItem('refresh_token') ? '有值' : 'null')
console.log('localStorage.user:', localStorage.getItem('user') ? '有值' : 'null')
console.log('Cookies:', document.cookie || '無')
console.log('=== 診斷完成 ===')
```

**正常結果應該是**：
```
=== 診斷報告 ===
當前 URL: http://localhost:3000/
localStorage.access_token: null
localStorage.refresh_token: null
localStorage.user: null
Cookies: 無
=== 診斷完成 ===
```

---

## 總結

**最可能的原因**：瀏覽器 localStorage 中有舊的登入資訊

**最快的解決方法**：
1. 按 `F12`
2. Console 輸入：`localStorage.clear()`
3. 按 `Ctrl + Shift + R` 硬重新整理

**如果還是不行**：
1. 使用無痕模式測試
2. 重啟開發伺服器
3. 提供診斷資訊

---

**需要更多協助嗎？請提供診斷腳本的輸出結果！** 😊

