-- =====================================================
-- 臻好尋債務平台 - 活躍度點數規則插入
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：插入 5 個活躍度點數規則
-- =====================================================

-- 插入活躍度點數規則
INSERT INTO activity_point_rules (action, points, description, max_daily_count, cooldown_seconds) VALUES
('upload', 2, '上傳債務資料', 10, 0),
('query', 1, '查詢債務資料', 20, 0),
('like_received', 3, '收到讚', NULL, 0),
('like_given', 1, '給出讚', 5, 0),
('daily_login', 3, '每日登入', 1, 0)
ON CONFLICT (action) DO UPDATE SET
  points = EXCLUDED.points,
  description = EXCLUDED.description,
  max_daily_count = EXCLUDED.max_daily_count,
  cooldown_seconds = EXCLUDED.cooldown_seconds;

