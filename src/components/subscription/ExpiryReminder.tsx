'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, Clock, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExpiryReminderProps {
  daysRemaining: number
  subscriptionType: 'trial' | 'vip'
  expiryDate: string
}

export function ExpiryReminder({ daysRemaining, subscriptionType, expiryDate }: ExpiryReminderProps) {
  const router = useRouter()

  // 如果剩餘天數大於 7 天，不顯示提醒
  if (daysRemaining > 7) {
    return null
  }

  // 根據剩餘天數決定提醒樣式
  const getAlertStyle = () => {
    if (daysRemaining <= 1) {
      return {
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-500',
        icon: <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />,
        urgency: '緊急',
      }
    } else if (daysRemaining <= 3) {
      return {
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-500',
        icon: <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />,
        urgency: '重要',
      }
    } else {
      return {
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-500',
        icon: <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />,
        urgency: '提醒',
      }
    }
  }

  const style = getAlertStyle()

  // 格式化到期日期
  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  return (
    <div className={`${style.bgColor} border ${style.borderColor} rounded-lg p-4 mb-6`}>
      <div className="flex items-start gap-3">
        {style.icon}
        <div className="flex-1 space-y-3">
          <div>
            <div className={`font-semibold ${style.textColor} mb-1`}>
              {style.urgency}：{subscriptionType === 'trial' ? '免費體驗' : 'VIP 訂閱'}即將到期
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                您的{subscriptionType === 'trial' ? '免費體驗期' : 'VIP 訂閱'}將於{' '}
                <span className="font-semibold text-foreground">{formatExpiryDate(expiryDate)}</span>{' '}
                到期（剩餘 <span className={`font-semibold ${style.textColor}`}>{daysRemaining}</span> 天）
              </div>
              {daysRemaining <= 3 && (
                <div className={`font-semibold ${style.textColor}`}>
                  ⚠️ 建議立即續費，以免影響使用權限
                </div>
              )}
              <div className="text-xs mt-2">
                💡 提醒：ATM 虛擬帳號和超商繳費需要 1-3 天處理時間，建議提前續費
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => router.push('/subscription')}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
              size="sm"
            >
              <Crown className="w-4 h-4 mr-1" />
              立即續費
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

