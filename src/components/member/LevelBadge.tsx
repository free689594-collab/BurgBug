'use client'

import React from 'react'

interface LevelBadgeProps {
  level: number
  title: string
  titleColor: string
  size?: 'small' | 'medium' | 'large'
  showTitle?: boolean
  className?: string
}

export function LevelBadge({
  level,
  title,
  titleColor,
  size = 'medium',
  showTitle = true,
  className = ''
}: LevelBadgeProps) {
  // 尺寸配置
  const sizeConfig = {
    small: {
      container: 'px-2 py-1 text-xs',
      level: 'text-xs font-bold',
      title: 'text-xs'
    },
    medium: {
      container: 'px-3 py-2 text-sm',
      level: 'text-sm font-bold',
      title: 'text-xs'
    },
    large: {
      container: 'px-4 py-3 text-base',
      level: 'text-lg font-bold',
      title: 'text-sm'
    }
  }

  const config = sizeConfig[size]

  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded-lg border-2 transition-all duration-200 hover:scale-105 ${config.container} ${className}`}
      style={{
        borderColor: titleColor,
        background: `linear-gradient(135deg, ${titleColor}15, ${titleColor}05)`
      }}
    >
      {/* 等級數字 */}
      <div className={`${config.level}`} style={{ color: titleColor }}>
        LV{level}
      </div>

      {/* 稱號 */}
      {showTitle && (
        <div
          className={`${config.title} font-medium whitespace-nowrap`}
          style={{ color: titleColor }}
        >
          {title}
        </div>
      )}
    </div>
  )
}

