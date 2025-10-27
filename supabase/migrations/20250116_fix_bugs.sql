-- ============================================
-- 修正按讚數顯示和查詢重複扣點問題
-- 日期：2025-01-16
-- ============================================

-- 1. 更新 debt_records_masked 視圖，加入 likes_count 欄位
-- 原因：查詢頁面使用此視圖，但視圖缺少 likes_count 欄位導致按讚數無法顯示
CREATE OR REPLACE VIEW debt_records_masked AS
SELECT 
    id,
    mask_name(debtor_name::text) AS debtor_name,
    mask_id(debtor_id_full::text) AS debtor_id_full,
    mask_phone(debtor_phone::text) AS debtor_phone,
    gender,
    profession,
    residence,
    debt_date,
    face_value,
    payment_frequency,
    repayment_status,
    note,
    uploaded_by,
    created_at,
    updated_at,
    debtor_id_first_letter,
    debtor_id_last5,
    likes_count  -- 新增：按讚數欄位
FROM debt_records;

-- 2. 驗證觸發器存在（按讚數自動更新）
-- 此觸發器應該已經存在，這裡只是確認
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_debt_record_likes_count'
    ) THEN
        RAISE EXCEPTION '錯誤：按讚數更新觸發器不存在！';
    END IF;
END $$;

-- 3. 註解說明
COMMENT ON VIEW debt_records_masked IS '債務記錄遮罩視圖（包含按讚數）- 用於查詢頁面顯示';
COMMENT ON COLUMN debt_records_masked.likes_count IS '按讚數 - 由觸發器自動更新';

