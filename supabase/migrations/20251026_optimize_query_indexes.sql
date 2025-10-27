-- 優化查詢 API：建立資料庫索引
-- 目的：加速債務查詢和活躍度查詢
-- 預期效果：回應時間從 3.66 秒降到 < 2 秒

-- ============================================================================
-- 索引 1：debt_records 表的查詢索引
-- ============================================================================

-- 1.1 債務記錄查詢索引（debtor_id_first_letter + debtor_id_last5）
CREATE INDEX IF NOT EXISTS idx_debt_records_search 
ON debt_records(debtor_id_first_letter, debtor_id_last5, created_at DESC);

COMMENT ON INDEX idx_debt_records_search IS 
'加速債務查詢 API 的主要查詢條件（首字母 + 後5碼），並按建立時間降序排序';

-- 1.2 債務記錄查詢索引（加上居住地篩選）
CREATE INDEX IF NOT EXISTS idx_debt_records_search_with_residence 
ON debt_records(debtor_id_first_letter, debtor_id_last5, residence, created_at DESC);

COMMENT ON INDEX idx_debt_records_search_with_residence IS 
'加速債務查詢 API 的查詢條件（首字母 + 後5碼 + 居住地），並按建立時間降序排序';

-- 1.3 債務記錄上傳者索引
CREATE INDEX IF NOT EXISTS idx_debt_records_uploaded_by 
ON debt_records(uploaded_by);

COMMENT ON INDEX idx_debt_records_uploaded_by IS 
'加速查詢上傳者資訊';

-- ============================================================================
-- 索引 2：activity_point_history 表的查詢索引
-- ============================================================================

-- 2.1 活躍度歷史查詢索引（user_id + action + created_at）
CREATE INDEX IF NOT EXISTS idx_activity_point_history_user_action_date 
ON activity_point_history(user_id, action, created_at DESC);

COMMENT ON INDEX idx_activity_point_history_user_action_date IS 
'加速活躍度歷史查詢（檢查重複查詢、計算每日次數）';

-- 2.2 活躍度歷史 metadata 索引（使用 GIN 索引）
CREATE INDEX IF NOT EXISTS idx_activity_point_history_metadata_gin 
ON activity_point_history USING GIN (metadata);

COMMENT ON INDEX idx_activity_point_history_metadata_gin IS 
'加速 metadata 欄位的查詢（例如：檢查是否查詢過相同的身分證資料）';

-- ============================================================================
-- 索引 3：usage_counters 表的查詢索引
-- ============================================================================

-- 3.1 使用配額查詢索引（user_id + day）
CREATE INDEX IF NOT EXISTS idx_usage_counters_user_day 
ON usage_counters(user_id, day);

COMMENT ON INDEX idx_usage_counters_user_day IS 
'加速每日配額查詢';

-- ============================================================================
-- 索引 4：member_statistics 表的查詢索引
-- ============================================================================

-- 4.1 會員統計查詢索引（user_id）
CREATE INDEX IF NOT EXISTS idx_member_statistics_user_id 
ON member_statistics(user_id);

COMMENT ON INDEX idx_member_statistics_user_id IS 
'加速會員統計資訊查詢';

-- ============================================================================
-- 索引 5：debt_record_likes 表的查詢索引
-- ============================================================================

-- 5.1 債務記錄按讚查詢索引（liker_id + debt_record_id）
CREATE INDEX IF NOT EXISTS idx_debt_record_likes_liker_debt 
ON debt_record_likes(liker_id, debt_record_id);

COMMENT ON INDEX idx_debt_record_likes_liker_debt IS 
'加速查詢使用者對債務記錄的按讚狀態';

-- 5.2 債務記錄按讚查詢索引（debt_record_id）
CREATE INDEX IF NOT EXISTS idx_debt_record_likes_debt_record 
ON debt_record_likes(debt_record_id);

COMMENT ON INDEX idx_debt_record_likes_debt_record IS 
'加速查詢債務記錄的按讚數量';

-- ============================================================================
-- 索引 6：member_badges 表的查詢索引
-- ============================================================================

-- 6.1 會員勳章查詢索引（user_id）
CREATE INDEX IF NOT EXISTS idx_member_badges_user_id 
ON member_badges(user_id);

COMMENT ON INDEX idx_member_badges_user_id IS 
'加速查詢會員勳章數量';

-- ============================================================================
-- 分析表統計資訊（讓 PostgreSQL 更好地使用索引）
-- ============================================================================

ANALYZE debt_records;
ANALYZE activity_point_history;
ANALYZE usage_counters;
ANALYZE member_statistics;
ANALYZE debt_record_likes;
ANALYZE member_badges;

-- ============================================================================
-- 驗證索引是否建立成功
-- ============================================================================

-- 查詢所有新建立的索引
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

