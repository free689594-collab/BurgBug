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

-- 授予執行權限
GRANT EXECUTE ON FUNCTION get_upload_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_query_ranking(UUID) TO authenticated;

