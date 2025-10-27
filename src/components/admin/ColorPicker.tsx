'use client'

import React, { useState } from 'react'
import { Palette } from 'lucide-react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  className?: string
}

// 預設顏色選項
const PRESET_COLORS = [
  '#9CA3AF', // 灰色
  '#10B981', // 綠色
  '#3B82F6', // 藍色
  '#8B5CF6', // 紫色
  '#F59E0B', // 橙色
  '#EF4444', // 紅色
  '#EC4899', // 粉色
  '#14B8A6', // 青色
  '#F97316', // 深橙色
  '#6366F1', // 靛藍色
]

export function ColorPicker({
  value,
  onChange,
  label,
  className = ''
}: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false)

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* 顏色預覽 */}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center"
          style={{ backgroundColor: value }}
        >
          <Palette className="w-5 h-5 text-white drop-shadow-md" />
        </button>

        {/* 顏色值輸入 */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* 顏色選擇器彈窗 */}
      {showPicker && (
        <>
          {/* 遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />

          {/* 選擇器 */}
          <div className="absolute top-full left-0 mt-2 z-20 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                預設顏色
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onChange(color)
                      setShowPicker(false)
                    }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                      value === color
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                自訂顏色
              </label>
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

