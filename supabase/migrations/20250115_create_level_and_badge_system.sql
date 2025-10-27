-- =====================================================
-- 臻好尋債務平台 - 等級與勳章系統
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：建立完整的等級與勳章系統資料表和函數
-- =====================================================

-- =====================================================
-- 第 1 部分：建立資料表
-- =====================================================

-- 1.1 等級配置表 (level_config)
CREATE TABLE IF NOT EXISTS level_config (
  level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 100),
  required_points INTEGER NOT NULL CHECK (required_points >= 0),
  title VARCHAR(100) NOT NULL,
  title_color VARCHAR(7) NOT NULL,
  visual_effect VARCHAR(100),
  bonus_upload_quota INTEGER DEFAULT 0 CHECK (bonus_upload_quota >= 0),
  bonus_query_quota INTEGER DEFAULT 0 CHECK (bonus_query_quota >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_level_config_required_points ON level_config(required_points);
CREATE INDEX IF NOT EXISTS idx_level_config_is_active ON level_config(is_active);

-- 新增註解
COMMENT ON TABLE level_config IS '等級配置表：定義每個等級的升級條件和獎勵';
COMMENT ON COLUMN level_config.level IS '等級（1-100）';
COMMENT ON COLUMN level_config.required_points IS '升級所需累計活躍度點數';
COMMENT ON COLUMN level_config.title IS '等級稱號';
COMMENT ON COLUMN level_config.title_color IS '稱號顏色（HEX 格式）';
COMMENT ON COLUMN level_config.visual_effect IS '視覺效果描述';
COMMENT ON COLUMN level_config.bonus_upload_quota IS '上傳配額獎勵（每日）';
COMMENT ON COLUMN level_config.bonus_query_quota IS '查詢配額獎勵（每日）';
COMMENT ON COLUMN level_config.is_active IS '是否啟用';

-- =====================================================

-- 1.2 勳章配置表 (badge_config)
CREATE TABLE IF NOT EXISTS badge_config (
  badge_key VARCHAR(50) PRIMARY KEY,
  badge_name VARCHAR(100) NOT NULL,
  icon_type VARCHAR(20) DEFAULT 'svg' CHECK (icon_type IN ('svg', 'emoji', 'image')),
  icon_name VARCHAR(100),
  icon_color VARCHAR(7),
  background_gradient TEXT,
  border_color VARCHAR(7),
  glow_effect TEXT,
  animation_effect VARCHAR(50),
  description TEXT,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme', 'special')),
  unlock_condition JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_badge_config_difficulty ON badge_config(difficulty);
CREATE INDEX IF NOT EXISTS idx_badge_config_is_hidden ON badge_config(is_hidden);
CREATE INDEX IF NOT EXISTS idx_badge_config_is_active ON badge_config(is_active);
CREATE INDEX IF NOT EXISTS idx_badge_config_display_order ON badge_config(display_order);

-- 新增註解
COMMENT ON TABLE badge_config IS '勳章配置表：定義所有勳章的屬性和解鎖條件';
COMMENT ON COLUMN badge_config.badge_key IS '勳章唯一識別碼';
COMMENT ON COLUMN badge_config.badge_name IS '勳章名稱';
COMMENT ON COLUMN badge_config.icon_type IS '圖示類型（svg/emoji/image）';
COMMENT ON COLUMN badge_config.icon_name IS '圖示名稱（Lucide Icons 名稱或 emoji）';
COMMENT ON COLUMN badge_config.unlock_condition IS '解鎖條件（JSON 格式）';
COMMENT ON COLUMN badge_config.is_hidden IS '是否為隱藏勳章';
COMMENT ON COLUMN badge_config.display_order IS '顯示順序';

-- =====================================================

-- 1.3 活躍度點數規則表 (activity_point_rules)
CREATE TABLE IF NOT EXISTS activity_point_rules (
  action VARCHAR(50) PRIMARY KEY,
  points INTEGER NOT NULL CHECK (points >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_daily_count INTEGER,
  cooldown_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_activity_point_rules_is_active ON activity_point_rules(is_active);

-- 新增註解
COMMENT ON TABLE activity_point_rules IS '活躍度點數規則表：定義各種行為的點數獲得規則';
COMMENT ON COLUMN activity_point_rules.action IS '行為類型（upload/query/like_received/like_given/daily_login）';
COMMENT ON COLUMN activity_point_rules.points IS '獲得點數';
COMMENT ON COLUMN activity_point_rules.max_daily_count IS '每日最大次數（NULL 表示無限制）';
COMMENT ON COLUMN activity_point_rules.cooldown_seconds IS '冷卻時間（秒）';

-- =====================================================

-- 1.4 會員勳章表 (member_badges)
CREATE TABLE IF NOT EXISTS member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key VARCHAR(50) NOT NULL REFERENCES badge_config(badge_key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_displayed BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_key)
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_member_badges_user_id ON member_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_member_badges_badge_key ON member_badges(badge_key);
CREATE INDEX IF NOT EXISTS idx_member_badges_unlocked_at ON member_badges(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_badges_is_displayed ON member_badges(is_displayed);

-- 新增註解
COMMENT ON TABLE member_badges IS '會員勳章表：記錄會員已解鎖的勳章';
COMMENT ON COLUMN member_badges.user_id IS '會員 ID';
COMMENT ON COLUMN member_badges.badge_key IS '勳章識別碼';
COMMENT ON COLUMN member_badges.unlocked_at IS '解鎖時間';
COMMENT ON COLUMN member_badges.is_displayed IS '是否在個人資料中顯示';
COMMENT ON COLUMN member_badges.display_order IS '顯示順序';

-- =====================================================

-- 1.5 活躍度點數歷史表 (activity_point_history)
CREATE TABLE IF NOT EXISTS activity_point_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_activity_point_history_user_id ON activity_point_history(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_point_history_action ON activity_point_history(action);
CREATE INDEX IF NOT EXISTS idx_activity_point_history_created_at ON activity_point_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_point_history_user_created ON activity_point_history(user_id, created_at DESC);

-- 新增註解
COMMENT ON TABLE activity_point_history IS '活躍度點數歷史表：記錄所有點數獲得記錄';
COMMENT ON COLUMN activity_point_history.user_id IS '會員 ID';
COMMENT ON COLUMN activity_point_history.action IS '行為類型';
COMMENT ON COLUMN activity_point_history.points IS '獲得點數';
COMMENT ON COLUMN activity_point_history.description IS '描述';
COMMENT ON COLUMN activity_point_history.metadata IS '額外資訊（JSON 格式）';

-- =====================================================
-- 第 2 部分：新增 member_statistics 欄位
-- =====================================================

-- 檢查欄位是否存在，不存在才新增
DO $$
BEGIN
  -- activity_points
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'activity_points') THEN
    ALTER TABLE member_statistics ADD COLUMN activity_points INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- activity_level
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'activity_level') THEN
    ALTER TABLE member_statistics ADD COLUMN activity_level INTEGER DEFAULT 1 NOT NULL CHECK (activity_level >= 1 AND activity_level <= 100);
  END IF;

  -- title
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'title') THEN
    ALTER TABLE member_statistics ADD COLUMN title VARCHAR(100) DEFAULT '初入江湖' NOT NULL;
  END IF;

  -- title_color
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'title_color') THEN
    ALTER TABLE member_statistics ADD COLUMN title_color VARCHAR(7) DEFAULT '#9CA3AF' NOT NULL;
  END IF;

  -- total_upload_quota_bonus
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'total_upload_quota_bonus') THEN
    ALTER TABLE member_statistics ADD COLUMN total_upload_quota_bonus INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- total_query_quota_bonus
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'total_query_quota_bonus') THEN
    ALTER TABLE member_statistics ADD COLUMN total_query_quota_bonus INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- consecutive_login_days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'consecutive_login_days') THEN
    ALTER TABLE member_statistics ADD COLUMN consecutive_login_days INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- last_login_date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'last_login_date') THEN
    ALTER TABLE member_statistics ADD COLUMN last_login_date DATE;
  END IF;

  -- level_updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'member_statistics' AND column_name = 'level_updated_at') THEN
    ALTER TABLE member_statistics ADD COLUMN level_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_member_statistics_activity_points ON member_statistics(activity_points DESC);
