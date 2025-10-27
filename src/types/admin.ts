/**
 * 管理員相關類型定義
 */

// 等級配置
export interface LevelConfig {
  level: number
  title: string
  title_color: string
  required_points: number
  bonus_upload_quota: number
  bonus_query_quota: number
  created_at?: string
  updated_at?: string
}

// 勳章配置
export interface BadgeConfig {
  badge_key: string
  badge_name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme' | 'special'
  icon_name: string
  unlock_condition: Record<string, any>
  created_at?: string
  updated_at?: string
}

// 活躍度規則
export interface ActivityRule {
  action: string
  points: number
  max_daily_count: number
  cooldown_seconds: number
  description?: string
  created_at?: string
  updated_at?: string
}

// 等級配置表單
export interface LevelConfigForm {
  level: number
  title: string
  title_color: string
  required_points: number
  upload_quota_bonus: number
  query_quota_bonus: number
}

// 勳章配置表單
export interface BadgeConfigForm {
  badge_key: string
  badge_name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme' | 'special'
  icon_name: string
  unlock_condition: Record<string, any>
}

// 活躍度規則表單
export interface ActivityRuleForm {
  action: string
  points: number
  daily_limit: number
  cooldown_seconds: number
  description?: string
}

