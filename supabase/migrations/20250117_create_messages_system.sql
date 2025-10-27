-- =============================================
-- 站內信系統資料表
-- =============================================

-- 1. 訊息類型 ENUM
CREATE TYPE message_type AS ENUM (
  'personal',      -- 個人訊息
  'system',        -- 系統通知
  'announcement'   -- 公告
);

-- 2. 訊息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 發送者資訊
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type VARCHAR(20) DEFAULT 'member', -- 'member' 或 'system'
  
  -- 接收者資訊
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 訊息內容
  subject VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  message_type message_type DEFAULT 'personal',
  
  -- 狀態
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- 軟刪除（分別記錄發送者和接收者的刪除狀態）
  deleted_by_sender BOOLEAN DEFAULT FALSE,
  deleted_by_receiver BOOLEAN DEFAULT FALSE,
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 訊息附件表（選配）
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  -- 檔案資訊
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  
  -- 時間戳記
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 建立索引
CREATE INDEX idx_messages_sender ON messages(sender_id) WHERE deleted_by_sender = FALSE;
CREATE INDEX idx_messages_receiver ON messages(receiver_id) WHERE deleted_by_receiver = FALSE;
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read) WHERE is_read = FALSE;
CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- 5. 建立 RLS 政策
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- 訊息表 RLS 政策

-- 會員可以查看自己發送的訊息（未被自己刪除）
CREATE POLICY "Members can view their sent messages"
  ON messages FOR SELECT
  USING (
    sender_id = auth.uid() AND deleted_by_sender = FALSE
  );

-- 會員可以查看自己接收的訊息（未被自己刪除）
CREATE POLICY "Members can view their received messages"
  ON messages FOR SELECT
  USING (
    receiver_id = auth.uid() AND deleted_by_receiver = FALSE
  );

-- 會員可以發送訊息給其他會員
CREATE POLICY "Members can send messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    message_type = 'personal'
  );

-- 會員可以更新自己接收的訊息（標記已讀）
CREATE POLICY "Members can update received messages"
  ON messages FOR UPDATE
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- 會員可以軟刪除自己的訊息
CREATE POLICY "Members can soft delete their messages"
  ON messages FOR UPDATE
  USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  )
  WITH CHECK (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- 管理員可以查看所有訊息
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 管理員可以發送系統訊息
CREATE POLICY "Admins can send system messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 附件表 RLS 政策

-- 會員可以查看自己訊息的附件
CREATE POLICY "Members can view their message attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_attachments.message_id
      AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
    )
  );

-- 會員可以上傳附件到自己發送的訊息
CREATE POLICY "Members can upload attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages
      WHERE messages.id = message_attachments.message_id
      AND messages.sender_id = auth.uid()
    )
  );

-- 管理員可以查看所有附件
CREATE POLICY "Admins can view all attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('super_admin', 'admin')
    )
  );

-- 6. 建立觸發器：自動更新 updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- 7. 建立函數：標記訊息為已讀
CREATE OR REPLACE FUNCTION mark_message_as_read(message_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE, read_at = NOW()
  WHERE id = message_id AND receiver_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. 建立函數：取得未讀訊息數量
CREATE OR REPLACE FUNCTION get_unread_message_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages
    WHERE receiver_id = user_id
    AND is_read = FALSE
    AND deleted_by_receiver = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 建立函數：軟刪除訊息
CREATE OR REPLACE FUNCTION soft_delete_message(
  message_id UUID,
  delete_as VARCHAR(10) -- 'sender' 或 'receiver'
)
RETURNS VOID AS $$
BEGIN
  IF delete_as = 'sender' THEN
    UPDATE messages
    SET deleted_by_sender = TRUE
    WHERE id = message_id AND sender_id = auth.uid();
  ELSIF delete_as = 'receiver' THEN
    UPDATE messages
    SET deleted_by_receiver = TRUE
    WHERE id = message_id AND receiver_id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 插入測試資料（選配）
-- 系統歡迎訊息給所有現有會員
INSERT INTO messages (sender_id, sender_type, receiver_id, subject, content, message_type)
SELECT 
  NULL,
  'system',
  m.user_id,
  '歡迎使用臻好尋債務平台',
  '親愛的會員您好，歡迎使用臻好尋債務平台的站內信系統。您可以透過此系統與其他會員溝通，或接收系統重要通知。',
  'system'
FROM members m
WHERE m.status = 'approved';

