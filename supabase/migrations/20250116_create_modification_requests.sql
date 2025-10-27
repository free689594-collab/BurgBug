-- =====================================================
-- 資料修改申請系統
-- 創建日期：2025-01-16
-- 用途：會員資料修改申請和債務資料修改申請
-- =====================================================

-- 1. 創建修改申請狀態 ENUM
DO $$ BEGIN
  CREATE TYPE mod_request_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. 創建會員資料修改申請表
CREATE TABLE IF NOT EXISTS profile_modification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'nickname', 'business_type', 'business_region'
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    reason TEXT,
    status mod_request_status DEFAULT 'pending',
    admin_id UUID REFERENCES members(user_id) ON DELETE SET NULL,
    admin_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 3. 創建債務資料修改申請表
CREATE TABLE IF NOT EXISTS debt_modification_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_record_id UUID NOT NULL REFERENCES debt_records(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL, -- 修改的欄位名稱
    old_value TEXT NOT NULL,
    new_value TEXT NOT NULL,
    reason TEXT,
    status mod_request_status DEFAULT 'pending',
    admin_id UUID REFERENCES members(user_id) ON DELETE SET NULL,
    admin_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 4. 創建索引
CREATE INDEX IF NOT EXISTS idx_profile_mod_user_id ON profile_modification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_mod_status ON profile_modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_profile_mod_created_at ON profile_modification_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_debt_mod_debt_id ON debt_modification_requests(debt_record_id);
CREATE INDEX IF NOT EXISTS idx_debt_mod_user_id ON debt_modification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_mod_status ON debt_modification_requests(status);
CREATE INDEX IF NOT EXISTS idx_debt_mod_created_at ON debt_modification_requests(created_at DESC);

-- 5. 啟用 RLS
ALTER TABLE profile_modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_modification_requests ENABLE ROW LEVEL SECURITY;

-- 6. 創建 RLS 政策 - 會員資料修改申請

-- 會員可以查看自己的申請
CREATE POLICY "Members can view their own profile modification requests"
ON profile_modification_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 會員可以創建自己的申請
CREATE POLICY "Members can create their own profile modification requests"
ON profile_modification_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 管理員可以查看所有申請
CREATE POLICY "Admins can view all profile modification requests"
ON profile_modification_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 管理員可以更新申請（審核）
CREATE POLICY "Admins can update profile modification requests"
ON profile_modification_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 7. 創建 RLS 政策 - 債務資料修改申請

-- 會員可以查看自己的申請
CREATE POLICY "Members can view their own debt modification requests"
ON debt_modification_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 會員可以創建自己的申請（只能申請修改自己上傳的債務記錄）
CREATE POLICY "Members can create debt modification requests for their own debts"
ON debt_modification_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM debt_records
    WHERE debt_records.id = debt_record_id
    AND debt_records.uploader_id = auth.uid()
  )
);

-- 管理員可以查看所有申請
CREATE POLICY "Admins can view all debt modification requests"
ON debt_modification_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 管理員可以更新申請（審核）
CREATE POLICY "Admins can update debt modification requests"
ON debt_modification_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('super_admin', 'admin')
  )
);

-- 8. 創建觸發器 - 自動更新 updated_at

CREATE OR REPLACE FUNCTION update_modification_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_mod_updated_at
BEFORE UPDATE ON profile_modification_requests
FOR EACH ROW
EXECUTE FUNCTION update_modification_request_updated_at();

CREATE TRIGGER update_debt_mod_updated_at
BEFORE UPDATE ON debt_modification_requests
FOR EACH ROW
EXECUTE FUNCTION update_modification_request_updated_at();

-- 9. 創建觸發器 - 審核時自動設定 reviewed_at

CREATE OR REPLACE FUNCTION set_modification_request_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profile_mod_reviewed_at
BEFORE UPDATE ON profile_modification_requests
FOR EACH ROW
EXECUTE FUNCTION set_modification_request_reviewed_at();

CREATE TRIGGER set_debt_mod_reviewed_at
BEFORE UPDATE ON debt_modification_requests
FOR EACH ROW
EXECUTE FUNCTION set_modification_request_reviewed_at();

-- 10. 創建觸發器 - 核准會員資料修改申請時自動更新會員資料

CREATE OR REPLACE FUNCTION apply_profile_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- 根據 request_type 更新對應的欄位
    IF NEW.request_type = 'nickname' THEN
      UPDATE members SET nickname = NEW.new_value WHERE user_id = NEW.user_id;
    ELSIF NEW.request_type = 'business_type' THEN
      UPDATE members SET business_type = NEW.new_value WHERE user_id = NEW.user_id;
    ELSIF NEW.request_type = 'business_region' THEN
      UPDATE members SET business_region = NEW.new_value WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apply_profile_modification_trigger
AFTER UPDATE ON profile_modification_requests
FOR EACH ROW
EXECUTE FUNCTION apply_profile_modification();

-- 11. 創建觸發器 - 核准債務資料修改申請時自動更新債務記錄

CREATE OR REPLACE FUNCTION apply_debt_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- 使用動態 SQL 更新對應的欄位
    EXECUTE format('UPDATE debt_records SET %I = $1 WHERE id = $2', NEW.field_name)
    USING NEW.new_value, NEW.debt_record_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER apply_debt_modification_trigger
AFTER UPDATE ON debt_modification_requests
FOR EACH ROW
EXECUTE FUNCTION apply_debt_modification();

-- 完成

