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

-- 驗證配置是否建立成功
DO $$
DECLARE
  config_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM system_config WHERE key = 'display_overrides'
  ) INTO config_exists;
  
  IF config_exists THEN
    RAISE NOTICE 'display_overrides 配置建立成功';
  ELSE
    RAISE EXCEPTION 'display_overrides 配置建立失敗';
  END IF;
END $$;

