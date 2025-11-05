-- 新增私密欄位和備註時間軸功能
-- 用於「我的債務人管理」改版

-- 1. 在 debt_records 表新增私密欄位（僅上傳者可見）
ALTER TABLE debt_records
ADD COLUMN IF NOT EXISTS settled_amount DECIMAL(15,2), -- 結清金額
ADD COLUMN IF NOT EXISTS recovered_amount DECIMAL(15,2), -- 已收回金額
ADD COLUMN IF NOT EXISTS bad_debt_amount DECIMAL(15,2), -- 呆帳金額
ADD COLUMN IF NOT EXISTS internal_rating INTEGER CHECK (internal_rating >= 1 AND internal_rating <= 5); -- 內部評價（1-5星）

-- 2. 為私密欄位新增註解
COMMENT ON COLUMN debt_records.settled_amount IS '結清金額（私密欄位，僅上傳者可見）';
COMMENT ON COLUMN debt_records.recovered_amount IS '已收回金額（私密欄位，僅上傳者可見）';
COMMENT ON COLUMN debt_records.bad_debt_amount IS '呆帳金額（私密欄位，僅上傳者可見）';
COMMENT ON COLUMN debt_records.internal_rating IS '內部評價 1-5星（私密欄位，僅上傳者可見）';

-- 3. 創建備註時間軸表
CREATE TABLE IF NOT EXISTS debt_record_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_record_id UUID NOT NULL REFERENCES debt_records(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- 索引：加速查詢特定債務記錄的備註
  CONSTRAINT fk_debt_record FOREIGN KEY (debt_record_id) REFERENCES debt_records(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. 為 debt_record_notes 表新增註解
COMMENT ON TABLE debt_record_notes IS '債務記錄備註時間軸（僅上傳者可見）';
COMMENT ON COLUMN debt_record_notes.id IS '備註 ID';
COMMENT ON COLUMN debt_record_notes.debt_record_id IS '債務記錄 ID';
COMMENT ON COLUMN debt_record_notes.user_id IS '建立備註的使用者 ID（必須是債務記錄的上傳者）';
COMMENT ON COLUMN debt_record_notes.content IS '備註內容';
COMMENT ON COLUMN debt_record_notes.created_at IS '建立時間';
COMMENT ON COLUMN debt_record_notes.updated_at IS '更新時間';

-- 5. 創建索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_debt_record_notes_debt_record_id ON debt_record_notes(debt_record_id);
CREATE INDEX IF NOT EXISTS idx_debt_record_notes_user_id ON debt_record_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_record_notes_created_at ON debt_record_notes(created_at DESC);

-- 6. 啟用 RLS
ALTER TABLE debt_record_notes ENABLE ROW LEVEL SECURITY;

-- 7. 創建 RLS 政策：只有債務記錄的上傳者可以查看和新增備註

-- 查看備註：只能查看自己上傳的債務記錄的備註
CREATE POLICY "上傳者可以查看自己債務記錄的備註"
ON debt_record_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM debt_records
    WHERE debt_records.id = debt_record_notes.debt_record_id
    AND debt_records.uploaded_by = auth.uid()
  )
);

-- 新增備註：只能為自己上傳的債務記錄新增備註
CREATE POLICY "上傳者可以為自己的債務記錄新增備註"
ON debt_record_notes
FOR INSERT
TO authenticated
WITH CHECK (
  -- 確保 user_id 是當前使用者
  user_id = auth.uid()
  AND
  -- 確保債務記錄是當前使用者上傳的
  EXISTS (
    SELECT 1 FROM debt_records
    WHERE debt_records.id = debt_record_notes.debt_record_id
    AND debt_records.uploaded_by = auth.uid()
  )
);

-- 更新備註：只能更新自己建立的備註
CREATE POLICY "上傳者可以更新自己的備註"
ON debt_record_notes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 刪除備註：只能刪除自己建立的備註
CREATE POLICY "上傳者可以刪除自己的備註"
ON debt_record_notes
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- 8. 創建觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_debt_record_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_debt_record_notes_updated_at
BEFORE UPDATE ON debt_record_notes
FOR EACH ROW
EXECUTE FUNCTION update_debt_record_notes_updated_at();

-- 9. 管理員政策：管理員可以查看所有備註（但不能修改）
CREATE POLICY "管理員可以查看所有備註"
ON debt_record_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'super_admin')
  )
);

