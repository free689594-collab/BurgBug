/**
 * 會員相關類型定義
 */

// 會員基本資料
export interface MemberProfile {
  id: string
  account: string
  nickname: string
  business_type: string
  business_region: string
  status: 'pending' | 'approved' | 'suspended'
  created_at: string
}

// 會員等級資訊
export interface MemberLevel {
  current_level: number
  title: string
  title_color: string
  activity_points: number
  next_level_points: number
  progress_percentage: number
  total_upload_bonus: number
  total_query_bonus: number
}

// 會員勳章
export interface MemberBadge {
  badge_key: string
  badge_name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme' | 'special'
  icon_name: string
  unlocked_at: string
}

// 會員統計
export interface MemberStats {
  total_uploads: number
  total_queries: number
  consecutive_login_days: number
  total_badges: number
  last_login_date: string
}

// 會員配額
export interface MemberQuotas {
  daily_upload_limit: number
  daily_query_limit: number
  remaining_uploads: number
  remaining_queries: number
}

// 完整會員資料
export interface MemberProfileData {
  user: MemberProfile
  level: MemberLevel
  badges: MemberBadge[]
  stats: MemberStats
  quotas: MemberQuotas
}

