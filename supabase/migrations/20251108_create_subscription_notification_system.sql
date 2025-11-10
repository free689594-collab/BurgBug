-- =====================================================
-- 訂閱通知系統
-- 建立日期: 2025-11-08
-- 用途: 自動檢測即將到期的訂閱並發送站內信通知
-- =====================================================

-- 1. 建立發送訂閱通知函數
CREATE OR REPLACE FUNCTION send_subscription_notifications()
RETURNS TABLE (
  notifications_sent INTEGER,
  notifications_details JSONB
) AS $$
DECLARE
  v_notification_count INTEGER := 0;
  v_notification_details JSONB := '[]'::JSONB;
  v_notification_days INTEGER[];
  v_subscription RECORD;
  v_days_remaining INTEGER;
  v_notification_type VARCHAR(30);
  v_message_id UUID;
  v_message_title TEXT;
  v_message_content TEXT;
  v_existing_notification UUID;
BEGIN
  -- 從訂閱配置取得通知天數設定（預設：7, 3, 1）
  SELECT COALESCE(
    ARRAY(
      SELECT CAST(unnest(string_to_array(notify_days, ',')) AS INTEGER)
    ),
    ARRAY[7, 3, 1]
  )
  INTO v_notification_days
  FROM subscription_config
  WHERE id = 1
  LIMIT 1;

  -- 遍歷所有有效的訂閱
  FOR v_subscription IN
    SELECT
      ms.id as subscription_id,
      ms.user_id,
      ms.subscription_type,
      ms.end_date,
      EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER as days_remaining,
      m.account,
      m.nickname as display_name
    FROM member_subscriptions ms
    INNER JOIN members m ON m.user_id = ms.user_id
    WHERE ms.status IN ('trial', 'active')
      AND ms.end_date > NOW()
      AND EXTRACT(DAY FROM (ms.end_date - NOW()))::INTEGER <= 7
    ORDER BY ms.end_date ASC
  LOOP
    v_days_remaining := v_subscription.days_remaining;
    v_notification_type := NULL;

    -- 判斷通知類型
    IF v_days_remaining <= 1 THEN
      v_notification_type := 'expiry_1day';
      v_message_title := '⚠️ 緊急提醒：訂閱即將到期';
      v_message_content := format(
        '親愛的 %s 您好，\n\n您的訂閱將在 %s 天後到期（%s）。\n\n' ||
        '為避免服務中斷，請盡快完成續費。\n\n' ||
        '💡 提醒：ATM 虛擬帳號和超商繳費需要 1-3 天處理時間，建議立即續費。\n\n' ||
        '點擊下方按鈕前往續費頁面。',
        COALESCE(v_subscription.display_name, v_subscription.account),
        v_days_remaining,
        TO_CHAR(v_subscription.end_date, 'YYYY-MM-DD HH24:MI')
      );
    ELSIF v_days_remaining <= 3 THEN
      v_notification_type := 'expiry_3days';
      v_message_title := '⚠️ 重要提醒：訂閱即將到期';
      v_message_content := format(
        '親愛的 %s 您好，\n\n您的訂閱將在 %s 天後到期（%s）。\n\n' ||
        '建議您提前完成續費，以確保服務不中斷。\n\n' ||
        '💡 提醒：ATM 虛擬帳號和超商繳費需要 1-3 天處理時間。\n\n' ||
        '點擊下方按鈕前往續費頁面。',
        COALESCE(v_subscription.display_name, v_subscription.account),
        v_days_remaining,
        TO_CHAR(v_subscription.end_date, 'YYYY-MM-DD HH24:MI')
      );
    ELSIF v_days_remaining <= 7 THEN
      v_notification_type := 'expiry_7days';
      v_message_title := '📢 提醒：訂閱即將到期';
      v_message_content := format(
        '親愛的 %s 您好，\n\n您的訂閱將在 %s 天後到期（%s）。\n\n' ||
        '請記得在到期前完成續費，以繼續享受服務。\n\n' ||
        '點擊下方按鈕前往續費頁面。',
        COALESCE(v_subscription.display_name, v_subscription.account),
        v_days_remaining,
        TO_CHAR(v_subscription.end_date, 'YYYY-MM-DD HH24:MI')
      );
    END IF;

    -- 如果需要發送通知
    IF v_notification_type IS NOT NULL THEN
      -- 檢查是否已經發送過相同類型的通知
      SELECT id INTO v_existing_notification
      FROM subscription_notifications
      WHERE user_id = v_subscription.user_id
        AND subscription_id = v_subscription.subscription_id
        AND notification_type = v_notification_type
        AND is_sent = TRUE
      LIMIT 1;

      -- 如果尚未發送過，則建立通知
      IF v_existing_notification IS NULL THEN
        -- 建立站內信
        INSERT INTO messages (
          sender_id,
          receiver_id,
          subject,
          content,
          message_type
        ) VALUES (
          NULL, -- 系統訊息
          v_subscription.user_id,
          v_message_title,
          v_message_content,
          'system'
        ) RETURNING id INTO v_message_id;

        -- 記錄通知
        INSERT INTO subscription_notifications (
          user_id,
          subscription_id,
          notification_type,
          message_id,
          is_sent,
          sent_at
        ) VALUES (
          v_subscription.user_id,
          v_subscription.subscription_id,
          v_notification_type,
          v_message_id,
          TRUE,
          NOW()
        );

        -- 累計通知數量
        v_notification_count := v_notification_count + 1;

        -- 記錄通知詳情
        v_notification_details := v_notification_details || jsonb_build_object(
          'user_id', v_subscription.user_id,
          'account', v_subscription.account,
          'notification_type', v_notification_type,
          'days_remaining', v_days_remaining,
          'end_date', v_subscription.end_date,
          'message_id', v_message_id
        );
      END IF;
    END IF;
  END LOOP;

  -- 返回結果
  RETURN QUERY SELECT v_notification_count, v_notification_details;