CREATE INDEX IF NOT EXISTS idx_member_statistics_activity_level ON member_statistics(activity_level DESC);

-- =====================================================
-- 第 3 部分：建立資料庫函數
-- =====================================================

-- 3.1 計算會員等級函數
CREATE OR REPLACE FUNCTION calculate_member_level(p_user_id UUID)
RETURNS TABLE(
  new_level INTEGER,
  new_title VARCHAR(100),
  new_title_color VARCHAR(7),
  total_upload_bonus INTEGER,
  total_query_bonus INTEGER
) AS $$
DECLARE
  v_activity_points INTEGER;
BEGIN
  -- 取得會員的活躍度點數
  SELECT activity_points INTO v_activity_points
  FROM member_statistics
  WHERE user_id = p_user_id;

  -- 根據點數計算等級
  RETURN QUERY
  SELECT
    lc.level,
    lc.title,
    lc.title_color,
    SUM(lc.bonus_upload_quota) OVER (ORDER BY lc.level) AS total_upload_bonus,
    SUM(lc.bonus_query_quota) OVER (ORDER BY lc.level) AS total_query_bonus
  FROM level_config lc
  WHERE lc.required_points <= v_activity_points
    AND lc.is_active = TRUE
  ORDER BY lc.level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_member_level IS '計算會員等級：根據活躍度點數計算會員的等級和獎勵';

-- 授予執行權限
GRANT EXECUTE ON FUNCTION calculate_member_level(UUID) TO authenticated;

