-- ============================================
-- 更新遮罩函數：增加遮罩位數
-- 日期：2025-02-04
-- 說明：將身分證和手機號碼的遮罩位數增加，提供更好的隱私保護
-- ============================================

-- 1. 更新 mask_id 函數：中間遮罩從 4 個星號改為 5 個星號
-- 原本：A12****345 (前3碼 + 4個* + 後3碼)
-- 修改後：A12*****45 (前3碼 + 5個* + 後3碼)
CREATE OR REPLACE FUNCTION public.mask_id(id_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    IF id_number IS NULL OR LENGTH(id_number) < 6 THEN
        RETURN id_number;
    END IF;
    RETURN SUBSTRING(id_number, 1, 3) || '*****' || SUBSTRING(id_number, LENGTH(id_number) - 2, 3);
END;
$function$;

-- 2. 更新 mask_phone 函數：中間遮罩從 3 個星號改為 4 個星號
-- 原本：0912***678 (前4碼 + 3個* + 後3碼)
-- 修改後：0912****78 (前4碼 + 4個* + 後3碼)
CREATE OR REPLACE FUNCTION public.mask_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    IF phone IS NULL OR LENGTH(phone) < 7 THEN
        RETURN phone;
    END IF;
    RETURN SUBSTRING(phone, 1, 4) || '****' || SUBSTRING(phone, LENGTH(phone) - 2, 3);
END;
$function$;

-- 3. 註解說明
COMMENT ON FUNCTION public.mask_id(text) IS '身分證遮罩函數 - 保留前3碼和後3碼，中間5個星號';
COMMENT ON FUNCTION public.mask_phone(text) IS '手機號碼遮罩函數 - 保留前4碼和後3碼，中間4個星號';

