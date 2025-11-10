'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import StatCard from '@/components/stats/StatCard'
import RegionStatsCard from '@/components/stats/RegionStatsCard'
import { LevelBadge } from '@/components/member/LevelBadge'
import { ActivityProgress } from '@/components/member/ActivityProgress'
import { ExpiryReminder } from '@/components/subscription/ExpiryReminder'
import { TrendingUp, Award } from 'lucide-react'

interface User {
  id: string
  account: string
  email: string
  status: string
  role: string
  created_at: string
  level_info?: {
    current_level: number
    title: string
    title_color: string
    activity_points: number
  }
  statistics: {
    likes_received: number
    likes_given: number
    uploads_count: number
    queries_count: number
  }
}

interface MemberStats {
  personal: {
    uploads_count: number
    queries_count: number
    likes_received: number
    likes_given: number
  }
  quota: {
    daily_limit: number
    used_today: number
    remaining_today: number
    percentage_used: string
  }
  ranking: {
    upload_rank: number | null
    upload_total_users: number | null
    query_rank: number | null
    query_total_users: number | null
  }
  contribution: {
    uploads_count: number
    total_debts: number
    percentage: string
  }
}

interface RegionStats {
  total: number
  north: number
  central: number
  south: number
  east: number
}

interface SubscriptionInfo {
  subscription_type: 'trial' | 'vip'
  end_date: string
  days_remaining: number
}



export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null)
  const [regionStats, setRegionStats] = useState<RegionStats | null>(null)
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      // 並行取得所有資料
      const [userRes, memberStatsRes, regionStatsRes, subscriptionRes] = await Promise.all([
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/stats/member', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/region/stats', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/subscription/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ])

      if (!userRes.ok) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      const userData = await userRes.json()
      setUser(userData.data)

      if (memberStatsRes.ok) {
        const memberStatsData = await memberStatsRes.json()
        setMemberStats(memberStatsData.data)
      }

      if (regionStatsRes.ok) {
        const regionStatsData = await regionStatsRes.json()
        setRegionStats(regionStatsData.data)
      }

      if (subscriptionRes.ok) {
        const subscriptionData = await subscriptionRes.json()
        setSubscriptionInfo(subscriptionData.data)
      }

      setLoading(false)
    } catch (err) {
      setError('載入資料失敗')
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchData()

    // 監聽使用者資料更新事件
    const handleUserDataUpdated = () => {
      fetchData()
    }

    window.addEventListener('userDataUpdated', handleUserDataUpdated)

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated)
    }
  }, [fetchData])

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-foreground">載入中...</div>
        </div>
      </MemberLayout>
    )
  }

  if (error) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">{error}</div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="space-y-8">

        {/* 訂閱到期提醒 */}
        {subscriptionInfo && (
          <ExpiryReminder
            daysRemaining={subscriptionInfo.days_remaining}
            subscriptionType={subscriptionInfo.subscription_type}
            expiryDate={subscriptionInfo.end_date}
          />
        )}

        {/* 站內債務總累計 - 顯眼位置 */}
        {regionStats && (
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="text-xl font-bold text-foreground">站內債務總累計</h3>
            </div>
            <RegionStatsCard stats={regionStats} />
          </div>
        )}

        {/* 等級資訊卡片 */}
        {user?.level_info && (
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <h3 className="text-xl font-bold text-foreground">我的等級</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 左側：等級徽章 */}
              <div className="flex flex-col items-center justify-center gap-4">
                <button
                  onClick={() => router.push('/profile')}
                  className="transition-transform hover:scale-105"
                >
                  <LevelBadge
                    level={user.level_info.current_level}
                    title={user.level_info.title}
                    titleColor={user.level_info.title_color}
                    size="large"
                  />
                </button>
                <button
                  onClick={() => router.push('/profile')}
                  className="text-sm text-blue-500 hover:text-blue-600 underline"
                >
                  查看完整資料 →
                </button>
              </div>

              {/* 右側：活躍度進度 */}
              <div className="flex flex-col justify-center">
                <ActivityProgress
                  currentPoints={user.level_info.activity_points}
                  nextLevelPoints={user.level_info.current_level < 30 ? (user.level_info.current_level + 1) * 100 : 999999}
                  currentLevel={user.level_info.current_level}
                  nextLevel={user.level_info.current_level + 1}
                  titleColor={user.level_info.title_color}
                />
                <div className="mt-4 p-3 bg-dark-200 rounded-lg">
                  <div className="text-xs text-foreground-muted mb-1">如何獲得活躍度？</div>
                  <div className="text-xs text-foreground space-y-1">
                    <div>• 每日登入：+3 點</div>
                    <div>• 上傳債務資料：+2 點</div>
                    <div>• 查詢債務資料：+1 點</div>
                    <div>• 給予按讚：+1 點</div>
                    <div>• 收到按讚：+3 點</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 個人統計 */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">個人統計</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="上傳總次數"
              value={user?.statistics.uploads_count || 0}
              icon="📤"
              subtitle={
                memberStats?.ranking.upload_rank
                  ? `排名 ${memberStats.ranking.upload_rank}/${memberStats.ranking.upload_total_users}`
                  : undefined
              }
            />
            <StatCard
              title="查詢總次數"
              value={user?.statistics.queries_count || 0}
              icon="🔍"
              subtitle={
                memberStats?.ranking.query_rank
                  ? `排名 ${memberStats.ranking.query_rank}/${memberStats.ranking.query_total_users}`
                  : undefined
              }
            />
            <StatCard
              title="收到的讚"
              value={user?.statistics.likes_received || 0}
              icon="👍"
            />
            <StatCard
              title="給出的讚"
              value={user?.statistics.likes_given || 0}
              icon="💖"
            />
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

