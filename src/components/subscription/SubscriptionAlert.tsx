'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, X, Crown, Upload, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubscriptionStatus {
  subscription_id: string
  is_active: boolean
  subscription_type: string
  status: string
  start_date: string
  end_date: string
  days_remaining: number
  is_expired: boolean
  is_vip: boolean
}

interface QuotaInfo {
  upload: {
    has_quota: boolean
    remaining: number
    limit_value: number
    quota_type: string
  }
  query: {
    has_quota: boolean
    remaining: number
    limit_value: number
    quota_type: string
  }
}

/**
 * 訂閱狀態提醒元件
 * 
 * 功能：
 * 1. 訂閱已過期：紅色橫幅提醒
 * 2. 訂閱即將到期（7/3/1 天）：黃色/橙色/紅色提醒
 * 3. 配額不足：上傳/查詢次數用完時提醒
 * 4. 可關閉但會在下次登入時再次顯示
 */
export default function SubscriptionAlert() {
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<{
    subscription: boolean
    uploadQuota: boolean
    queryQuota: boolean
  }>({
    subscription: false,
    uploadQuota: false,
    queryQuota: false
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // 並行取得訂閱狀態和配額資訊
      const [statusResponse, uploadQuotaResponse, queryQuotaResponse] = await Promise.all([
        fetch('/api/subscription/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/subscription/check-quota', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action_type: 'upload' }),
        }),
        fetch('/api/subscription/check-quota', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action_type: 'query' }),
        }),
      ])

      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setSubscriptionStatus(statusData.data)
      }

      if (uploadQuotaResponse.ok && queryQuotaResponse.ok) {
        const uploadData = await uploadQuotaResponse.json()
        const queryData = await queryQuotaResponse.json()
        setQuotaInfo({
          upload: {
            has_quota: uploadData.data.has_quota,
            remaining: uploadData.data.remaining,
            limit_value: uploadData.data.limit,
            quota_type: uploadData.data.quota_type
          },
          query: {
            has_quota: queryData.data.has_quota,
            remaining: queryData.data.remaining,
            limit_value: queryData.data.limit,
            quota_type: queryData.data.quota_type
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch subscription data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (type: 'subscription' | 'uploadQuota' | 'queryQuota') => {
    setDismissed(prev => ({ ...prev, [type]: true }))
  }

  const handleRenew = () => {
    router.push('/subscription')
  }

  if (loading) return null

  // 1. 訂閱已過期提醒（最高優先級）
  if (subscriptionStatus?.is_expired && !dismissed.subscription) {
    return (
      <div className="bg-red-500/10 border-2 border-red-500 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-500 mb-1">
                ⚠️ 您的訂閱已過期！
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                您的訂閱已於 {new Date(subscriptionStatus.end_date).toLocaleDateString('zh-TW')} 過期。
                請續費以繼續使用上傳和查詢功能。
              </p>
              <Button
                onClick={handleRenew}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Crown className="h-4 w-4 mr-2" />
                立即續費
              </Button>
            </div>
          </div>
          <button
            onClick={() => handleDismiss('subscription')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // 2. 訂閱即將到期提醒
  if (subscriptionStatus && !subscriptionStatus.is_expired && subscriptionStatus.days_remaining <= 7 && !dismissed.subscription) {
    const daysRemaining = subscriptionStatus.days_remaining
    let bgColor = 'bg-yellow-500/10'
    let borderColor = 'border-yellow-500'
    let textColor = 'text-yellow-500'
    let urgencyText = '即將到期'

    if (daysRemaining <= 1) {
      bgColor = 'bg-red-500/10'
      borderColor = 'border-red-500'
      textColor = 'text-red-500'
      urgencyText = '緊急提醒'
    } else if (daysRemaining <= 3) {
      bgColor = 'bg-orange-500/10'
      borderColor = 'border-orange-500'
      textColor = 'text-orange-500'
      urgencyText = '即將到期'
    }

    return (
      <div className={`${bgColor} border-2 ${borderColor} rounded-lg p-4 mb-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <AlertCircle className={`h-6 w-6 ${textColor} flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${textColor} mb-1`}>
                ⏰ {urgencyText}：訂閱還剩 {daysRemaining} 天
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                您的訂閱將於 {new Date(subscriptionStatus.end_date).toLocaleDateString('zh-TW')} 到期。
                建議提前 3 天續費，以免影響使用。
              </p>
              <Button
                onClick={handleRenew}
                className={`${
                  daysRemaining <= 1
                    ? 'bg-red-500 hover:bg-red-600'
                    : daysRemaining <= 3
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-yellow-500 hover:bg-yellow-600'
                } text-white`}
              >
                <Crown className="h-4 w-4 mr-2" />
                立即續費
              </Button>
            </div>
          </div>
          <button
            onClick={() => handleDismiss('subscription')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  // 3. 配額不足提醒
  const showUploadQuotaAlert = quotaInfo && !quotaInfo.upload.has_quota && !dismissed.uploadQuota
  const showQueryQuotaAlert = quotaInfo && !quotaInfo.query.has_quota && !dismissed.queryQuota

  if (showUploadQuotaAlert || showQueryQuotaAlert) {
    return (
      <div className="space-y-4 mb-6">
        {/* 上傳配額不足 */}
        {showUploadQuotaAlert && (
          <div className="bg-orange-500/10 border-2 border-orange-500 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Upload className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-500 mb-1">
                    📤 上傳額度已用完
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    您的{quotaInfo.upload.quota_type === 'daily' ? '今日' : '總'}上傳額度已用完（{quotaInfo.upload.limit_value} 次）。
                    {quotaInfo.upload.quota_type === 'daily' 
                      ? '明天將自動重置額度。' 
                      : '升級 VIP 享受每日 20 次上傳額度！'}
                  </p>
                  {quotaInfo.upload.quota_type !== 'daily' && (
                    <Button
                      onClick={handleRenew}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      升級 VIP
                    </Button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss('uploadQuota')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* 查詢配額不足 */}
        {showQueryQuotaAlert && (
          <div className="bg-orange-500/10 border-2 border-orange-500 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <Search className="h-6 w-6 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-orange-500 mb-1">
                    🔍 查詢額度已用完
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    您的{quotaInfo.query.quota_type === 'daily' ? '今日' : '總'}查詢額度已用完（{quotaInfo.query.limit_value} 次）。
                    {quotaInfo.query.quota_type === 'daily' 
                      ? '明天將自動重置額度。' 
                      : '升級 VIP 享受每日 30 次查詢額度！'}
                  </p>
                  {quotaInfo.query.quota_type !== 'daily' && (
                    <Button
                      onClick={handleRenew}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      升級 VIP
                    </Button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss('queryQuota')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

