-- 優化登入 API：建立專用的資料庫函數處理每日登入積分
-- 目的：減少 HTTP 呼叫開銷，將多次資料庫查詢合併為單一函數呼叫
-- 預期效果：回應時間從 5.73 秒降到 < 2 秒

-- ============================================================================
-- 函數：add_daily_login_points
-- 功能：處理每日登入積分邏輯
-- 參數：
--   p_user_id: 使用者 ID
--   p_consecutive_days: 連續登入天數
--   p_login_date: 登入日期
-- 返回：JSONB 格式的結果
-- ============================================================================

CREATE OR REPLACE FUNCTION add_daily_login_points(
  p_user_id UUID,
  p_consecutive_days INTEGER,
  p_login_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- 使用函數擁有者的權限執行（繞過 RLS）
AS $$
DECLARE
  v_points INTEGER := 1; -- 每日登入固定 +1 點
  v_new_total INTEGER;
  v_current_stats RECORD;
  v_point_rule RECORD;
  v_today_count INTEGER;
  v_last_action_time TIMESTAMPTZ;
  v_cooldown_minutes INTEGER;
BEGIN
  -- 1. 從 activity_point_rules 取得點數規則
  SELECT * INTO v_point_rule
  FROM activity_point_rules
  WHERE action = 'daily_login'
  LIMIT 1;

  -- 如果找不到規則，使用預設值
  IF NOT FOUND THEN
    v_points := 1;
    v_cooldown_minutes := 1440; -- 24 小時
  ELSE
    v_points := v_point_rule.points;
    v_cooldown_minutes := COALESCE(v_point_rule.cooldown_minutes, 1440);
  END IF;

  -- 2. 檢查每日上限（每日登入只能獲得一次積分）
  SELECT COUNT(*) INTO v_today_count
  FROM activity_point_history
  WHERE user_id = p_user_id
    AND action = 'daily_login'
    AND DATE(created_at) = p_login_date;

  IF v_today_count > 0 THEN
    -- 今天已經獲得過登入積分，返回當前統計
    SELECT activity_points INTO v_new_total
    FROM member_statistics
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'points_added', 0,
      'total_points', COALESCE(v_new_total, 0),
      'message', '今日已獲得登入積分'
    );
  END IF;

  -- 3. 檢查冷卻時間（雖然每日登入通常不需要，但保留邏輯以防萬一）
  SELECT created_at INTO v_last_action_time
  FROM activity_point_history
  WHERE user_id = p_user_id
    AND action = 'daily_login'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_action_time IS NOT NULL THEN
    IF NOW() - v_last_action_time < (v_cooldown_minutes || ' minutes')::INTERVAL THEN
      -- 冷卻時間未到，返回當前統計
      SELECT activity_points INTO v_new_total
      FROM member_statistics
      WHERE user_id = p_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'points_added', 0,
        'total_points', COALESCE(v_new_total, 0),
        'message', '冷卻時間未到'
      );
    END IF;
  END IF;

  -- 4. 取得當前統計資料
  SELECT * INTO v_current_stats
  FROM member_statistics
  WHERE user_id = p_user_id;

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
      0,
      0,
      0,
      0,
      0,
      1,
      NOW(),
      NOW()
    );

    v_current_stats.activity_points := 0;
  END IF;

  -- 5. 更新活躍度點數
  UPDATE member_statistics
  SET 
    activity_points = activity_points + v_points,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING activity_points INTO v_new_total;

  -- 6. 記錄歷史
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
    'daily_login',
    v_points,
    '每日登入',
    jsonb_build_object(
      'consecutive_days', p_consecutive_days,
      'login_date', p_login_date
    ),
    NOW()
  );

  -- 7. 返回結果
  RETURN jsonb_build_object(
    'success', true,
    'points_added', v_points,
    'total_points', v_new_total,
    'message', '每日登入積分已新增'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 發生錯誤時返回錯誤訊息
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '新增每日登入積分失敗'
    );
END;
$$;

-- ============================================================================
-- 註解說明
-- ============================================================================

COMMENT ON FUNCTION add_daily_login_points(UUID, INTEGER, DATE) IS 
'處理每日登入積分邏輯，包含：
1. 檢查點數規則
2. 檢查每日上限
3. 檢查冷卻時間
4. 更新活躍度點數
5. 記錄歷史
預期效能：將多次資料庫查詢合併為單一函數呼叫，減少網路往返次數';

-- ============================================================================
-- 測試查詢（可選）
-- ============================================================================

-- 測試函數是否正常運作
-- SELECT add_daily_login_points(
--   'your-user-id-here'::UUID,
--   1,
--   CURRENT_DATE
-- );

