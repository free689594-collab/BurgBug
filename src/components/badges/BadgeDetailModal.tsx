'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface BadgeData {
  badge_key: string
  badge_name: string
  icon_type: string
  icon_name: string
  icon_color: string
  background_gradient: string
  border_color: string
  glow_effect: string
  animation_effect: string
  description: string
  difficulty: string
  unlock_condition: any
  is_hidden: boolean
  display_order: number
  is_unlocked: boolean
  unlocked_at: string | null
  is_displayed: boolean
  progress: number
  target: number
  is_condition_met: boolean
}

interface BadgeDetailModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

export default function BadgeDetailModal({ isOpen, onClose, userId }: BadgeDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeData[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [unlockedCount, setUnlockedCount] = useState(0)

  useEffect(() => {
    if (isOpen && userId) {
      fetchBadges()
    }
  }, [isOpen, userId])

  const fetchBadges = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/member/badges/${userId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setUnlockedBadges(result.data.unlocked)
          setTotalCount(result.data.total_badges)
          setUnlockedCount(result.data.unlocked_count)
        }
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'text-gray-400'
      case 'medium':
        return 'text-blue-400'
      case 'hard':
        return 'text-purple-400'
      case 'legendary':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '簡單'
      case 'medium':
        return '中等'
      case 'hard':
        return '困難'
      case 'legendary':
        return '傳說'
      default:
        return '未知'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-dark-300 rounded-lg shadow-2xl overflow-hidden">
        {/* 標題列 */}
        <div className="sticky top-0 z-10 bg-dark-300 border-b border-dark-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">🏆 會員勳章</h2>
            <p className="text-sm text-foreground-muted mt-1">
              已解鎖 {unlockedCount} / {totalCount} 個勳章
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-200 transition-colors"
          >
            <X className="w-6 h-6 text-foreground-muted" />
          </button>
        </div>

        {/* 內容區域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            </div>
          ) : unlockedBadges.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-foreground-muted">尚未解鎖任何勳章</p>
              <p className="text-sm text-foreground-muted mt-2">繼續努力，解鎖更多成就！</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedBadges.map((badge) => (
                <div
                  key={badge.badge_key}
                  className="relative bg-dark-200 rounded-lg p-4 border border-dark-100 hover:border-primary/50 transition-all duration-300 hover:transform hover:-translate-y-1"
                  style={{
                    boxShadow: badge.glow_effect !== 'none' ? badge.glow_effect : undefined
                  }}
                >
                  {/* 勳章圖示 */}
                  <div
                    className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center text-6xl"
                    style={{
                      background: badge.background_gradient,
                      border: `2px solid ${badge.border_color}`
                    }}
                  >
                    {badge.badge_name.split(' ')[0]}
                  </div>

                  {/* 勳章名稱 */}
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {badge.badge_name}
                  </h3>

                  {/* 勳章描述 */}
                  <p className="text-sm text-foreground-muted mb-3">
                    {badge.description}
                  </p>

                  {/* 難度標籤 */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${getDifficultyColor(badge.difficulty)}`}>
                      難度：{getDifficultyText(badge.difficulty)}
                    </span>
                  </div>

                  {/* 解鎖時間 */}
                  <div className="text-xs text-foreground-muted">
                    解鎖時間：{formatDate(badge.unlocked_at)}
                  </div>

                  {/* 解鎖標記 */}
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    ✓ 已解鎖
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="sticky bottom-0 bg-dark-300 border-t border-dark-100 px-6 py-3">
          <p className="text-xs text-foreground-muted text-center">
            💡 提示：繼續上傳債務資料、查詢資訊、給予按讚，即可解鎖更多勳章！
          </p>
        </div>
      </div>
    </div>
  )
}

