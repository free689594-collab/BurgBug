'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QuotaWarningBannerProps {
  subscriptionType: 'free_trial' | 'vip_monthly'
  uploadUsed: number
  uploadTotal: number
  queryUsed: number
  queryTotal: number
}

export default function QuotaWarningBanner({
  subscriptionType,
  uploadUsed,
  uploadTotal,
  queryUsed,
  queryTotal
}: QuotaWarningBannerProps) {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(false)
  const [warningType, setWarningType] = useState<'upload' | 'query' | 'both' | null>(null)

  // 只針對免費會員顯示
  const isFreeUser = subscriptionType === 'free_trial'

  useEffect(() => {
    if (!isFreeUser) {
      setIsVisible(false)
      return
    }

    // 檢查配額使用情況
    const uploadExhausted = uploadUsed >= uploadTotal
    const queryExhausted = queryUsed >= queryTotal

    if (uploadExhausted && queryExhausted) {
      setWarningType('both')
      setIsVisible(true)
    } else if (uploadExhausted) {
      setWarningType('upload')
      setIsVisible(true)
    } else if (queryExhausted) {
      setWarningType('query')
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }, [isFreeUser, uploadUsed, uploadTotal, queryUsed, queryTotal])

  const handleDismiss = () => {
    setIsVisible(false)
  }

  const handleUpgrade = () => {
    router.push('/subscription')
  }

  if (!isVisible || !warningType) return null

  // 根據警告類型生成訊息
  const getMessage = () => {
    switch (warningType) {
      case 'both':
        return {
          title: '上傳和查詢額度已用完',
          description: '您的免費試用上傳和查詢次數都已用完，升級 VIP 享受每日無限額度！',
          details: `上傳：${uploadUsed}/${uploadTotal} 次 | 查詢：${queryUsed}/${queryTotal} 次`
        }
      case 'upload':
        return {
          title: '上傳額度已用完',
          description: '您的免費試用上傳次數已用完，升級 VIP 享受每日 20 次上傳額度！',
          details: `上傳：${uploadUsed}/${uploadTotal} 次`
        }
      case 'query':
        return {
          title: '查詢額度已用完',
          description: '您的免費試用查詢次數已用完，升級 VIP 享受每日 30 次查詢額度！',
          details: `查詢：${queryUsed}/${queryTotal} 次`
        }
    }
  }

  const message = getMessage()

  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-b-2 border-purple-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 左側：圖示 + 訊息 */}
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex flex-col gap-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                <span className="font-semibold">
                  {message.title}
                </span>
                <span className="text-sm opacity-90">
                  {message.details}
                </span>
              </div>
              <p className="text-sm opacity-90">
                {message.description}
              </p>
            </div>
          </div>

          {/* 右側：按鈕 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="
                px-4 py-2 rounded-lg font-medium transition-all
                bg-white text-purple-600 hover:bg-gray-100
                flex items-center gap-2
                whitespace-nowrap
              "
            >
              <TrendingUp className="w-4 h-4" />
              升級 VIP
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-lg transition-all hover:bg-white/20"
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

