# 階段 G.2：活躍度點數系統測試指南

**版本**：v1.0  
**日期**：2025-01-15  
**狀態**：✅ 準備測試

---

## 📋 測試前準備

### 1. 環境設定

確認以下環境變數已設定：

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://gwbmahlclpysbqeqkhez.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # ✅ 已新增
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

### 3. 測試帳號

- **會員帳號**：member001 / Test1234!
- **管理員帳號**：q689594 / q6969520

---

## 🧪 測試案例

### 測試 1：上傳債務資料獲得點數

**目標**：驗證上傳債務資料後獲得 +2 點

**步驟**：
1. 使用會員帳號登入（member001）
2. 前往上傳頁面
3. 上傳一筆債務資料
4. 檢查活躍度點數是否 +2

**預期結果**：
- ✅ 上傳成功
- ✅ 活躍度點數 +2
- ✅ activity_point_history 有記錄
- ✅ 如果達到升級條件，等級自動升級

**SQL 驗證**：
```sql
-- 檢查會員統計
SELECT 
  activity_points,
  activity_level,
  title,
  title_color
FROM member_statistics
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001');

-- 檢查點數歷史
SELECT 
  action,
  points,
  description,
  created_at
FROM activity_point_history
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001')
ORDER BY created_at DESC
LIMIT 5;
```

---

### 測試 2：查詢債務資料獲得點數

**目標**：驗證查詢債務資料後獲得 +1 點

**步驟**：
1. 使用會員帳號登入（member001）
2. 前往查詢頁面
3. 查詢一筆債務資料
4. 檢查活躍度點數是否 +1

**預期結果**：
- ✅ 查詢成功
- ✅ 活躍度點數 +1
- ✅ activity_point_history 有記錄

**SQL 驗證**：
```sql
SELECT 
  action,
  points,
  description,
  metadata,
  created_at
FROM activity_point_history
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001')
  AND action = 'query'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 測試 3：每日登入獲得點數

**目標**：驗證每日登入後獲得 +3 點

**步驟**：
1. 登出會員帳號
2. 重新登入會員帳號（member001）
3. 檢查活躍度點數是否 +3
4. 檢查連續登入天數是否更新

**預期結果**：
- ✅ 登入成功
- ✅ 活躍度點數 +3（僅第一次登入）
- ✅ last_login_date 更新為今天
- ✅ consecutive_login_days 更新
- ✅ 再次登入不會重複獲得點數

**SQL 驗證**：
```sql
SELECT 
  activity_points,
  last_login_date,
  consecutive_login_days
FROM member_statistics
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001');

SELECT 
  action,
  points,
  metadata,
  created_at
FROM activity_point_history
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001')
  AND action = 'daily_login'
ORDER BY created_at DESC
LIMIT 1;
```

---

### 測試 4：按讚功能

**目標**：驗證按讚後給讚者 +1 點，被讚者 +3 點

**步驟**：
1. 使用會員帳號登入（member001）
2. 呼叫按讚 API：
   ```bash
   POST /api/member/like/{管理員的user_id}
   Authorization: Bearer {token}
   ```
3. 檢查給讚者（member001）活躍度點數是否 +1
4. 檢查被讚者（管理員）活躍度點數是否 +3

**預期結果**：
- ✅ 按讚成功
- ✅ 給讚者活躍度點數 +1
- ✅ 被讚者活躍度點數 +3
- ✅ member_likes 有記錄
- ✅ 不能給自己按讚
- ✅ 不能重複按讚

**API 測試**：
```bash
# 取得管理員的 user_id
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"q689594","password":"q6969520"}'

# 按讚（使用 member001 的 token）
curl -X POST http://localhost:3000/api/member/like/{admin_user_id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {member001_token}"

# 取消按讚
curl -X DELETE http://localhost:3000/api/member/like/{admin_user_id} \
  -H "Authorization: Bearer {member001_token}"
```

**SQL 驗證**：
```sql
-- 檢查按讚記錄
SELECT * FROM member_likes
WHERE liker_id = (SELECT user_id FROM members WHERE account = 'member001')
ORDER BY created_at DESC;

-- 檢查點數歷史
SELECT 
  user_id,
  action,
  points,
  created_at
FROM activity_point_history
WHERE action IN ('like_given', 'like_received')
ORDER BY created_at DESC
LIMIT 10;
```

---

### 測試 5：每日上限檢查

**目標**：驗證每日上限功能正常運作

#### 5.1 上傳上限（10 次）

**步驟**：
1. 連續上傳 10 筆債務資料
2. 嘗試上傳第 11 筆
3. 檢查是否還能獲得點數

**預期結果**：
- ✅ 前 10 次上傳都獲得 +2 點（共 20 點）
- ✅ 第 11 次上傳成功但不獲得點數
- ✅ API 回應提示已達每日上限

#### 5.2 查詢上限（20 次）

**步驟**：
1. 連續查詢 20 次債務資料
2. 嘗試查詢第 21 次
3. 檢查是否還能獲得點數

**預期結果**：
- ✅ 前 20 次查詢都獲得 +1 點（共 20 點）
- ✅ 第 21 次查詢成功但不獲得點數
- ✅ API 回應提示已達每日上限

#### 5.3 按讚上限（5 次）

**步驟**：
1. 連續給 5 位不同會員按讚
2. 嘗試給第 6 位會員按讚
3. 檢查是否還能獲得點數

**預期結果**：
- ✅ 前 5 次按讚都獲得 +1 點（共 5 點）
- ✅ 第 6 次按讚成功但不獲得點數
- ✅ API 回應提示已達每日上限

**SQL 驗證**：
```sql
-- 檢查今天的點數記錄
SELECT 
  action,
  COUNT(*) as count,
  SUM(points) as total_points
