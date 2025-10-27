-- =====================================================
-- 臻好尋債務平台 - 勳章資料插入
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：插入 27 個勳章 + 5 個管理員特殊勳章
-- =====================================================

-- =====================================================
-- 第 1 部分：簡單勳章（5 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 1. 首次上傳
(
  'first_upload',
  '🎯 首次上傳',
  'svg',
  'Trophy',
  '#9CA3AF',
  'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
  '#9CA3AF',
  'none',
  'hover-scale-1.05',
  '完成第一次債務資料上傳',
  'easy',
  '{"type": "simple", "field": "uploads_count", "operator": ">=", "value": 1}'::jsonb,
  FALSE,
  1
),
-- 2. 首次查詢
(
  'first_query',
  '🔍 首次查詢',
  'svg',
  'Search',
  '#9CA3AF',
  'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
  '#9CA3AF',
  'none',
  'hover-scale-1.05',
  '完成第一次債務資料查詢',
  'easy',
  '{"type": "simple", "field": "queries_count", "operator": ">=", "value": 1}'::jsonb,
  FALSE,
  2
),
-- 3. 首次按讚
(
  'first_like_given',
  '👍 首次按讚',
  'svg',
  'ThumbsUp',
  '#9CA3AF',
  'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
  '#9CA3AF',
  'none',
  'hover-scale-1.05',
  '給出第一個讚',
  'easy',
  '{"type": "simple", "field": "likes_given", "operator": ">=", "value": 1}'::jsonb,
  FALSE,
  3
),
-- 4. 首次被讚
(
  'first_like_received',
  '⭐ 首次被讚',
  'svg',
  'Star',
  '#9CA3AF',
  'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
  '#9CA3AF',
  'none',
  'hover-scale-1.05',
  '收到第一個讚',
  'easy',
  '{"type": "simple", "field": "likes_received", "operator": ">=", "value": 1}'::jsonb,
  FALSE,
  4
),
-- 5. 連續登入 7 天
(
  'login_streak_7',
  '📅 連續登入 7 天',
  'svg',
  'Calendar',
  '#9CA3AF',
  'linear-gradient(135deg, #E5E7EB, #9CA3AF)',
  '#9CA3AF',
  'none',
  'hover-scale-1.05',
  '連續登入 7 天',
  'easy',
  '{"type": "simple", "field": "consecutive_login_days", "operator": ">=", "value": 7}'::jsonb,
  FALSE,
  5
);

-- =====================================================
-- 第 2 部分：中等勳章（7 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 6. 資料新手
(
  'upload_10',
  '📊 資料新手',
  'svg',
  'BarChart',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '累計上傳 10 筆債務資料',
  'medium',
  '{"type": "simple", "field": "uploads_count", "operator": ">=", "value": 10}'::jsonb,
  FALSE,
  6
),
-- 7. 查詢能手
(
  'query_50',
  '🔎 查詢能手',
  'svg',
  'Binoculars',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '累計查詢 50 次債務資料',
  'medium',
  '{"type": "simple", "field": "queries_count", "operator": ">=", "value": 50}'::jsonb,
  FALSE,
  7
),
-- 8. 百讚達成
(
  'likes_100',
  '💯 百讚達成',
  'svg',
  'Award',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '累計收到 100 個讚',
  'medium',
  '{"type": "simple", "field": "likes_received", "operator": ">=", "value": 100}'::jsonb,
  FALSE,
  8
),
-- 9. 連續登入 30 天
(
  'login_streak_30',
  '📅 連續登入 30 天',
  'svg',
  'CalendarCheck',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '連續登入 30 天',
  'medium',
  '{"type": "simple", "field": "consecutive_login_days", "operator": ">=", "value": 30}'::jsonb,
  FALSE,
  9
),
-- 10. 活躍會員
(
  'activity_1000',
  '🎖️ 活躍會員',
  'svg',
  'Medal',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '累計獲得 1,000 活躍度點數',
  'medium',
  '{"type": "simple", "field": "activity_points", "operator": ">=", "value": 1000}'::jsonb,
  FALSE,
  10
),
-- 11. 人氣王
(
  'popular_single_20',
  '🌟 人氣王',
  'svg',
  'Sparkles',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '單筆資料收到 20 個讚',
  'medium',
  '{"type": "custom", "check": "single_debt_likes", "value": 20}'::jsonb,
  FALSE,
  11
),
-- 12. 等級達人
(
  'level_10',
  '🏆 等級達人',
  'svg',
  'Trophy',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '達到 LV10',
  'medium',
  '{"type": "simple", "field": "activity_level", "operator": ">=", "value": 10}'::jsonb,
  FALSE,
  12
);

