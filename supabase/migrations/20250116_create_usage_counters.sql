-- 創建使用配額表 (usage_counters)
-- 用於記錄每位用戶每日的上傳、查詢、按讚次數

-- 1. 創建 usage_counters 表（如果不存在）
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  uploads_count INTEGER NOT NULL DEFAULT 0,
  queries_count INTEGER NOT NULL DEFAULT 0,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- 2. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_id ON usage_counters(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_date ON usage_counters(date);

-- 3. 創建更新 updated_at 的觸發器函數
CREATE OR REPLACE FUNCTION update_usage_counters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 創建觸發器
DROP TRIGGER IF EXISTS trigger_update_usage_counters_updated_at ON usage_counters;
CREATE TRIGGER trigger_update_usage_counters_updated_at
BEFORE UPDATE ON usage_counters
FOR EACH ROW
EXECUTE FUNCTION update_usage_counters_updated_at();

-- 5. 啟用 RLS
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- 6. 創建 RLS 政策
-- 會員只能查看自己的配額記錄
CREATE POLICY "會員可以查看自己的配額記錄"
ON usage_counters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 管理員可以查看所有配額記錄
CREATE POLICY "管理員可以查看所有配額記錄"
ON usage_counters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 7. 添加註解
COMMENT ON TABLE usage_counters IS '使用配額表：記錄每位用戶每日的上傳、查詢、按讚次數';
COMMENT ON COLUMN usage_counters.user_id IS '使用者 ID';
COMMENT ON COLUMN usage_counters.date IS '日期（台灣時區）';
COMMENT ON COLUMN usage_counters.uploads_count IS '當日上傳次數';
COMMENT ON COLUMN usage_counters.queries_count IS '當日查詢次數';
COMMENT ON COLUMN usage_counters.likes_count IS '當日按讚次數';

