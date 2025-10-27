# 階段 B：統計數據系統 - SQL 設定指南

## 需要執行的 SQL

請在 Supabase Dashboard 的 SQL Editor 中執行以下 SQL：

### 1. 建立會員上傳排名函數

```sql
-- 建立會員上傳排名函數
CREATE OR REPLACE FUNCTION get_upload_ranking(target_user_id UUID)
RETURNS TABLE (
  rank BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      user_id,
      uploads_count,
      ROW_NUMBER() OVER (ORDER BY uploads_count DESC, user_id) as user_rank
    FROM member_statistics
    WHERE uploads_count > 0
  ),
  target_rank AS (
    SELECT user_rank as rank
    FROM ranked_users
    WHERE user_id = target_user_id
  ),
  total AS (
    SELECT COUNT(*) as total_users
    FROM ranked_users
  )
  SELECT 
    COALESCE(target_rank.rank, 0) as rank,
    total.total_users
  FROM total
  LEFT JOIN target_rank ON true;
END;
$$ LANGUAGE plpgsql;
```

### 2. 建立會員查詢排名函數

```sql
-- 建立會員查詢排名函數
CREATE OR REPLACE FUNCTION get_query_ranking(target_user_id UUID)
RETURNS TABLE (
  rank BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked_users AS (
    SELECT 
      user_id,
      queries_count,
      ROW_NUMBER() OVER (ORDER BY queries_count DESC, user_id) as user_rank
    FROM member_statistics
    WHERE queries_count > 0
  ),
  target_rank AS (
    SELECT user_rank as rank
    FROM ranked_users
    WHERE user_id = target_user_id
  ),
  total AS (
    SELECT COUNT(*) as total_users
    FROM ranked_users
  )
  SELECT 
    COALESCE(target_rank.rank, 0) as rank,
    total.total_users
  FROM total
  LEFT JOIN target_rank ON true;
END;
$$ LANGUAGE plpgsql;
```

### 3. 授予執行權限

```sql
-- 授予執行權限
GRANT EXECUTE ON FUNCTION get_upload_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_ranking(UUID) TO authenticated;
```

## 執行步驟

1. 登入 Supabase Dashboard
2. 選擇專案：GoGoMay
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製上面的 SQL 並貼上
6. 點擊「Run」執行

## 驗證

執行以下 SQL 驗證函數是否建立成功：

```sql
-- 測試上傳排名函數
SELECT * FROM get_upload_ranking('your-user-id-here');

-- 測試查詢排名函數
SELECT * FROM get_query_ranking('your-user-id-here');
```

應該會回傳類似以下的結果：
```
rank | total_users
-----|------------
  1  |     10
```

## 注意事項

- 這些函數依賴 `member_statistics` 表
- 排名是根據 `uploads_count` 和 `queries_count` 欄位計算
- 只有統計數據大於 0 的會員才會被納入排名
- 如果會員沒有任何上傳或查詢記錄，排名會是 0

