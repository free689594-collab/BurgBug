import React from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  subtitle?: string
  onClick?: () => void
  className?: string
}

/**
 * 統計卡片元件
 * 可重用的統計數據展示卡片
 */
export default function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
  onClick,
  className = '',
}: StatCardProps) {
  return (
    <div
      className={`bg-dark-300 border border-dark-200 rounded-lg p-6 ${
        onClick ? 'cursor-pointer hover:bg-dark-200 transition-colors' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-foreground-muted text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-sm text-foreground-muted mt-2">{subtitle}</p>
          )}
        </div>
        {icon && <div className="text-4xl ml-4">{icon}</div>}
      </div>

      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span
            className={
              trend.isPositive === false
                ? 'text-red-400'
                : trend.isPositive === true
                ? 'text-green-400'
                : 'text-foreground-muted'
            }
          >
            {trend.isPositive !== undefined && (trend.isPositive ? '+' : '')}
            {trend.value}
          </span>
          <span className="text-foreground-muted ml-2">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