END;
$$ LANGUAGE plpgsql;

-- 註解
COMMENT ON FUNCTION send_subscription_notifications() IS '自動檢測即將到期的訂閱並發送站內信通知。檢查 7 天、3 天、1 天內到期的訂閱，避免重複發送相同類型的通知。';


-- 2. 建立處理已過期訂閱的通知函數
CREATE OR REPLACE FUNCTION send_expired_subscription_notifications()
RETURNS TABLE (
  notifications_sent INTEGER,
  notifications_details JSONB
) AS $$
DECLARE
  v_notification_count INTEGER := 0;
  v_notification_details JSONB := '[]'::JSONB;
  v_subscription RECORD;
  v_message_id UUID;
  v_message_title TEXT;
  v_message_content TEXT;
  v_existing_notification UUID;
BEGIN
  -- 遍歷所有剛過期的訂閱（過期不超過 1 天）
  FOR v_subscription IN
    SELECT
      ms.id as subscription_id,
      ms.user_id,
      ms.subscription_type,
      ms.end_date,
      m.account,
      m.nickname as display_name
    FROM member_subscriptions ms
    INNER JOIN members m ON m.user_id = ms.user_id
    WHERE ms.status IN ('trial', 'active')
      AND ms.end_date <= NOW()
      AND ms.end_date >= NOW() - INTERVAL '1 day'
    ORDER BY ms.end_date DESC
  LOOP
    -- 檢查是否已經發送過過期通知
    SELECT id INTO v_existing_notification
    FROM subscription_notifications
    WHERE user_id = v_subscription.user_id
      AND subscription_id = v_subscription.subscription_id
      AND notification_type = 'expired'
      AND is_sent = TRUE
    LIMIT 1;

    -- 如果尚未發送過，則建立通知
    IF v_existing_notification IS NULL THEN
      v_message_title := '❌ 訂閱已過期';
      v_message_content := format(
        '親愛的 %s 您好，\n\n您的訂閱已於 %s 過期。\n\n' ||
        '您將無法繼續使用上傳和查詢功能。\n\n' ||
        '請立即續費以恢復服務。\n\n' ||
        '點擊下方按鈕前往續費頁面。',
        COALESCE(v_subscription.display_name, v_subscription.account),
        TO_CHAR(v_subscription.end_date, 'YYYY-MM-DD HH24:MI')
      );

      -- 建立站內信
      INSERT INTO messages (
        sender_id,
        receiver_id,
        subject,
        content,
        message_type
      ) VALUES (
        NULL, -- 系統訊息
        v_subscription.user_id,
        v_message_title,
        v_message_content,
        'system'
      ) RETURNING id INTO v_message_id;

      -- 記錄通知
      INSERT INTO subscription_notifications (
        user_id,
        subscription_id,
        notification_type,
        message_id,
        is_sent,
        sent_at
      ) VALUES (
        v_subscription.user_id,
        v_subscription.subscription_id,
        'expired',
        v_message_id,
        TRUE,
        NOW()
      );

      -- 累計通知數量
      v_notification_count := v_notification_count + 1;

      -- 記錄通知詳情
      v_notification_details := v_notification_details || jsonb_build_object(
        'user_id', v_subscription.user_id,
        'account', v_subscription.account,
        'notification_type', 'expired',
        'end_date', v_subscription.end_date,
        'message_id', v_message_id
      );
    END IF;
  END LOOP;

  -- 返回結果
  RETURN QUERY SELECT v_notification_count, v_notification_details;
END;
$$ LANGUAGE plpgsql;

-- 註解
COMMENT ON FUNCTION send_expired_subscription_notifications() IS '處理已過期訂閱的通知。檢查剛過期（不超過 1 天）的訂閱並發送過期通知，避免重複發送。';


-- 3. 完成訊息
DO $$
BEGIN
  RAISE NOTICE '✅ 訂閱通知系統建立完成';
  RAISE NOTICE '🔧 已建立函數: send_subscription_notifications, send_expired_subscription_notifications';
  RAISE NOTICE '📧 通知類型: expiry_7days, expiry_3days, expiry_1day, expired';
  RAISE NOTICE '🔔 通知將自動發送站內信並記錄到 subscription_notifications 表';
END $$;

