/**
 * 通知系統類型定義
 */

// 等級升級資料
export interface LevelUpData {
  leveledUp: boolean
  oldLevel: number
  newLevel: number
  newTitle: string
  newTitleColor: string
  totalUploadBonus: number
  totalQueryBonus: number
  message: string
}

// 勳章解鎖資料
export interface BadgeData {
  badge_key: string
  badge_name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme' | 'special'
  icon_name: string
}

export interface BadgeUnlockData {
  newBadges: BadgeData[]
  totalBadges: number
  message: string
}

// 通知類型
export type NotificationType = 'level_up' | 'badge_unlock'

// 通知介面
export interface Notification {
  id: string
  type: NotificationType
  data: LevelUpData | BadgeUnlockData
  duration?: number
  onClose?: () => void
}

// 通知 Context 值
export interface NotificationContextValue {
  notifications: Notification[]
  showLevelUp: (data: LevelUpData, duration?: number) => void
  showBadgeUnlock: (data: BadgeUnlockData, duration?: number) => void
  closeNotification: (id: string) => void
  clearAll: () => void
}

