'use client'

import { useState, useEffect } from 'react'
import { X, AlertTriangle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface SubscriptionExpiryBannerProps {
  daysRemaining: number
  subscriptionType: 'free_trial' | 'vip_monthly'
  expiryDate: string
}

export default function SubscriptionExpiryBanner({
  daysRemaining,
  subscriptionType,
  expiryDate
}: SubscriptionExpiryBannerProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)

  // 生成唯一的 banner ID（基於到期日期）
  const bannerId = `expiry-banner-${expiryDate}`

  useEffect(() => {
    // 檢查是否已關閉此 banner
    const dismissed = localStorage.getItem(bannerId)
    
    // 如果未關閉且剩餘天數 <= 7，則顯示
    if (!dismissed && daysRemaining <= 7 && daysRemaining > 0) {
      setIsVisible(true)
    }
  }, [bannerId, daysRemaining])

  const handleDismiss = () => {
    setIsVisible(false)
    // 儲存關閉狀態到 localStorage
    localStorage.setItem(bannerId, 'true')
  }

  const handleRenew = () => {
    router.push('/subscription')
  }

  if (!isVisible) return null

  // 根據剩餘天數決定顏色和樣式
  const getBannerStyle = () => {
    if (daysRemaining <= 1) {
      // 1 天：紅色
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        borderColor: 'border-red-600',
        icon: <AlertTriangle className="w-5 h-5" />,
        urgency: '緊急'
      }
    } else if (daysRemaining <= 3) {
      // 3 天：橙色
      return {
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        borderColor: 'border-orange-600',
        icon: <AlertTriangle className="w-5 h-5" />,
        urgency: '重要'
      }
    } else {
      // 7 天：黃色
      return {
        bgColor: 'bg-yellow-500',
        textColor: 'text-gray-900',
        borderColor: 'border-yellow-600',
        icon: <Clock className="w-5 h-5" />,
        urgency: '提醒'
      }
    }
  }

  const style = getBannerStyle()
  const subscriptionName = subscriptionType === 'free_trial' ? '免費試用' : 'VIP 月費'

  return (
    <div className={`${style.bgColor} ${style.textColor} border-b-2 ${style.borderColor}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 左側：圖示 + 訊息 */}
          <div className="flex items-center gap-3 flex-1">
            {style.icon}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <span className="font-semibold">
                【{style.urgency}】您的{subscriptionName}即將到期
              </span>
              <span className="text-sm opacity-90">
                剩餘 <span className="font-bold text-lg">{daysRemaining}</span> 天
                （到期日：{new Date(expiryDate).toLocaleDateString('zh-TW')}）
              </span>
            </div>
          </div>

          {/* 右側：按鈕 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRenew}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${daysRemaining <= 1 
                  ? 'bg-white text-red-600 hover:bg-gray-100' 
                  : daysRemaining <= 3
                  ? 'bg-white text-orange-600 hover:bg-gray-100'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
                }
                whitespace-nowrap
              `}
            >
              {daysRemaining <= 1 ? '立即續費' : '前往續費'}
            </button>
            <button
              onClick={handleDismiss}
              className={`
                p-2 rounded-lg transition-all
                ${daysRemaining <= 3 
                  ? 'hover:bg-white/20' 
                  : 'hover:bg-gray-900/10'
                }
              `}
              aria-label="關閉提醒"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

