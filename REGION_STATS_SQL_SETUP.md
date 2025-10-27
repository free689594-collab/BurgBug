# 區域統計系統 - SQL 設定指南

## 執行步驟

請在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL：

### 步驟 1：建立 system_config 表和 display_overrides 配置

```sql
-- 建立展示數據（灌水）配置
-- 在 system_config 表中新增 display_overrides 配置

-- 檢查 system_config 表是否存在，如果不存在則建立
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入 display_overrides 配置（如果不存在）
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

-- 所有已登入使用者可以讀取配置
DROP POLICY IF EXISTS "Allow authenticated users to read system_config" ON system_config;
CREATE POLICY "Allow authenticated users to read system_config"
  ON system_config
  FOR SELECT
  TO authenticated
  USING (true);

-- 只有管理員可以更新配置
DROP POLICY IF EXISTS "Allow admins to update system_config" ON system_config;
CREATE POLICY "Allow admins to update system_config"
  ON system_config
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );
```

### 步驟 2：驗證配置是否建立成功

```sql
-- 查詢 display_overrides 配置
SELECT * FROM system_config WHERE key = 'display_overrides';

-- 應該看到類似以下的結果：
-- key: display_overrides
-- value: {"北北基宜": 0, "桃竹苗": 0, "中彰投": 0, "雲嘉南": 0, "高屏澎": 0, "花東": 0}
-- description: 各小區的展示數據增量配置（灌水量）
```

### 步驟 3：測試更新配置（可選）

```sql
-- 測試更新灌水量
UPDATE system_config
SET value = '{"北北基宜": 3, "桃竹苗": 1, "中彰投": 0, "雲嘉南": 2, "高屏澎": 0, "花東": 4}'::jsonb
WHERE key = 'display_overrides';

-- 查詢確認
SELECT * FROM system_config WHERE key = 'display_overrides';
```

## 注意事項

1. **權限設定**：
   - 所有已登入使用者可以讀取配置
   - 只有管理員可以更新配置

2. **資料格式**：
   - 使用 JSONB 格式儲存
   - 鍵值必須是 6 個小區名稱
   - 數值必須是整數（0-50）

3. **即時生效**：
   - 更新配置後立即生效
   - 不需要重啟系統

## 常見問題

### Q1: 如何重置所有灌水量為 0？
```sql
UPDATE system_config
SET value = '{"北北基宜": 0, "桃竹苗": 0, "中彰投": 0, "雲嘉南": 0, "高屏澎": 0, "花東": 0}'::jsonb
WHERE key = 'display_overrides';
```

### Q2: 如何查看當前的灌水量設定？
```sql
SELECT value FROM system_config WHERE key = 'display_overrides';
```

### Q3: 如何只更新特定區域的灌水量？
```sql
-- 使用 jsonb_set 函數
UPDATE system_config
SET value = jsonb_set(value, '{北北基宜}', '5')
WHERE key = 'display_overrides';
```

---

**執行完成後，請繼續進行 API 開發步驟。**

