# 區域統計系統 - 快速開始指南

## 🚀 5 分鐘快速測試

### 步驟 1：執行 SQL 設定（2 分鐘）

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製並執行以下 SQL：

```sql
-- 建立 system_config 表（如果不存在）
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入 display_overrides 配置
INSERT INTO system_config (key, value, description)
VALUES (
  'display_overrides',
  '{"北北基宜": 0, "桃竹苗": 0, "中彰投": 0, "雲嘉南": 0, "高屏澎": 0, "花東": 0}'::jsonb,
  '各小區的展示數據增量配置（灌水量）'
)
ON CONFLICT (key) DO NOTHING;

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_system_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_config_updated_at ON system_config;
CREATE TRIGGER trigger_update_system_config_updated_at
  BEFORE UPDATE ON system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_system_config_updated_at();

-- 授予權限
GRANT SELECT ON system_config TO authenticated;
GRANT UPDATE ON system_config TO authenticated;

-- 建立 RLS 政策
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to read system_config" ON system_config;
CREATE POLICY "Allow authenticated users to read system_config"
  ON system_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admins to update system_config" ON system_config;
CREATE POLICY "Allow admins to update system_config"
  ON system_config FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );
```

4. 驗證配置：
```sql
SELECT * FROM system_config WHERE key = 'display_overrides';
```

✅ 應該看到一筆記錄，value 為 `{"北北基宜": 0, "桃竹苗": 0, ...}`

---

### 步驟 2：啟動開發伺服器（1 分鐘）

```bash
npm run dev
```

等待伺服器啟動完成。

---

### 步驟 3：測試會員 Dashboard（1 分鐘）

1. 打開瀏覽器訪問 http://localhost:3000
2. 使用會員帳號登入：
   - 帳號：`member001`
   - 密碼：`Test1234!`
3. 查看 Dashboard 頁面

✅ 應該看到：
- **區域統計**區塊（在個人統計上方）
- 全台債務筆數（大字體）
- 4 大區橫向排列（北部、中部、南部、東部）

---

### 步驟 4：測試管理員 Dashboard（1 分鐘）

1. 登出會員帳號
2. 使用管理員帳號登入：
   - 帳號：`q689594`
   - 密碼：`q6969520`
3. 訪問 http://localhost:3000/admin/dashboard

✅ 應該看到：
- **區域統計對比（6 小區）**區塊
- 6 小區對比表格（實際、灌水量、展示）
- 調整按鈕（- 和 +）
- 4 大區統計（會員視角）

---

### 步驟 5：測試調整灌水量（1 分鐘）

1. 在管理員 Dashboard 的「區域統計對比」區塊
2. 點擊「北北基宜」的 `+` 按鈕 3 次
3. 點擊「花東」的 `+` 按鈕 5 次
4. 點擊「儲存變更」按鈕
5. 等待儲存完成

✅ 應該看到：
- 灌水量已更新
- 展示數據已更新
- 「儲存變更」按鈕消失

6. 登出管理員帳號
7. 使用會員帳號登入
8. 查看 Dashboard

✅ 應該看到：
- 全台筆數增加了 8（3 + 5）
- 北部筆數增加了 3
- 東部筆數增加了 5

---

## 🎉 完成！

恭喜！你已經成功測試了區域統計系統的核心功能：
- ✅ 會員看到 4 大區的展示數據
- ✅ 管理員看到 6 小區的實際數據和灌水量
- ✅ 管理員可以調整灌水量
- ✅ 會員看到更新後的展示數據

---

## 📋 下一步

### 詳細測試
請參考 `REGION_STATS_TESTING_GUIDE.md` 進行完整測試。

### 查看實作細節
請參考 `REGION_STATS_IMPLEMENTATION_REPORT.md` 了解實作細節。

### 遇到問題？
請檢查：
1. SQL 是否執行成功
2. 瀏覽器 Console 是否有錯誤
3. Network 面板的 API 回應

---

## 🐛 常見問題

### Q1: 區域統計顯示為 0
**解決方法**：
1. 確認資料庫中有債務記錄
2. 確認會員的 `business_region` 欄位不為空
3. 執行以下 SQL 檢查：
```sql
SELECT m.business_region, COUNT(d.id)
FROM debt_records d
JOIN members m ON d.uploaded_by = m.user_id
WHERE d.deleted_at IS NULL
GROUP BY m.business_region;
```

### Q2: 灌水量無法儲存
**解決方法**：
1. 確認 SQL 已執行成功
2. 確認使用管理員帳號登入
3. 檢查瀏覽器 Console 的錯誤訊息

### Q3: 會員看不到區域統計
**解決方法**：
1. 檢查瀏覽器 Console 是否有錯誤
2. 檢查 Network 面板的 `/api/region/stats` 回應
3. 確認已登入

---

**祝測試順利！** 🚀

