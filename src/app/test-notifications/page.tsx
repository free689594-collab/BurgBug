'use client'

import React from 'react'
import { useNotification } from '@/contexts/NotificationContext'

export default function TestNotificationsPage() {
  const { showLevelUp, showBadgeUnlock } = useNotification()

  const testLevelUp = () => {
    showLevelUp({
      leveledUp: true,
      oldLevel: 1,
      newLevel: 2,
      newTitle: '嶄露頭角',
      newTitleColor: '#10B981',
      totalUploadBonus: 1,
      totalQueryBonus: 2,
      message: '恭喜！您已升級到 LV2「嶄露頭角」！'
    })
  }

  const testBadgeUnlock = () => {
    showBadgeUnlock({
      newBadges: [
        {
          badge_key: 'first_upload',
          badge_name: '首次上傳',
          description: '上傳第一筆債務資料',
          difficulty: 'easy',
          icon_name: 'Upload'
        }
      ],
      totalBadges: 1,
      message: '恭喜！您解鎖了 1 個新勳章！'
    })
  }

  const testMultipleBadges = () => {
    showBadgeUnlock({
      newBadges: [
        {
          badge_key: 'first_upload',
          badge_name: '首次上傳',
          description: '上傳第一筆債務資料',
          difficulty: 'easy',
          icon_name: 'Upload'
        },
        {
          badge_key: 'first_query',
          badge_name: '首次查詢',
          description: '查詢第一筆債務資料',
          difficulty: 'easy',
          icon_name: 'Search'
        },
        {
          badge_key: 'early_bird',
          badge_name: '早起的鳥兒',
          description: '凌晨 2-4 點登入',
          difficulty: 'medium',
          icon_name: 'Sunrise'
        }
      ],
      totalBadges: 3,
      message: '恭喜！您解鎖了 3 個新勳章！'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          通知系統測試頁面
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            測試通知
          </h2>

          <div className="space-y-3">
            <button
              onClick={testLevelUp}
              className="w-full py-3 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              測試等級升級通知
            </button>

            <button
              onClick={testBadgeUnlock}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              測試單個勳章解鎖通知
            </button>

            <button
              onClick={testMultipleBadges}
              className="w-full py-3 px-6 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              測試多個勳章解鎖通知
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              說明
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 點擊按鈕測試不同的通知效果</li>
              <li>• 通知會在 5 秒後自動關閉</li>
              <li>• 可以點擊通知或關閉按鈕手動關閉</li>
              <li>• 多個勳章會自動輪播顯示</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