FROM activity_point_history
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001')
  AND DATE(created_at) = CURRENT_DATE
GROUP BY action;
```

---

### 測試 6：等級升級

**目標**：驗證等級自動升級功能

**步驟**：
1. 使用 SQL 設定會員點數為 145 點（接近 LV2 的 150 點）
2. 執行任何獲得點數的操作（例如：上傳）
3. 檢查是否自動升級到 LV2

**SQL 設定**：
```sql
-- 設定點數為 145
UPDATE member_statistics
SET activity_points = 145
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001');
```

**預期結果**：
- ✅ 獲得點數後自動升級到 LV2
- ✅ activity_level 更新為 2
- ✅ title 更新為「初窺門徑」
- ✅ title_color 更新為 #10B981
- ✅ total_upload_quota_bonus 更新為 1
- ✅ total_query_quota_bonus 更新為 2
- ✅ level_updated_at 更新

**SQL 驗證**：
```sql
SELECT 
  activity_points,
  activity_level,
  title,
  title_color,
  total_upload_quota_bonus,
  total_query_quota_bonus,
  level_updated_at
FROM member_statistics
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001');
```

---

### 測試 7：勳章解鎖

**目標**：驗證勳章自動解鎖功能

#### 7.1 首次上傳勳章

**步驟**：
1. 使用新會員帳號
2. 上傳第一筆債務資料
3. 檢查是否解鎖「首次上傳」勳章

**預期結果**：
- ✅ 自動解鎖「首次上傳」勳章
- ✅ member_badges 有記錄

#### 7.2 上傳達人勳章

**步驟**：
1. 使用 SQL 設定會員上傳次數為 99
2. 上傳一筆債務資料
3. 檢查是否解鎖「上傳達人」勳章

**SQL 設定**：
```sql
UPDATE member_statistics
SET total_uploads = 99
WHERE user_id = (SELECT user_id FROM members WHERE account = 'member001');
```

**預期結果**：
- ✅ 自動解鎖「上傳達人」勳章（100 次上傳）

**SQL 驗證**：
```sql
-- 檢查已解鎖的勳章
SELECT 
  mb.badge_key,
  bc.badge_name,
  bc.description,
  mb.unlocked_at
FROM member_badges mb
JOIN badge_config bc ON mb.badge_key = bc.badge_key
WHERE mb.user_id = (SELECT user_id FROM members WHERE account = 'member001')
ORDER BY mb.unlocked_at DESC;
```

---

### 測試 8：管理員特殊配置

**目標**：驗證管理員帳號的特殊配置

**步驟**：
1. 使用管理員帳號登入（q689594）
2. 檢查等級、稱號、勳章

**預期結果**：
- ✅ activity_level = 99
- ✅ title = '至高無上'
- ✅ title_color = '#FF0000'
- ✅ activity_points = 999999
- ✅ 已解鎖 5 個管理員特殊勳章

**SQL 驗證**：
```sql
-- 檢查管理員統計
SELECT 
  activity_points,
  activity_level,
  title,
  title_color
FROM member_statistics
WHERE user_id = (SELECT user_id FROM members WHERE account = 'q689594');

-- 檢查管理員勳章
SELECT 
  mb.badge_key,
  bc.badge_name,
  bc.difficulty
FROM member_badges mb
JOIN badge_config bc ON mb.badge_key = bc.badge_key
WHERE mb.user_id = (SELECT user_id FROM members WHERE account = 'q689594')
ORDER BY bc.display_order;
```

---

## 📊 測試檢查清單

### 功能測試
- [ ] 上傳債務資料獲得 +2 點
- [ ] 查詢債務資料獲得 +1 點
- [ ] 每日登入獲得 +3 點
- [ ] 按讚獲得 +1 點（給讚者）
- [ ] 收讚獲得 +3 點（被讚者）
- [ ] 取消按讚扣除點數

### 限制測試
- [ ] 上傳每日上限 10 次
- [ ] 查詢每日上限 20 次
- [ ] 按讚每日上限 5 次
- [ ] 每日登入只能獲得 1 次點數
- [ ] 不能給自己按讚
- [ ] 不能重複按讚

### 升級測試
- [ ] 達到點數後自動升級
- [ ] 等級資訊正確更新
- [ ] 配額獎勵正確累加

### 勳章測試
- [ ] 首次上傳解鎖勳章
- [ ] 首次查詢解鎖勳章
- [ ] 達到條件自動解鎖勳章
- [ ] 管理員特殊勳章正確配置

### 資料完整性
- [ ] activity_point_history 正確記錄
- [ ] member_statistics 正確更新
- [ ] member_badges 正確插入
- [ ] 連續登入天數正確計算

---

## 🐛 常見問題排解

### 問題 1：fetch 呼叫失敗

**症狀**：活躍度點數沒有新增

**原因**：NEXT_PUBLIC_APP_URL 環境變數未設定

**解決方案**：
```bash
# 在 .env.local 中新增
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 重新啟動開發伺服器
npm run dev
```

### 問題 2：等級沒有自動升級

**症狀**：點數增加但等級沒有更新

**原因**：calculate_member_level 函數可能有問題

**解決方案**：
```sql
-- 手動呼叫函數測試
SELECT * FROM calculate_member_level(
  (SELECT user_id FROM members WHERE account = 'member001')
);
```

### 問題 3：勳章沒有自動解鎖

**症狀**：達到條件但勳章沒有解鎖

**原因**：解鎖條件可能不正確

**解決方案**：
```sql
-- 檢查勳章配置
SELECT 
  badge_key,
  badge_name,
  unlock_condition,
  is_active
FROM badge_config
WHERE is_active = TRUE;
```

---

**測試完成後，請回報測試結果！** 🚀

