'use client'

import React, { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import { Search } from 'lucide-react'

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  label?: string
  className?: string
}

// 常用圖示列表
const COMMON_ICONS = [
  'Award', 'Trophy', 'Medal', 'Star', 'Crown', 'Zap', 'Flame', 'Heart',
  'ThumbsUp', 'Target', 'TrendingUp', 'Upload', 'Download', 'Search',
  'Calendar', 'Clock', 'Gift', 'Sparkles', 'Shield', 'Rocket',
  'CheckCircle', 'XCircle', 'AlertCircle', 'Info', 'HelpCircle',
  'User', 'Users', 'UserPlus', 'UserCheck', 'UserX'
]

export function IconPicker({
  value,
  onChange,
  label,
  className = ''
}: IconPickerProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // 取得圖示組件
  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.Award
    return Icon
  }

  // 過濾圖示
  const filteredIcons = COMMON_ICONS.filter(icon =>
    icon.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const CurrentIcon = getIcon(value)

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* 圖示預覽 */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
        >
          <CurrentIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        {/* 圖示名稱輸入 */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Award"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 圖示選擇器彈窗 */}
      {showPicker && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />

          {/* 選擇器 */}
          <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80">
            {/* 搜尋框 */}
            <div className="mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜尋圖示..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 圖示網格 */}
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-6 gap-2">
                {filteredIcons.map((iconName) => {
                  const Icon = getIcon(iconName)
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => {
                        onChange(iconName)
                        setShowPicker(false)
                        setSearchTerm('')
                      }}
                      className={`p-2 rounded-lg border-2 transition-all hover:scale-110 ${
                        value === iconName
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      title={iconName}
                    >
                      <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </button>
                  )
                })}
              </div>

              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  找不到符合的圖示
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

