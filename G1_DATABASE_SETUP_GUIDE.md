# 階段 G.1：資料庫設計與初始化 - 執行指南

**版本**：v1.0  
**日期**：2025-01-15  
**預估時間**：30-60 分鐘

---

## 📋 執行清單

- [ ] 1. 建立資料表和函數
- [ ] 2. 插入等級配置資料
- [ ] 3. 插入勳章配置資料
- [ ] 4. 插入活躍度點數規則
- [ ] 5. 設定管理員特殊配置
- [ ] 6. 執行測試腳本
- [ ] 7. 驗證結果

---

## 🚀 執行步驟

### 步驟 1：建立資料表和函數（5 分鐘）

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 點擊「New query」
4. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_create_level_and_badge_system.sql
```

**預期結果**：
- ✅ 建立 5 個資料表（level_config, badge_config, activity_point_rules, member_badges, activity_point_history）
- ✅ 新增 9 個欄位到 member_statistics
- ✅ 建立 1 個資料庫函數（calculate_member_level）

---

### 步驟 2：插入等級配置資料（2 分鐘）

1. 在 SQL Editor 中點擊「New query」
2. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_insert_level_data.sql
```

**預期結果**：
- ✅ 插入 30 個等級配置（LV1-LV30）
- ✅ 插入 1 個管理員等級（LV99）

---

### 步驟 3：插入勳章配置資料（3 分鐘）

1. 在 SQL Editor 中點擊「New query」
2. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_insert_badge_data.sql
```

**預期結果**：
- ✅ 插入 5 個簡單勳章
- ✅ 插入 7 個中等勳章
- ✅ 插入 7 個困難勳章
- ✅ 插入 7 個極難勳章
- ✅ 插入 3 個特殊/隱藏勳章
- ✅ 插入 5 個管理員特殊勳章

---

### 步驟 4：插入活躍度點數規則（1 分鐘）

1. 在 SQL Editor 中點擊「New query」
2. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_insert_activity_rules.sql
```

**預期結果**：
- ✅ 插入 5 個活躍度點數規則（upload, query, like_received, like_given, daily_login）

---

### 步驟 5：設定管理員特殊配置（1 分鐘）

**注意**：此步驟需要在管理員帳號 `q689594` 已經註冊後執行。如果尚未註冊，請先註冊後再執行此步驟。

1. 在 SQL Editor 中點擊「New query」
2. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_setup_admin_special_config.sql
```

**預期結果**：
- ✅ 管理員帳號設定為 LV99
- ✅ 管理員帳號解鎖 5 個特殊勳章

**如果管理員帳號尚未註冊**：
- 系統會顯示：「管理員帳號 q689594 尚未註冊，跳過特殊配置」
- 請在管理員註冊後，再次執行此腳本

---

### 步驟 6：執行測試腳本（2 分鐘）

1. 在 SQL Editor 中點擊「New query」
2. 複製並執行以下檔案的內容：

```
supabase/migrations/20250115_test_level_system.sql
```

**預期結果**：
- ✅ 測試 1 通過：所有 5 個資料表已建立成功
- ✅ 測試 2 通過：member_statistics 所有 9 個欄位已新增成功
- ✅ 測試 3 通過：已插入 31 個等級配置
- ✅ 測試 4 通過：已插入 32 個勳章配置
- ✅ 測試 5 通過：已插入 5 個活躍度點數規則
- ✅ 測試 6 通過：calculate_member_level 函數已建立成功
- ✅ 測試 7 通過：LV99 管理員等級已建立成功
- ✅ 測試 8 通過：已建立 5 個管理員特殊勳章

---

### 步驟 7：驗證結果（5 分鐘）

#### 7.1 檢查資料表

執行以下 SQL 查詢：

```sql
-- 檢查所有資料表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'level_config',
    'badge_config',
    'activity_point_rules',
    'member_badges',
    'activity_point_history'
  )
ORDER BY table_name;
```

**預期結果**：應該顯示 5 個資料表

---

#### 7.2 檢查等級配置

執行以下 SQL 查詢：

```sql
-- 檢查等級配置
SELECT level, title, required_points, title_color, bonus_upload_quota, bonus_query_quota
FROM level_config
WHERE level IN (1, 5, 10, 15, 20, 25, 30, 99)
ORDER BY level;
```

**預期結果**：應該顯示 8 個等級（LV1, 5, 10, 15, 20, 25, 30, 99）

---

#### 7.3 檢查勳章配置

執行以下 SQL 查詢：

```sql
-- 檢查勳章配置統計
SELECT 
  difficulty AS 難度,
  COUNT(*) AS 數量,
  COUNT(CASE WHEN is_hidden THEN 1 END) AS 隱藏數量
