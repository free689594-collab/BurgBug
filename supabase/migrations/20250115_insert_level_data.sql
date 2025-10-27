-- =====================================================
-- 臻好尋債務平台 - 等級資料插入
-- 版本：v1.0
-- 日期：2025-01-15
-- 說明：插入 30 個等級 + LV99 管理員等級
-- =====================================================

-- 插入等級配置資料（LV1-LV15）
INSERT INTO level_config (level, required_points, title, title_color, visual_effect, bonus_upload_quota, bonus_query_quota) VALUES
(1, 0, '初入江湖', '#9CA3AF', '無特效', 0, 0),
(2, 150, '嶄露頭角', '#10B981', '無特效', 0, 0),
(3, 360, '小有名氣', '#3B82F6', '淡藍光暈', 0, 0),
(4, 660, '業界新秀', '#8B5CF6', '淡紫光暈', 0, 0),
(5, 1050, '經驗老手', '#F59E0B', '金色光暈', 1, 2),
(6, 1560, '資深專家', '#EF4444', '紅色光暈', 0, 0),
(7, 2190, '業界精英', '#EC4899', '粉紅光暈', 0, 0),
(8, 2940, '行業翹楚', '#06B6D4', '青色光暈', 0, 0),
(9, 3840, '名震一方', '#FBBF24', '金色脈動', 0, 0),
(10, 4890, '江湖名宿', '#A855F7', '紫色脈動', 1, 2),
(11, 6150, '業界宗師', '#14B8A6', '青綠脈動', 0, 0),
(12, 7650, '德高望重', '#F97316', '橙色脈動', 0, 0),
(13, 9420, '一代宗師', '#8B5CF6', '紫色光環', 0, 0),
(14, 11490, '行業泰斗', '#10B981', '綠色光環', 0, 0),
(15, 13890, '業界傳奇', '#EF4444', '紅色光環', 1, 2);

-- 插入等級配置資料（LV16-LV30）
INSERT INTO level_config (level, required_points, title, title_color, visual_effect, bonus_upload_quota, bonus_query_quota) VALUES
(16, 16650, '名揚四海', '#3B82F6', '藍色光環', 0, 0),
(17, 19800, '威震八方', '#FBBF24', '金色光環', 0, 0),
(18, 23370, '舉世聞名', '#EC4899', '粉紅光環', 0, 0),
(19, 27390, '無人不曉', '#06B6D4', '青色光環', 0, 0),
(20, 31890, '業界神話', '#A855F7', '紫色星光', 2, 3),
(21, 36900, '傳奇人物', '#F59E0B', '金色星光', 0, 0),
(22, 42450, '不朽傳說', '#EF4444', '紅色星光', 0, 0),
(23, 48570, '曠世奇才', '#10B981', '綠色星光', 0, 0),
(24, 55290, '絕代風華', '#3B82F6', '藍色星光', 0, 0),
(25, 62640, '蓋世無雙', '#8B5CF6', '紫色彩虹', 2, 3),
(26, 70650, '舉世無雙', '#FBBF24', '金色彩虹', 0, 0),
(27, 79350, '天下無敵', '#EC4899', '粉紅彩虹', 0, 0),
(28, 88770, '登峰造極', '#06B6D4', '青色彩虹', 2, 3),
(29, 98940, '至尊無上', '#EF4444', '紅色彩虹', 2, 4),
(30, 109920, '萬古流芳', '#FFD700', '金色彩虹脈動', 4, 8);

-- 插入 LV99 管理員等級
INSERT INTO level_config (level, required_points, title, title_color, visual_effect, bonus_upload_quota, bonus_query_quota) VALUES
(99, 999999, '至高無上', '#FF0000', '紅金彩虹脈動', 9999, 9999)
ON CONFLICT (level) DO UPDATE SET
  required_points = EXCLUDED.required_points,
  title = EXCLUDED.title,
  title_color = EXCLUDED.title_color,
  visual_effect = EXCLUDED.visual_effect,
  bonus_upload_quota = EXCLUDED.bonus_upload_quota,
  bonus_query_quota = EXCLUDED.bonus_query_quota;

