-- =====================================================
-- 新增付款方式欄位到 payments 表
-- 建立日期: 2025-11-08
-- 說明: 支援 ATM 虛擬帳號、網路 ATM、超商條碼、超商代碼
-- =====================================================

-- 新增付款方式相關欄位
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),           -- 付款方式：'atm', 'webatm', 'barcode', 'cvs'
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),                -- ATM 銀行代碼
ADD COLUMN IF NOT EXISTS virtual_account VARCHAR(20),          -- ATM 虛擬帳號
ADD COLUMN IF NOT EXISTS barcode_1 VARCHAR(20),                -- 超商條碼第一段
ADD COLUMN IF NOT EXISTS barcode_2 VARCHAR(20),                -- 超商條碼第二段
ADD COLUMN IF NOT EXISTS barcode_3 VARCHAR(20),                -- 超商條碼第三段
ADD COLUMN IF NOT EXISTS payment_no VARCHAR(20),               -- 超商代碼繳費編號
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ,         -- 繳費期限
ADD COLUMN IF NOT EXISTS payment_url TEXT;                     -- 網路 ATM 付款網址

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_payment_deadline ON payments(payment_deadline);

-- 新增約束條件
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS chk_payment_method,
ADD CONSTRAINT chk_payment_method CHECK (
  payment_method IS NULL OR 
  payment_method IN ('atm', 'webatm', 'barcode', 'cvs', 'credit')
);

-- 註解
COMMENT ON COLUMN payments.payment_method IS '付款方式：atm(ATM虛擬帳號), webatm(網路ATM), barcode(超商條碼), cvs(超商代碼), credit(信用卡)';
COMMENT ON COLUMN payments.bank_code IS 'ATM 銀行代碼（例如：013 國泰世華）';
COMMENT ON COLUMN payments.virtual_account IS 'ATM 虛擬帳號';
COMMENT ON COLUMN payments.barcode_1 IS '超商條碼第一段';
COMMENT ON COLUMN payments.barcode_2 IS '超商條碼第二段';
COMMENT ON COLUMN payments.barcode_3 IS '超商條碼第三段';
COMMENT ON COLUMN payments.payment_no IS '超商代碼繳費編號';
COMMENT ON COLUMN payments.payment_deadline IS '繳費期限（ATM/超商）';
COMMENT ON COLUMN payments.payment_url IS '網路 ATM 付款網址';

