'use client'

import React, { useState } from 'react'
import { Award, X } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { MemberBadge } from '@/types/member'

interface BadgeDisplayProps {
  badges: MemberBadge[]
  totalBadges?: number
  maxDisplay?: number
  className?: string
}

// 難度顏色映射
const difficultyColors = {
  easy: {
    bg: 'from-gray-400 to-gray-500',
    text: 'text-gray-700',
    border: 'border-gray-400'
  },
  medium: {
    bg: 'from-blue-400 to-blue-600',
    text: 'text-blue-700',
    border: 'border-blue-400'
  },
  hard: {
    bg: 'from-purple-400 to-purple-600',
    text: 'text-purple-700',
    border: 'border-purple-400'
  },
  extreme: {
    bg: 'from-yellow-400 to-orange-500',
    text: 'text-orange-700',
    border: 'border-orange-400'
  },
  special: {
    bg: 'from-red-500 to-pink-600',
    text: 'text-red-700',
    border: 'border-red-400'
  }
}

function BadgeIcon({ badge }: { badge: MemberBadge }) {
  const Icon = (LucideIcons as any)[badge.icon_name] || Award
  const colors = difficultyColors[badge.difficulty]

  return (
    <div
      className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-110 cursor-pointer`}
    >
      <Icon className="w-8 h-8 text-white" />
    </div>
  )
}

export function BadgeDisplay({
  badges,
  totalBadges = 34,
  maxDisplay = 10,
  className = ''
}: BadgeDisplayProps) {
  const [selectedBadge, setSelectedBadge] = useState<MemberBadge | null>(null)

  // 顯示的勳章（限制數量）
  const displayBadges = badges.slice(0, maxDisplay)
  const hasMore = badges.length > maxDisplay

  return (
    <div className={className}>
      {/* 標題 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            我的勳章
          </h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {badges.length} / {totalBadges}
        </span>
      </div>

      {/* 勳章網格 */}
      {badges.length > 0 ? (
        <div className="grid grid-cols-5 gap-4">
          {displayBadges.map((badge) => (
            <div
              key={badge.badge_key}
              className="flex flex-col items-center gap-2"
              onClick={() => setSelectedBadge(badge)}
            >
              <BadgeIcon badge={badge} />
              <div className="text-center">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
                  {badge.badge_name}
                </div>
              </div>
            </div>
          ))}

          {/* 更多提示 */}
          {hasMore && (
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                  +{badges.length - maxDisplay}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                更多
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">尚未解鎖任何勳章</p>
          <p className="text-xs mt-1">完成任務即可獲得勳章！</p>
        </div>
      )}

      {/* 勳章詳細資訊彈窗 */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 關閉按鈕 */}
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 勳章圖示 */}
            <div className="flex justify-center mb-4">
              <BadgeIcon badge={selectedBadge} />
            </div>

            {/* 勳章名稱 */}
            <h3
              className={`text-xl font-bold text-center mb-2 ${
                difficultyColors[selectedBadge.difficulty].text
              }`}
            >
              {selectedBadge.badge_name}
            </h3>

            {/* 勳章描述 */}
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
              {selectedBadge.description}
            </p>

            {/* 難度標籤 */}
            <div className="flex justify-center mb-4">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${
                  difficultyColors[selectedBadge.difficulty].border
                } ${difficultyColors[selectedBadge.difficulty].text}`}
              >
                {selectedBadge.difficulty === 'easy' && '簡單'}
                {selectedBadge.difficulty === 'medium' && '中等'}
                {selectedBadge.difficulty === 'hard' && '困難'}
                {selectedBadge.difficulty === 'extreme' && '極難'}
                {selectedBadge.difficulty === 'special' && '特殊'}
              </span>
            </div>

            {/* 解鎖時間 */}
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              解鎖時間：{new Date(selectedBadge.unlocked_at).toLocaleString('zh-TW')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

