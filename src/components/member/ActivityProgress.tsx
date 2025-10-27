'use client'

import React from 'react'
import { TrendingUp } from 'lucide-react'

interface ActivityProgressProps {
  currentPoints: number
  nextLevelPoints: number
  currentLevel: number
  nextLevel: number
  titleColor: string
  className?: string
}

export function ActivityProgress({
  currentPoints,
  nextLevelPoints,
  currentLevel,
  nextLevel,
  titleColor,
  className = ''
}: ActivityProgressProps) {
  // 計算進度百分比
  const progressPercentage = Math.min(
    100,
    Math.round((currentPoints / nextLevelPoints) * 100)
  )

  // 計算還需要多少點數
  const pointsNeeded = Math.max(0, nextLevelPoints - currentPoints)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 標題和點數 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: titleColor }} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            活躍度
          </span>
        </div>
        <span className="text-sm font-bold" style={{ color: titleColor }}>
          {currentPoints.toLocaleString()} / {nextLevelPoints.toLocaleString()} 點
        </span>
      </div>

      {/* 進度條 */}
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progressPercentage}%`,
            background: `linear-gradient(90deg, ${titleColor}, ${titleColor}CC)`
          }}
        >
          {/* 光暈效果 */}
          <div
            className="absolute top-0 right-0 w-8 h-full opacity-50 blur-sm"
            style={{ background: titleColor }}
          />
        </div>

        {/* 百分比文字 */}
        {progressPercentage > 10 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white drop-shadow-md">
              {progressPercentage}%
            </span>
          </div>
        )}
      </div>

      {/* 提示文字 */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>LV{currentLevel}</span>
        {pointsNeeded > 0 ? (
          <span>距離 LV{nextLevel} 還需 {pointsNeeded.toLocaleString()} 點</span>
        ) : (
          <span className="text-green-500 font-medium">已達到下一等級！</span>
        )}
      </div>
    </div>
  )
}

