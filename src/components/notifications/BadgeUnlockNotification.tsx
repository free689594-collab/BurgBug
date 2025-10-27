'use client'

import React, { useEffect, useState } from 'react'
import { X, Award } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { BadgeUnlockData, BadgeData } from '@/types/notification'

interface BadgeUnlockNotificationProps {
  data: BadgeUnlockData
  onClose: () => void
}

// 難度顏色映射
const difficultyColors = {
  easy: {
    bg: 'from-gray-400 to-gray-500',
    text: 'text-gray-700',
    glow: 'shadow-gray-400/50'
  },
  medium: {
    bg: 'from-blue-400 to-blue-600',
    text: 'text-blue-700',
    glow: 'shadow-blue-400/50'
  },
  hard: {
    bg: 'from-purple-400 to-purple-600',
    text: 'text-purple-700',
    glow: 'shadow-purple-400/50'
  },
  extreme: {
    bg: 'from-yellow-400 to-orange-500',
    text: 'text-orange-700',
    glow: 'shadow-yellow-400/50'
  },
  special: {
    bg: 'from-red-500 to-pink-600',
    text: 'text-red-700',
    glow: 'shadow-red-400/50'
  }
}

function BadgeIcon({ iconName, difficulty }: { iconName: string; difficulty: BadgeData['difficulty'] }) {
  const Icon = (LucideIcons as any)[iconName] || Award
  const colors = difficultyColors[difficulty]

  return (
    <div className={`relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${colors.bg} rounded-full ${colors.glow} shadow-lg animate-pulse`}>
      <Icon className="w-8 h-8 text-white" />
      <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
    </div>
  )
}

export function BadgeUnlockNotification({ data, onClose }: BadgeUnlockNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0)

  const currentBadge = data.newBadges[currentBadgeIndex]

  useEffect(() => {
    // 進入動畫
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  useEffect(() => {
    // 如果有多個勳章，每 3 秒切換一個
    if (data.newBadges.length > 1) {
      const interval = setInterval(() => {
        setCurrentBadgeIndex(prev => {
          if (prev < data.newBadges.length - 1) {
            return prev + 1
          }
          return prev
        })
      }, 3000)

      return () => clearInterval(interval)
    }
  }, [data.newBadges.length])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  if (!currentBadge) return null

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ${
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 border-2 border-yellow-400/50">
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 內容 */}
        <div className="text-center">
          {/* 標題 */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🏅 解鎖新勳章！
          </h3>

          {/* 勳章圖示 */}
          <div className="mb-4">
            <BadgeIcon iconName={currentBadge.icon_name} difficulty={currentBadge.difficulty} />
          </div>

          {/* 勳章名稱 */}
          <h4 className={`text-lg font-bold mb-2 ${difficultyColors[currentBadge.difficulty].text}`}>
            {currentBadge.badge_name}
          </h4>

          {/* 勳章描述 */}
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {currentBadge.description}
          </p>

          {/* 進度指示器（如果有多個勳章） */}
          {data.newBadges.length > 1 && (
            <div className="flex items-center justify-center gap-1 mb-2">
              {data.newBadges.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentBadgeIndex
                      ? 'bg-yellow-400 w-6'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          {/* 總勳章數 */}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            總勳章數：{data.totalBadges}
          </p>
        </div>
      </div>
    </div>
  )
}

