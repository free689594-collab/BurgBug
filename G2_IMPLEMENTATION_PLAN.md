# 階段 G.2：活躍度點數計算邏輯 - 實作計劃

**版本**：v1.0  
**日期**：2025-01-15  
**預估時間**：1-2 天

---

## 📋 實作目標

建立完整的活躍度點數計算系統，整合到現有的上傳、查詢、按讚、登入功能中。

---

## 🎯 需要整合的現有 API

### 1. 上傳債務資料
- **檔案**：`src/app/api/debts/upload/route.ts`
- **整合位置**：第 258 行之後（成功上傳後）
- **需要新增**：呼叫活躍度點數 API，新增 +2 點

### 2. 查詢債務資料
- **檔案**：`src/app/api/debts/search/route.ts`
- **整合位置**：第 144 行之後（成功查詢後）
- **需要新增**：呼叫活躍度點數 API，新增 +1 點

### 3. 登入功能
- **檔案**：`src/app/api/auth/login/route.ts`
- **整合位置**：第 176 行之後（登入成功後）
- **需要新增**：呼叫活躍度點數 API，新增 +3 點（每日登入）

### 4. 按讚功能
- **狀態**：尚未實作
- **需要建立**：`src/app/api/member/like/[memberId]/route.ts`
- **功能**：按讚 +1 點（給讚者）、收讚 +3 點（被讚者）

---

## 🔧 需要建立的新 API

### 1. 活躍度點數計算 API
- **路徑**：`src/app/api/activity/add-points/route.ts`
- **方法**：POST
- **功能**：
  - 驗證使用者身份
  - 檢查每日上限
  - 檢查冷卻時間
  - 新增活躍度點數
  - 記錄點數歷史
  - 檢查是否升級
  - 返回新的等級和點數

### 2. 等級升級檢查 API
- **路徑**：`src/app/api/activity/check-level-up/route.ts`
- **方法**：POST
- **功能**：
  - 計算會員當前等級
  - 更新 member_statistics
  - 返回升級資訊

### 3. 勳章解鎖檢查 API
- **路徑**：`src/app/api/activity/check-badges/route.ts`
- **方法**：POST
- **功能**：
  - 檢查所有勳章解鎖條件
  - 解鎖符合條件的勳章
  - 返回新解鎖的勳章列表

### 4. 按讚功能 API
- **路徑**：`src/app/api/member/like/[memberId]/route.ts`
- **方法**：POST
- **功能**：
  - 驗證使用者身份
  - 檢查是否為自己（不能給自己按讚）
  - 檢查是否已按讚
  - 插入按讚記錄
  - 給讚者 +1 點
  - 被讚者 +3 點
  - 返回成功回應

### 5. 取消按讚 API
- **路徑**：`src/app/api/member/unlike/[memberId]/route.ts`
- **方法**：POST
- **功能**：
  - 驗證使用者身份
  - 刪除按讚記錄
  - 給讚者 -1 點
  - 被讚者 -3 點
  - 返回成功回應

---

## 📝 實作步驟

### 步驟 1：建立活躍度點數計算 API（30 分鐘）

**檔案**：`src/app/api/activity/add-points/route.ts`

**功能**：
1. 驗證使用者身份
2. 驗證 action 參數（upload, query, like_received, like_given, daily_login）
3. 從 activity_point_rules 取得點數規則
4. 檢查每日上限（如果有）
5. 檢查冷卻時間（如果有）
6. 新增活躍度點數到 member_statistics
7. 記錄到 activity_point_history
8. 呼叫等級升級檢查
9. 返回新的點數和等級

---

### 步驟 2：建立等級升級檢查 API（20 分鐘）

**檔案**：`src/app/api/activity/check-level-up/route.ts`

**功能**：
1. 驗證使用者身份
2. 呼叫 calculate_member_level 函數
3. 比較新舊等級
4. 如果升級，更新 member_statistics
5. 返回升級資訊（是否升級、新等級、新稱號、配額獎勵）

---

### 步驟 3：建立勳章解鎖檢查 API（40 分鐘）

**檔案**：`src/app/api/activity/check-badges/route.ts`

**功能**：
1. 驗證使用者身份
2. 取得所有啟用的勳章配置
3. 取得會員統計資料
4. 逐一檢查解鎖條件
5. 解鎖符合條件的勳章
6. 返回新解鎖的勳章列表

---

### 步驟 4：建立按讚功能 API（30 分鐘）

**檔案**：`src/app/api/member/like/[memberId]/route.ts`

