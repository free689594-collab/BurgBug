'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, TrendingUp, DollarSign, Crown, Calendar, AlertCircle } from 'lucide-react'

interface SubscriptionStats {
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  expired_subscriptions: number
  vip_members: number
  total_revenue: number
  monthly_revenue: number
  subscription_distribution: {
    free_trial: number
    vip_monthly: number
  }
  recent_payments: any[]
  expiring_soon: {
    count: number
    subscriptions: Array<{
      user_id: string
      account: string
      end_date: string
      days_remaining: number
    }>
  }
}

export default function AdminSubscriptionStatsPage() {
  const router = useRouter()
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/subscription/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('需要管理員權限')
        }
        throw new Error('查詢統計資料失敗')
      }

      const data = await response.json()
      setStats(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-foreground">載入中...</div>
        </div>
      </AdminLayout>
    )
  }

  if (error || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">{error || '無法載入統計資料'}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">訂閱統計</h1>
          <p className="text-muted-foreground mt-1">查看訂閱系統的統計資料</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 總訂閱數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總訂閱數</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_subscriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                所有訂閱記錄
              </p>
            </CardContent>
          </Card>

          {/* 活躍訂閱數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">活躍訂閱</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.active_subscriptions}</div>
              <p className="text-xs text-muted-foreground mt-1">
                未過期的訂閱
              </p>
            </CardContent>
          </Card>

          {/* VIP 會員數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VIP 會員</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.vip_members}</div>
              <p className="text-xs text-muted-foreground mt-1">
                付費會員數量
              </p>
            </CardContent>
          </Card>

          {/* 本月收入 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本月收入</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                NT$ {stats.monthly_revenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                總收入: NT$ {stats.total_revenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 訂閱分布 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 訂閱類型分布 */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱類型分布</CardTitle>
              <CardDescription>各類型訂閱的數量</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div>
                  <div className="font-semibold">免費試用</div>
                  <div className="text-sm text-muted-foreground">Free Trial</div>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {stats.subscription_distribution.free_trial}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div>
                  <div className="font-semibold">VIP 月費</div>
                  <div className="text-sm text-muted-foreground">VIP Monthly</div>
                </div>
                <div className="text-2xl font-bold text-yellow-500">
                  {stats.subscription_distribution.vip_monthly}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 訂閱狀態分布 */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱狀態分布</CardTitle>
              <CardDescription>各狀態訂閱的數量</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div>
                  <div className="font-semibold">試用中</div>
                  <div className="text-sm text-muted-foreground">Trial</div>
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  {stats.trial_subscriptions}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div>
                  <div className="font-semibold">已過期</div>
                  <div className="text-sm text-muted-foreground">Expired</div>
                </div>
                <div className="text-2xl font-bold text-red-500">
                  {stats.expired_subscriptions}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 即將到期的訂閱 */}
        {stats.expiring_soon.count > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <CardTitle>即將到期的訂閱</CardTitle>
              </div>
              <CardDescription>
                7 天內到期的訂閱（共 {stats.expiring_soon.count} 個）
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.expiring_soon.subscriptions.map((sub, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">{sub.account}</div>
                      <div className="text-sm text-muted-foreground">
                        到期日期: {new Date(sub.end_date).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/20 text-yellow-500">
                      剩餘 {sub.days_remaining} 天
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 最近付款記錄 */}
        {stats.recent_payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>最近付款記錄</CardTitle>
              <CardDescription>最新的 10 筆付款</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.recent_payments.map((payment, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg"
                  >
                    <div>
                      <div className="font-semibold">
                        NT$ {payment.amount?.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleString('zh-TW')}
                      </div>
                    </div>
                    <Badge className={
                      payment.status === 'paid'
                        ? 'bg-green-500/20 text-green-500'
                        : payment.status === 'pending'
                        ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-red-500/20 text-red-500'
                    }>
                      {payment.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}

