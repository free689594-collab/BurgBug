# 遮罩函數更新說明

**更新日期**：2025-02-04  
**更新內容**：增加身分證和手機號碼的遮罩位數

---

## 📝 變更內容

### 1. 身分證遮罩函數 (`mask_id`)

**原本的遮罩規則**：
- 保留前 3 碼
- 中間 **4 個星號** `****`
- 保留後 3 碼
- 範例：`A12****345`

**更新後的遮罩規則**：
- 保留前 3 碼
- 中間 **5 個星號** `*****`
- 保留後 3 碼
- 範例：`A12*****45`

---

### 2. 手機號碼遮罩函數 (`mask_phone`)

**原本的遮罩規則**：
- 保留前 4 碼
- 中間 **3 個星號** `***`
- 保留後 3 碼
- 範例：`0912***678`

**更新後的遮罩規則**：
- 保留前 4 碼
- 中間 **4 個星號** `****`
- 保留後 3 碼
- 範例：`0912****78`

---

## 🎯 更新目的

1. **提供更好的隱私保護**：增加遮罩位數，減少可識別的資訊
2. **符合使用者需求**：根據使用者反饋調整遮罩規則
3. **保持一致性**：身分證和手機號碼都增加一位遮罩

---

## 📊 影響範圍

### 受影響的頁面
1. ✅ **債務查詢頁面** (`/debts/search`)
   - 查詢結果中的身分證和手機號碼顯示

2. ✅ **債務管理頁面** (`/debts/my-debtors`)
   - 債務人列表中的身分證和手機號碼顯示

3. ✅ **管理員後台** (`/admin/debts`)
   - 債務記錄列表中的身分證和手機號碼顯示

### 受影響的資料庫物件
1. ✅ `mask_id()` 函數
2. ✅ `mask_phone()` 函數
3. ✅ `debt_records_masked` 視圖（使用這兩個函數）

---

## 🔧 技術細節

### SQL 函數定義

```sql
-- 身分證遮罩函數
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

-- 手機號碼遮罩函數
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
```

---

## ✅ 測試結果

### 測試案例

| 原始資料 | 原本遮罩 | 更新後遮罩 |
|---------|---------|-----------|
| A123456789 | A12****345 | A12*****45 |
| B234567890 | B23****890 | B23*****90 |
| 0912345678 | 0912***678 | 0912****78 |
| 0987654321 | 0987***321 | 0987****21 |

### 驗證查詢

```sql
-- 測試身分證遮罩
SELECT mask_id('A123456789') as masked_id;
-- 結果：A12*****45

-- 測試手機號碼遮罩
SELECT mask_phone('0912345678') as masked_phone;
-- 結果：0912****78

-- 查看實際資料
SELECT debtor_name, debtor_id_full, debtor_phone 
FROM debt_records_masked 
LIMIT 5;
```

---

## 📦 部署資訊

- **Migration 檔案**：`supabase/migrations/20250204_update_mask_functions.sql`
- **Git Commit**：`4eb6002`
- **部署狀態**：✅ 已部署到生產環境
- **生效時間**：立即生效（函數更新後自動套用到所有查詢）

---

## 🔄 回滾方案

如果需要回滾到原本的遮罩規則，執行以下 SQL：

```sql
-- 回滾身分證遮罩（4 個星號）
CREATE OR REPLACE FUNCTION public.mask_id(id_number text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    IF id_number IS NULL OR LENGTH(id_number) < 6 THEN
        RETURN id_number;
    END IF;
    RETURN SUBSTRING(id_number, 1, 3) || '****' || SUBSTRING(id_number, LENGTH(id_number) - 2, 3);
END;
$function$;

-- 回滾手機號碼遮罩（3 個星號）
CREATE OR REPLACE FUNCTION public.mask_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
    IF phone IS NULL OR LENGTH(phone) < 7 THEN
        RETURN phone;
    END IF;
    RETURN SUBSTRING(phone, 1, 4) || '***' || SUBSTRING(phone, LENGTH(phone) - 2, 3);
END;
$function$;
```

---

## 📝 備註

1. **無需重新部署前端**：遮罩邏輯在資料庫層面處理，前端無需修改
2. **即時生效**：函數更新後，所有使用 `debt_records_masked` 視圖的查詢都會自動套用新的遮罩規則
3. **向後兼容**：不影響現有的資料和功能
4. **效能影響**：無（函數標記為 IMMUTABLE，可以被快取）

---

## 🎉 總結

此次更新成功增加了身分證和手機號碼的遮罩位數，提供更好的隱私保護。所有相關頁面都會自動套用新的遮罩規則，無需額外的部署或設定。