-- =====================================================
-- 第 3 部分：困難勳章（7 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 13. 資料達人
(
  'upload_100',
  '📊 資料達人',
  'svg',
  'TrendingUp',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '累計上傳 100 筆債務資料',
  'hard',
  '{"type": "simple", "field": "uploads_count", "operator": ">=", "value": 100}'::jsonb,
  FALSE,
  13
),
-- 14. 查詢專家
(
  'query_500',
  '🔍 查詢專家',
  'svg',
  'Target',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '累計查詢 500 次債務資料',
  'hard',
  '{"type": "simple", "field": "queries_count", "operator": ">=", "value": 500}'::jsonb,
  FALSE,
  14
),
-- 15. 千讚成就
(
  'likes_1000',
  '💎 千讚成就',
  'svg',
  'Gem',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '累計收到 1,000 個讚',
  'hard',
  '{"type": "simple", "field": "likes_received", "operator": ">=", "value": 1000}'::jsonb,
  FALSE,
  15
),
-- 16. 連續登入 100 天
(
  'login_streak_100',
  '📅 連續登入 100 天',
  'svg',
  'CalendarDays',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '連續登入 100 天',
  'hard',
  '{"type": "simple", "field": "consecutive_login_days", "operator": ">=", "value": 100}'::jsonb,
  FALSE,
  16
),
-- 17. 活躍之星
(
  'activity_10000',
  '🎯 活躍之星',
  'svg',
  'Zap',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '累計獲得 10,000 活躍度點數',
  'hard',
  '{"type": "simple", "field": "activity_points", "operator": ">=", "value": 10000}'::jsonb,
  FALSE,
  17
),
-- 18. 等級大師
(
  'level_20',
  '👑 等級大師',
  'svg',
  'Crown',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '達到 LV20',
  'hard',
  '{"type": "simple", "field": "activity_level", "operator": ">=", "value": 20}'::jsonb,
  FALSE,
  18
),
-- 19. 全能選手
(
  'badge_collector_10',
  '🌈 全能選手',
  'svg',
  'Rainbow',
  '#A855F7',
  'linear-gradient(135deg, #C084FC, #A855F7)',
  '#A855F7',
  '0 0 12px rgba(168, 85, 247, 0.6)',
  'hover-scale-1.15-pulse',
  '同時擁有 10 個不同勳章',
  'hard',
  '{"type": "badge_count", "operator": ">=", "value": 10}'::jsonb,
  FALSE,
  19
);

-- =====================================================
-- 第 4 部分：極難勳章（7 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 20. 資料宗師
(
  'upload_500',
  '📊 資料宗師',
  'svg',
  'Database',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '累計上傳 500 筆債務資料',
  'extreme',
  '{"type": "simple", "field": "uploads_count", "operator": ">=", "value": 500}'::jsonb,
  FALSE,
  20
),
-- 21. 查詢傳奇
(
  'query_2000',
  '🔍 查詢傳奇',
  'svg',
  'Crosshair',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '累計查詢 2,000 次債務資料',
  'extreme',
  '{"type": "simple", "field": "queries_count", "operator": ">=", "value": 2000}'::jsonb,
  FALSE,
  21
),
-- 22. 萬讚榮耀
(
  'likes_10000',
  '💫 萬讚榮耀',
  'svg',
  'Sparkle',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '累計收到 10,000 個讚',
  'extreme',
  '{"type": "simple", "field": "likes_received", "operator": ">=", "value": 10000}'::jsonb,
  FALSE,
  22
),
-- 23. 連續登入 365 天
(
  'login_streak_365',
  '📅 連續登入 365 天',
  'svg',
  'CalendarHeart',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '連續登入 365 天（一整年）',
  'extreme',
  '{"type": "simple", "field": "consecutive_login_days", "operator": ">=", "value": 365}'::jsonb,
  FALSE,
  23
),
-- 24. 活躍傳說
(
  'activity_50000',
  '⚡ 活躍傳說',
  'svg',
  'Bolt',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '累計獲得 50,000 活躍度點數',
  'extreme',
  '{"type": "simple", "field": "activity_points", "operator": ">=", "value": 50000}'::jsonb,
  FALSE,
  24
),
-- 25. 至尊王者
(
  'level_30',
  '👑 至尊王者',
  'svg',
  'Crown',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '達到 LV30（滿級）',
  'extreme',
  '{"type": "simple", "field": "activity_level", "operator": ">=", "value": 30}'::jsonb,
  FALSE,
  25
),
-- 26. 完美收藏家
(
  'badge_collector_all',
  '🏅 完美收藏家',
  'svg',
  'Award',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B)',
  '#FFD700',
  '0 0 16px rgba(255, 215, 0, 0.8)',
  'hover-scale-1.2-rotate-10-rainbow',
  '收集所有非隱藏勳章',
  'extreme',
  '{"type": "badge_count", "operator": ">=", "value": 26, "exclude_hidden": true}'::jsonb,
  FALSE,
  26
);

