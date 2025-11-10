'use client'

import { useState, useEffect } from 'react'
import MemberNav from '@/components/member/MemberNav'
import SubscriptionAlert from '@/components/subscription/SubscriptionAlert'
import SubscriptionExpiryBanner from '@/components/member/SubscriptionExpiryBanner'
import QuotaWarningBanner from '@/components/member/QuotaWarningBanner'

interface MemberLayoutProps {
  children: React.ReactNode
}

interface SubscriptionStatus {
  subscription_type: 'free_trial' | 'vip_monthly'
  is_active: boolean
  days_remaining: number
  end_date: string
}

interface QuotaStatus {
  upload_used: number
  upload_total: number
  query_used: number
  query_total: number
}

/**
 * 會員頁面統一佈局組件
 *
 * 功能：
 * - 整合 MemberNav 導航欄
 * - 整合 SubscriptionAlert 訂閱狀態提醒
 * - 整合 SubscriptionExpiryBanner 訂閱到期提醒橫幅
 * - 整合 QuotaWarningBanner 配額不足提醒橫幅
 * - 提供統一的頁面容器
 * - 響應式設計
 * - 保持黑色調主題
 *
 * 使用方式：
 * ```tsx
 * <MemberLayout>
 *   <YourPageContent />
 * </MemberLayout>
 * ```
 */
export default function MemberLayout({ children }: MemberLayoutProps) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatus | null>(null)

  useEffect(() => {
    fetchSubscriptionStatus()
    fetchQuotaStatus()

    // 監聽訂閱狀態更新事件
    const handleSubscriptionUpdated = () => {
      fetchSubscriptionStatus()
      fetchQuotaStatus()
    }

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdated)

    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdated)
    }
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const res = await fetch('/api/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSubscriptionStatus(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscription status:', error)
    }
  }

  const fetchQuotaStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // 獲取上傳配額
      const uploadRes = await fetch('/api/subscription/check-quota', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action_type: 'upload' })
      })

      // 獲取查詢配額
      const queryRes = await fetch('/api/subscription/check-quota', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action_type: 'query' })
      })

      if (uploadRes.ok && queryRes.ok) {
        const uploadData = await uploadRes.json()
        const queryData = await queryRes.json()

        if (uploadData.success && queryData.success) {
          setQuotaStatus({
            upload_used: uploadData.data.used || 0,
            upload_total: uploadData.data.limit || 0,
            query_used: queryData.data.used || 0,
            query_total: queryData.data.limit || 0
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch quota status:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <MemberNav />

      {/* 訂閱到期提醒橫幅（固定在頂部） */}
      {subscriptionStatus && subscriptionStatus.is_active && (
        <SubscriptionExpiryBanner
          daysRemaining={subscriptionStatus.days_remaining}
          subscriptionType={subscriptionStatus.subscription_type}
          expiryDate={subscriptionStatus.end_date}
        />
      )}

      {/* 免費會員配額不足提醒橫幅 */}
      {subscriptionStatus && quotaStatus && (
        <QuotaWarningBanner
          subscriptionType={subscriptionStatus.subscription_type}
          uploadUsed={quotaStatus.upload_used}
          uploadTotal={quotaStatus.upload_total}
          queryUsed={quotaStatus.query_used}
          queryTotal={quotaStatus.query_total}
        />
      )}

      {/* 主要內容區域 */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* 訂閱狀態提醒（全域） */}
        <SubscriptionAlert />

        {/* 頁面內容 */}
        {children}
      </main>
    </div>
  )
}

