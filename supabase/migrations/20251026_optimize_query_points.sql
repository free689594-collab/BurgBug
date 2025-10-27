-- 優化查詢 API：建立專用的資料庫函數處理查詢活躍度點數
-- 目的：減少 HTTP 呼叫開銷
-- 預期效果：進一步降低回應時間

-- ============================================================================
-- 函數：add_query_points
-- 功能：處理查詢活躍度點數邏輯
-- 參數：
--   p_user_id: 使用者 ID
--   p_metadata: 查詢 metadata (JSONB 格式)
-- 返回：JSONB 格式的結果
-- ============================================================================

CREATE OR REPLACE FUNCTION add_query_points(
  p_user_id UUID,
  p_metadata JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- 使用函數擁有者的權限執行（繞過 RLS）
AS $$
DECLARE
  v_points INTEGER := 1; -- 查詢固定 +1 點
  v_new_total INTEGER;
  v_point_rule RECORD;
  v_today_count INTEGER;
  v_daily_limit INTEGER;
BEGIN
  -- 1. 從 activity_point_rules 取得點數規則
  SELECT * INTO v_point_rule
  FROM activity_point_rules
  WHERE action = 'query'
  LIMIT 1;

  -- 如果找不到規則，使用預設值
  IF NOT FOUND THEN
    v_points := 1;
    v_daily_limit := 100; -- 預設每日上限
  ELSE
    v_points := v_point_rule.points;
    v_daily_limit := COALESCE(v_point_rule.max_daily_count, 100);
  END IF;

  -- 2. 檢查每日查詢次數上限
  SELECT COUNT(*) INTO v_today_count
  FROM activity_point_history
  WHERE user_id = p_user_id
    AND action = 'query'
    AND DATE(created_at) = CURRENT_DATE;

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DAILY_LIMIT_EXCEEDED',
      'message', '今日查詢次數已達上限'
    );
  END IF;

  -- 3. 更新活躍度點數
  UPDATE member_statistics
  SET 
    activity_points = activity_points + v_points,
    queries_count = queries_count + 1,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING activity_points INTO v_new_total;

  -- 如果統計資料不存在，建立新記錄
  IF NOT FOUND THEN
    INSERT INTO member_statistics (
      user_id,
      activity_points,
      uploads_count,
      queries_count,
      likes_received_count,
      likes_given_count,
      current_level,
      created_at,
      updated_at
    )
    VALUES (
      p_user_id,
      v_points,
      0,
      1,
      0,
      0,
      1,
      NOW(),
      NOW()
    )
    RETURNING activity_points INTO v_new_total;
  END IF;

  -- 4. 記錄活躍度歷史
  INSERT INTO activity_point_history (
    user_id,
    action,
    points,
    description,
    metadata,
    created_at
  )
  VALUES (
    p_user_id,
    'query',
    v_points,
    '查詢債務資料',
    p_metadata,
    NOW()
  );

  -- 5. 更新 usage_counters（每日查詢次數）
  INSERT INTO usage_counters (user_id, day, queries)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET queries = usage_counters.queries + 1;

  -- 6. 返回結果
  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points,
    'total_points', v_new_total,
    'message', '查詢成功'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 發生錯誤時返回錯誤訊息
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '新增查詢點數失敗'
    );
END;
$$;

-- ============================================================================
-- 註解說明
-- ============================================================================

COMMENT ON FUNCTION add_query_points(UUID, JSONB) IS 
'處理查詢活躍度點數邏輯，包含：
1. 檢查每日查詢次數上限
2. 更新活躍度點數和查詢次數
3. 記錄活躍度歷史
4. 更新 usage_counters
預期效能：將多次資料庫操作合併為單一函數呼叫，減少網路往返次數';

-- ============================================================================
-- 測試查詢（可選）
-- ============================================================================

-- 測試函數是否正常運作
-- SELECT add_query_points(
--   'your-user-id-here'::UUID,
--   '{
--     "first_letter": "A",
--     "last5": "12345",
--     "residence": "北北基宜",
--     "result_count": 5
--   }'::JSONB
-- );

