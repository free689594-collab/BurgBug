-- 優化上傳 API：建立專用的資料庫函數處理債務上傳和活躍度點數
-- 目的：合併資料庫操作，減少 HTTP 呼叫開銷
-- 預期效果：回應時間從 12.56 秒降到 < 5 秒

-- ============================================================================
-- 函數：upload_debt_with_points
-- 功能：處理債務上傳和活躍度點數邏輯
-- 參數：
--   p_user_id: 使用者 ID
--   p_debt_data: 債務資料 (JSONB 格式)
-- 返回：JSONB 格式的結果
-- ============================================================================

CREATE OR REPLACE FUNCTION upload_debt_with_points(
  p_user_id UUID,
  p_debt_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- 使用函數擁有者的權限執行（繞過 RLS）
AS $$
DECLARE
  v_debt_id UUID;
  v_points INTEGER := 2; -- 上傳固定 +2 點
  v_new_total INTEGER;
  v_point_rule RECORD;
  v_today_count INTEGER;
  v_daily_limit INTEGER;
BEGIN
  -- 1. 從 activity_point_rules 取得點數規則
  SELECT * INTO v_point_rule
  FROM activity_point_rules
  WHERE action = 'upload'
  LIMIT 1;

  -- 如果找不到規則，使用預設值
  IF NOT FOUND THEN
    v_points := 2;
    v_daily_limit := 100; -- 預設每日上限
  ELSE
    v_points := v_point_rule.points;
    v_daily_limit := COALESCE(v_point_rule.max_daily_count, 100);
  END IF;

  -- 2. 檢查每日上傳次數上限
  SELECT COUNT(*) INTO v_today_count
  FROM activity_point_history
  WHERE user_id = p_user_id
    AND action = 'upload'
    AND DATE(created_at) = CURRENT_DATE;

  IF v_today_count >= v_daily_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DAILY_LIMIT_EXCEEDED',
      'message', '今日上傳次數已達上限'
    );
  END IF;

  -- 3. 插入債務記錄
  INSERT INTO debt_records (
    debtor_name,
    debtor_id_full,
    debtor_phone,
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
    updated_at
  )
  VALUES (
    p_debt_data->>'debtor_name',
    UPPER(p_debt_data->>'debtor_id_full'),
    p_debt_data->>'debtor_phone',
    p_debt_data->>'gender',
    p_debt_data->>'profession',
    p_debt_data->>'residence',
    (p_debt_data->>'debt_date')::DATE,
    (p_debt_data->>'face_value')::NUMERIC,
    p_debt_data->>'payment_frequency',
    p_debt_data->>'repayment_status',
    p_debt_data->>'note',
    p_user_id,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_debt_id;

  -- 4. 更新活躍度點數
  UPDATE member_statistics
  SET 
    activity_points = activity_points + v_points,
    uploads_count = uploads_count + 1,
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
      likes_received,
      likes_given,
      activity_level,
      updated_at
    )
    VALUES (
      p_user_id,
      v_points,
      1,
      0,
      0,
      0,
      1,
      NOW()
    )
    RETURNING activity_points INTO v_new_total;
  END IF;

  -- 5. 記錄活躍度歷史
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
    'upload',
    v_points,
    '上傳債務資料',
    jsonb_build_object(
      'debt_record_id', v_debt_id,
      'residence', p_debt_data->>'residence'
    ),
    NOW()
  );

  -- 6. 更新 usage_counters（每日上傳次數）
  INSERT INTO usage_counters (user_id, day, uploads)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET uploads = usage_counters.uploads + 1;

  -- 7. 返回結果
  RETURN jsonb_build_object(
    'success', true,
    'debt_id', v_debt_id,
    'points_added', v_points,
    'total_points', v_new_total,
    'message', '債務記錄上傳成功'
  );

EXCEPTION
  WHEN OTHERS THEN
    -- 發生錯誤時返回錯誤訊息
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', '上傳債務記錄失敗'
    );
END;
$$;

-- ============================================================================
-- 註解說明
-- ============================================================================

COMMENT ON FUNCTION upload_debt_with_points(UUID, JSONB) IS 
'處理債務上傳和活躍度點數邏輯，包含：
1. 檢查每日上傳次數上限
2. 插入債務記錄
3. 更新活躍度點數和上傳次數
4. 記錄活躍度歷史
5. 更新 usage_counters
預期效能：將多次資料庫操作合併為單一函數呼叫，減少網路往返次數';

-- ============================================================================
-- 測試查詢（可選）
-- ============================================================================

-- 測試函數是否正常運作
-- SELECT upload_debt_with_points(
--   'your-user-id-here'::UUID,
--   '{
--     "debtor_name": "測試債務人",
--     "debtor_id_full": "A123456789",
--     "debtor_phone": "0912345678",
--     "gender": "男",
--     "profession": "自由業",
--     "residence": "北北基宜",
--     "debt_date": "2025-01-01",
--     "face_value": 100000,
--     "payment_frequency": "monthly",
--     "repayment_status": "正常",
--     "note": "測試備註"
--   }'::JSONB
-- );

