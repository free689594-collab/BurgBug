'use client'

import React, { useEffect, useState } from 'react'
import { X, TrendingUp, Gift } from 'lucide-react'
import type { LevelUpData } from '@/types/notification'

interface LevelUpNotificationProps {
  data: LevelUpData
  onClose: () => void
}

export function LevelUpNotification({ data, onClose }: LevelUpNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 進入動畫
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible && !isExiting ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleClose}
    >
      <div
        className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all duration-300 ${
          isVisible && !isExiting ? 'scale-100' : 'scale-75'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 星星動畫背景 */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>

        {/* 內容 */}
        <div className="relative z-10 text-center">
          {/* 標題 */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 animate-bounce">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              🎉 恭喜升級！
            </h2>
          </div>

          {/* 等級變化 */}
          <div className="mb-6 py-4 px-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
            <div className="flex items-center justify-center gap-4 text-lg font-semibold">
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
                  LV{data.oldLevel}
                </div>
                <div className="text-gray-700 dark:text-gray-300">
                  {/* 舊稱號會從 API 取得，這裡暫時不顯示 */}
                </div>
              </div>

              <div className="text-2xl text-gray-400 dark:text-gray-500">→</div>

              <div className="text-center">
                <div
                  className="text-sm mb-1 font-bold"
                  style={{ color: data.newTitleColor }}
                >
                  LV{data.newLevel}
                </div>
                <div
                  className="font-bold"
                  style={{ color: data.newTitleColor }}
                >
                  {data.newTitle}
                </div>
              </div>
            </div>
          </div>

          {/* 獎勵 */}
          {(data.totalUploadBonus > 0 || data.totalQueryBonus > 0) && (
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  獲得獎勵
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {data.totalUploadBonus > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-green-500">•</span>
                    <span>每日上傳配額 +{data.totalUploadBonus}</span>
                  </div>
                )}
                {data.totalQueryBonus > 0 && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-blue-500">•</span>
                    <span>每日查詢配額 +{data.totalQueryBonus}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 關閉按鈕 */}
          <button
            onClick={handleClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            太棒了！
          </button>
        </div>
      </div>
    </div>
  )
}