-- =====================================================
-- 第 5 部分：特殊/隱藏勳章（3 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 27. 週年慶
(
  'anniversary_1year',
  '🎂 週年慶',
  'svg',
  'Cake',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '註冊滿一週年',
  'medium',
  '{"type": "custom", "check": "registration_days", "value": 365}'::jsonb,
  TRUE,
  27
),
-- 28. 夜貓子
(
  'night_owl',
  '🌙 夜貓子',
  'svg',
  'Moon',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '在凌晨 2-4 點登入 10 次',
  'medium',
  '{"type": "custom", "check": "night_login_count", "value": 10}'::jsonb,
  TRUE,
  28
),
-- 29. 幸運兒
(
  'lucky_one',
  '🎁 幸運兒',
  'svg',
  'Gift',
  '#3B82F6',
  'linear-gradient(135deg, #60A5FA, #3B82F6)',
  '#3B82F6',
  '0 0 8px rgba(59, 130, 246, 0.5)',
  'hover-scale-1.1-rotate-5',
  '在特定活動期間登入',
  'easy',
  '{"type": "custom", "check": "event_login", "value": true}'::jsonb,
  TRUE,
  29
);

-- =====================================================
-- 第 6 部分：管理員特殊勳章（5 種）
-- =====================================================

INSERT INTO badge_config (
  badge_key, badge_name, icon_type, icon_name, icon_color,
  background_gradient, border_color, glow_effect, animation_effect,
  description, difficulty, unlock_condition, is_hidden, display_order
) VALUES
-- 30. 系統創建者
(
  'admin_system_creator',
  '👑 系統創建者',
  'svg',
  'Crown',
  '#FFD700',
  'linear-gradient(135deg, #FFD700, #FF0000, #8B0000)',
  '#FFD700',
  '0 0 30px rgba(255, 215, 0, 1), 0 0 50px rgba(255, 0, 0, 0.8)',
  'rainbow-pulse',
  '系統的創建者與最高管理者',
  'special',
  '{"type": "role", "value": "super_admin"}'::jsonb,
  FALSE,
  1000
),
-- 31. 至高權限
(
  'admin_supreme_authority',
  '⚡ 至高權限',
  'svg',
  'Zap',
  '#FF0000',
  'linear-gradient(135deg, #FF0000, #8B0000)',
  '#FF0000',
  '0 0 20px rgba(255, 0, 0, 1)',
  'pulse-glow',
  '擁有系統最高權限',
  'special',
  '{"type": "role", "value": "super_admin"}'::jsonb,
  FALSE,
  1001
),
-- 32. 系統守護者
(
  'admin_system_guardian',
  '🛡️ 系統守護者',
  'svg',
  'Shield',
  '#3B82F6',
  'linear-gradient(135deg, #3B82F6, #1E40AF)',
  '#3B82F6',
  '0 0 15px rgba(59, 130, 246, 0.8)',
  'glow',
  '守護系統安全與穩定',
  'special',
  '{"type": "role", "value": "super_admin"}'::jsonb,
  FALSE,
  1002
),
-- 33. 開國元勳
(
  'admin_founding_father',
  '🎖️ 開國元勳',
  'svg',
  'Medal',
  '#A855F7',
  'linear-gradient(135deg, #A855F7, #7C3AED)',
  '#A855F7',
  '0 0 18px rgba(168, 85, 247, 0.8)',
  'star-glow',
  '系統建立的第一批管理者',
  'special',
  '{"type": "role", "value": "super_admin"}'::jsonb,
  FALSE,
  1003
),
-- 34. 永恆榮耀（隱藏）
(
  'admin_eternal_glory',
  '🌟 永恆榮耀',
  'svg',
  'Sparkles',
  '#FFD700',
  'linear-gradient(135deg, #FDE047, #FFD700, #F59E0B, #FF0000)',
  '#FFD700',
  '0 0 25px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 105, 180, 0.5)',
  'rainbow-pulse-rotate',
  '永恆的榮耀與傳奇',
  'special',
  '{"type": "role", "value": "super_admin"}'::jsonb,
  TRUE,
  1004
);