FROM badge_config
GROUP BY difficulty
ORDER BY 
  CASE difficulty
    WHEN 'easy' THEN 1
    WHEN 'medium' THEN 2
    WHEN 'hard' THEN 3
    WHEN 'extreme' THEN 4
    WHEN 'special' THEN 5
  END;
```

**預期結果**：
- easy: 5 個（0 個隱藏）
- medium: 7 個（3 個隱藏）
- hard: 7 個（0 個隱藏）
- extreme: 7 個（0 個隱藏）
- special: 5 個（1 個隱藏）

---

#### 7.4 檢查活躍度點數規則

執行以下 SQL 查詢：

```sql
-- 檢查活躍度點數規則
SELECT action, points, max_daily_count, cooldown_seconds
FROM activity_point_rules
ORDER BY points DESC;
```

**預期結果**：應該顯示 5 個規則

---

#### 7.5 檢查管理員配置（如果已註冊）

執行以下 SQL 查詢：

```sql
-- 檢查管理員配置
SELECT 
  m.account,
  ms.activity_level,
  ms.title,
  ms.title_color,
  ms.activity_points,
  ms.total_upload_quota_bonus,
  ms.total_query_quota_bonus
FROM members m
JOIN member_statistics ms ON m.user_id = ms.user_id
WHERE m.account = 'q689594';
```

**預期結果**（如果管理員已註冊）：
- activity_level: 99
- title: 至高無上
- title_color: #FF0000
- activity_points: 999999
- total_upload_quota_bonus: 9999
- total_query_quota_bonus: 9999

---

#### 7.6 檢查管理員勳章（如果已註冊）

執行以下 SQL 查詢：

```sql
-- 檢查管理員勳章
SELECT 
  bc.badge_name,
  bc.difficulty,
  mb.unlocked_at
FROM member_badges mb
JOIN badge_config bc ON mb.badge_key = bc.badge_key
JOIN members m ON mb.user_id = m.user_id
WHERE m.account = 'q689594'
ORDER BY mb.display_order;
```

**預期結果**（如果管理員已註冊）：應該顯示 5 個特殊勳章

---

## ✅ 完成確認

當所有測試都通過後，階段 G.1 完成！

**已完成的項目**：
- ✅ 建立 5 個資料表
- ✅ 新增 9 個欄位到 member_statistics
- ✅ 建立 1 個資料庫函數
- ✅ 插入 31 個等級配置（LV1-LV30 + LV99）
- ✅ 插入 32 個勳章配置（27 個一般 + 5 個管理員）
- ✅ 插入 5 個活躍度點數規則
- ✅ 設定管理員特殊配置（如果已註冊）

---

## 🔄 下一步

完成階段 G.1 後，請繼續執行：

**階段 G.2：活躍度點數計算邏輯**（預估 1-2 天）
- 建立點數計算 API
- 整合到現有功能
- 實作每日上限檢查
- 實作點數歷史記錄

---

## 🐛 常見問題

### Q1：執行 SQL 時出現「relation already exists」錯誤

**解決方法**：這表示資料表已經存在。可以忽略此錯誤，或者先刪除資料表再重新執行。

```sql
-- 刪除所有資料表（謹慎使用！）
DROP TABLE IF EXISTS activity_point_history CASCADE;
DROP TABLE IF EXISTS member_badges CASCADE;
DROP TABLE IF EXISTS activity_point_rules CASCADE;
DROP TABLE IF EXISTS badge_config CASCADE;
DROP TABLE IF EXISTS level_config CASCADE;
```

---

### Q2：管理員帳號尚未註冊，如何設定特殊配置？

**解決方法**：
1. 先註冊管理員帳號 `q689594`
2. 再次執行 `20250115_setup_admin_special_config.sql`

---

### Q3：如何重置所有會員的等級和勳章？

**解決方法**：

```sql
-- 重置所有會員的等級和勳章
UPDATE member_statistics
SET
  activity_points = 0,
  activity_level = 1,
  title = '初入江湖',
  title_color = '#9CA3AF',
  total_upload_quota_bonus = 0,
  total_query_quota_bonus = 0,
  consecutive_login_days = 0,
  last_login_date = NULL,
  level_updated_at = NULL;

-- 刪除所有會員的勳章
DELETE FROM member_badges;

-- 刪除所有活躍度點數歷史
DELETE FROM activity_point_history;
```

---

## 📞 支援

如果遇到任何問題，請檢查：
1. Supabase Dashboard 的 SQL Editor 是否有錯誤訊息
2. 資料表是否已正確建立
3. 資料是否已正確插入

---

**文件結束**