**功能**：
1. 驗證使用者身份
2. 檢查是否為自己
3. 檢查是否已按讚
4. 插入按讚記錄到 member_likes 表
5. 呼叫活躍度點數 API（給讚者 +1，被讚者 +3）
6. 返回成功回應

---

### 步驟 5：整合到上傳 API（10 分鐘）

**檔案**：`src/app/api/debts/upload/route.ts`

**修改位置**：第 258 行之後

**新增程式碼**：
```typescript
// 9. 新增活躍度點數
try {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'upload' })
  })
} catch (err) {
  console.error('Failed to add activity points:', err)
  // 不阻塞主流程
}
```

---

### 步驟 6：整合到查詢 API（10 分鐘）

**檔案**：`src/app/api/debts/search/route.ts`

**修改位置**：第 144 行之後

**新增程式碼**：
```typescript
// 8. 新增活躍度點數
try {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action: 'query' })
  })
} catch (err) {
  console.error('Failed to add activity points:', err)
  // 不阻塞主流程
}
```

---

### 步驟 7：整合到登入 API（15 分鐘）

**檔案**：`src/app/api/auth/login/route.ts`

**修改位置**：第 176 行之後

**新增程式碼**：
```typescript
// 9. 處理每日登入點數和連續登入天數
try {
  // 檢查今天是否已登入
  const today = new Date().toISOString().split('T')[0]
  const { data: stats } = await supabaseAdmin
    .from('member_statistics')
    .select('last_login_date, consecutive_login_days')
    .eq('user_id', authData.user.id)
    .single()

  const lastLoginDate = stats?.last_login_date
  const shouldAddPoints = lastLoginDate !== today

  if (shouldAddPoints) {
    // 計算連續登入天數
    let newConsecutiveDays = 1
    if (lastLoginDate) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (lastLoginDate === yesterdayStr) {
        newConsecutiveDays = (stats?.consecutive_login_days || 0) + 1
      }
    }

    // 更新最後登入日期和連續登入天數
    await supabaseAdmin
      .from('member_statistics')
      .update({
        last_login_date: today,
        consecutive_login_days: newConsecutiveDays
      })
      .eq('user_id', authData.user.id)

    // 新增每日登入點數
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      },
      body: JSON.stringify({ action: 'daily_login' })
    })
  }
} catch (err) {
  console.error('Failed to process daily login:', err)
  // 不阻塞主流程
}
```

---

## 🧪 測試計劃

### 測試 1：活躍度點數計算
- [ ] 測試上傳債務資料後獲得 +2 點
- [ ] 測試查詢債務資料後獲得 +1 點
- [ ] 測試每日登入後獲得 +3 點
- [ ] 測試按讚後給讚者獲得 +1 點
- [ ] 測試收讚後被讚者獲得 +3 點

### 測試 2：每日上限檢查
- [ ] 測試上傳 10 次後無法再獲得點數
- [ ] 測試查詢 20 次後無法再獲得點數
- [ ] 測試給讚 5 次後無法再獲得點數
- [ ] 測試每日登入只能獲得 1 次點數

### 測試 3：等級升級
- [ ] 測試累積 150 點後升級到 LV2
- [ ] 測試升級後稱號和顏色更新
- [ ] 測試升級後配額獎勵正確累加

### 測試 4：勳章解鎖
- [ ] 測試首次上傳後解鎖「首次上傳」勳章
- [ ] 測試首次查詢後解鎖「首次查詢」勳章
- [ ] 測試連續登入 7 天後解鎖「連續登入 7 天」勳章

---

## 📊 預估時間分配

| 步驟 | 預估時間 | 累計時間 |
|------|---------|---------|
| 步驟 1：活躍度點數計算 API | 30 分鐘 | 30 分鐘 |
| 步驟 2：等級升級檢查 API | 20 分鐘 | 50 分鐘 |
| 步驟 3：勳章解鎖檢查 API | 40 分鐘 | 1.5 小時 |
| 步驟 4：按讚功能 API | 30 分鐘 | 2 小時 |
| 步驟 5：整合到上傳 API | 10 分鐘 | 2.2 小時 |
| 步驟 6：整合到查詢 API | 10 分鐘 | 2.3 小時 |
| 步驟 7：整合到登入 API | 15 分鐘 | 2.5 小時 |
| 測試與除錯 | 1.5 小時 | 4 小時 |
| **總計** | **4 小時** | **0.5 天** |

---

## 🔄 下一步

完成階段 G.2 後，繼續執行：

**階段 G.3：等級升級觸發**（預估 1 天）
- 建立升級通知組件
- 整合到前端頁面
- 測試升級流程

---

**文件結束**

