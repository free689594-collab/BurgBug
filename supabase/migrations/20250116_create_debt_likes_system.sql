-- 創建債務記錄按讚系統
-- 用於記錄會員對債務資訊的按讚

-- 1. 創建債務記錄按讚表
CREATE TABLE IF NOT EXISTS debt_record_likes (
  id BIGSERIAL PRIMARY KEY,
  debt_record_id UUID NOT NULL REFERENCES debt_records(id) ON DELETE CASCADE,
  liker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 確保同一個使用者不能對同一筆債務記錄按讚多次
  UNIQUE(debt_record_id, liker_id)
);

-- 2. 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_debt_record_likes_debt_record_id ON debt_record_likes(debt_record_id);
CREATE INDEX IF NOT EXISTS idx_debt_record_likes_liker_id ON debt_record_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_debt_record_likes_created_at ON debt_record_likes(created_at);

-- 3. 在 debt_records 表中添加 likes_count 欄位（如果不存在）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'debt_records' AND column_name = 'likes_count'
  ) THEN
    ALTER TABLE debt_records ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 4. 創建觸發器函數：當新增按讚時，更新 debt_records 的 likes_count
CREATE OR REPLACE FUNCTION update_debt_record_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- 新增按讚：likes_count + 1
    UPDATE debt_records
    SET likes_count = likes_count + 1
    WHERE id = NEW.debt_record_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- 刪除按讚：likes_count - 1
    UPDATE debt_records
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.debt_record_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建觸發器
DROP TRIGGER IF EXISTS trigger_update_debt_record_likes_count ON debt_record_likes;
CREATE TRIGGER trigger_update_debt_record_likes_count
AFTER INSERT OR DELETE ON debt_record_likes
FOR EACH ROW
EXECUTE FUNCTION update_debt_record_likes_count();

-- 6. 啟用 RLS
ALTER TABLE debt_record_likes ENABLE ROW LEVEL SECURITY;

-- 7. 創建 RLS 政策

-- 所有已審核會員都可以查看按讚記錄
CREATE POLICY "已審核會員可以查看按讚記錄"
ON debt_record_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.status = 'approved'
  )
);

-- 已審核會員可以新增按讚（但不能給自己上傳的債務記錄按讚）
CREATE POLICY "已審核會員可以新增按讚"
ON debt_record_likes
FOR INSERT
TO authenticated
WITH CHECK (
  -- 確保使用者是已審核會員
  EXISTS (
    SELECT 1 FROM members
    WHERE members.user_id = auth.uid()
    AND members.status = 'approved'
  )
  AND
  -- 確保使用者不是債務記錄的上傳者
  NOT EXISTS (
    SELECT 1 FROM debt_records
    WHERE debt_records.id = debt_record_id
    AND debt_records.uploaded_by = auth.uid()
  )
  AND
  -- 確保 liker_id 是當前使用者
  liker_id = auth.uid()
);

-- 會員可以刪除自己的按讚
CREATE POLICY "會員可以刪除自己的按讚"
ON debt_record_likes
FOR DELETE
TO authenticated
USING (liker_id = auth.uid());

-- 8. 初始化現有債務記錄的 likes_count
UPDATE debt_records
SET likes_count = (
  SELECT COUNT(*)
  FROM debt_record_likes
  WHERE debt_record_likes.debt_record_id = debt_records.id
)
WHERE likes_count = 0;

-- 9. 添加註解
COMMENT ON TABLE debt_record_likes IS '債務記錄按讚表：記錄會員對債務資訊的按讚';
COMMENT ON COLUMN debt_record_likes.debt_record_id IS '債務記錄 ID';
COMMENT ON COLUMN debt_record_likes.liker_id IS '按讚者的使用者 ID';
COMMENT ON COLUMN debt_records.likes_count IS '債務記錄的總按讚數';

