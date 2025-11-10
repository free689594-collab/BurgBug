'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Calendar, Upload, Search, AlertCircle, CheckCircle } from 'lucide-react'

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

interface SubscriptionStatusCardProps {
  className?: string
}

export function SubscriptionStatusCard({ className }: SubscriptionStatusCardProps) {
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/subscription/status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('查詢訂閱狀態失敗')
      }

      const data = await response.json()
      setSubscriptionStatus(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">載入中...</div>
        </CardContent>
      </Card>
    )
  }

  if (error || !subscriptionStatus) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-400">{error || '無法載入訂閱資訊'}</div>
        </CardContent>
      </Card>
    )
  }

  const getSubscriptionTypeLabel = (type: string) => {
    switch (type) {
      case 'free_trial':
        return '免費試用'
      case 'vip_monthly':
        return 'VIP 月費'
      default:
        return type
    }
  }

  const getStatusColor = (status: string, isActive: boolean) => {
    if (!isActive) return 'bg-red-500/10 text-red-500 border-red-500/20'
    if (status === 'trial') return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
    if (status === 'active') return 'bg-green-500/10 text-green-500 border-green-500/20'
    return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  }

  const getDaysRemainingColor = (days: number) => {
    if (days <= 3) return 'text-red-500'
    if (days <= 7) return 'text-yellow-500'
    return 'text-green-500'
  }

  return (
    <Card className={`${className} border-2 ${subscriptionStatus.is_vip ? 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5' : 'border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {subscriptionStatus.is_vip ? (
              <Crown className="w-6 h-6 text-yellow-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-blue-500" />
            )}
            <CardTitle className="text-xl">訂閱狀態</CardTitle>
          </div>
          <Badge className={getStatusColor(subscriptionStatus.status, subscriptionStatus.is_active)}>
            {subscriptionStatus.is_active ? '有效' : '已過期'}
          </Badge>
        </div>
        <CardDescription>
          {getSubscriptionTypeLabel(subscriptionStatus.subscription_type)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 剩餘天數 */}
        <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">剩餘天數</span>
          </div>
          <span className={`text-2xl font-bold ${getDaysRemainingColor(subscriptionStatus.days_remaining)}`}>
            {subscriptionStatus.days_remaining} 天
          </span>
        </div>

        {/* 到期日期 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">到期日期</span>
          <span className="font-medium">
            {new Date(subscriptionStatus.end_date).toLocaleDateString('zh-TW')}
          </span>
        </div>

        {/* 警告訊息 */}
        {subscriptionStatus.days_remaining <= 7 && subscriptionStatus.is_active && (
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-200">
              您的訂閱即將到期，請盡快續費以繼續使用服務
            </div>
          </div>
        )}

        {/* 過期訊息 */}
        {!subscriptionStatus.is_active && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              您的訂閱已過期，請續費以繼續使用服務
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => router.push('/subscription')}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {(subscriptionStatus.days_remaining <= 7 || !subscriptionStatus.is_active) ? '立即續費' : '管理訂閱'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

