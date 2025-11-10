'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, TrendingUp, Users, DollarSign, Calendar, Download } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

// 介面定義
interface SubscriptionStats {
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  expired_subscriptions: number
  cancelled_subscriptions: number
  trial_to_vip_conversion_rate: number
  total_vip_members: number
}

interface RevenueStats {
  total_revenue: number
  completed_payments: number
  pending_payments: number
  failed_payments: number
  average_order_amount: number
  atm_revenue: number
  barcode_revenue: number
  cvs_revenue: number
}

interface UserActivityStats {
  total_members: number
  active_members: number
  vip_members: number
  vip_percentage: number
  total_uploads: number
  total_queries: number
  average_uploads_per_user: number
  average_queries_per_user: number
}

interface TrendData {
  period_start: string
  [key: string]: any
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')

  // 統計資料狀態
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats | null>(null)
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null)
  const [userActivityStats, setUserActivityStats] = useState<UserActivityStats | null>(null)
  const [subscriptionTrends, setSubscriptionTrends] = useState<TrendData[]>([])
  const [revenueTrends, setRevenueTrends] = useState<TrendData[]>([])

  // 計算日期範圍
  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    
    switch (dateRange) {
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
      case '90d':
        start.setDate(start.getDate() - 90)
        break
    }

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    }
  }

  // 載入所有統計資料
  useEffect(() => {
    fetchAllStats()
  }, [dateRange, period])

  const fetchAllStats = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const { start_date, end_date } = getDateRange()
      const headers = { 'Authorization': `Bearer ${token}` }

      // 並行載入所有資料
      const [
        subscriptionStatsRes,
        revenueStatsRes,
        userActivityRes,
        subscriptionTrendsRes,
        revenueTrendsRes
      ] = await Promise.all([
        fetch(`/api/admin/analytics/subscription-stats?start_date=${start_date}&end_date=${end_date}`, { headers }),
        fetch(`/api/admin/analytics/revenue-stats?start_date=${start_date}&end_date=${end_date}`, { headers }),
        fetch(`/api/admin/analytics/user-activity?start_date=${start_date}&end_date=${end_date}`, { headers }),
        fetch(`/api/admin/analytics/subscription-trends?period=${period}&start_date=${start_date}&end_date=${end_date}`, { headers }),
        fetch(`/api/admin/analytics/revenue-trends?period=${period}&start_date=${start_date}&end_date=${end_date}`, { headers })
      ])

      if (subscriptionStatsRes.ok) {
        const data = await subscriptionStatsRes.json()
        setSubscriptionStats(data.data.stats)
      }

      if (revenueStatsRes.ok) {
        const data = await revenueStatsRes.json()
        setRevenueStats(data.data.stats)
      }

      if (userActivityRes.ok) {
        const data = await userActivityRes.json()
        setUserActivityStats(data.data.stats)
      }

      if (subscriptionTrendsRes.ok) {
        const data = await subscriptionTrendsRes.json()
        setSubscriptionTrends(data.data.trends)
      }

      if (revenueTrendsRes.ok) {
        const data = await revenueTrendsRes.json()
        setRevenueTrends(data.data.trends)
      }

    } catch (error) {
      console.error('載入統計資料失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 格式化數字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-TW').format(num)
  }

  // 格式化金額
  const formatCurrency = (amount: number) => {
    return `NT$ ${formatNumber(amount)}`
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  // 圖表顏色
  const COLORS = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    pink: '#ec4899'
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">報表與分析</h1>
            <p className="text-muted-foreground mt-1">查看平台營運數據與趨勢分析</p>
          </div>
          <div className="flex gap-3">
            <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">最近 7 天</SelectItem>
                <SelectItem value="30d">最近 30 天</SelectItem>
                <SelectItem value="90d">最近 90 天</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">按日</SelectItem>
                <SelectItem value="week">按週</SelectItem>
                <SelectItem value="month">按月</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 關鍵指標卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 總收入 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總收入</CardTitle>
              <DollarSign className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(revenueStats?.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {revenueStats?.completed_payments || 0} 筆已完成付款
              </p>
            </CardContent>
          </Card>

          {/* 總訂閱數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總訂閱數</CardTitle>
              <BarChart3 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(subscriptionStats?.total_subscriptions || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {subscriptionStats?.active_subscriptions || 0} 個活躍訂閱
              </p>
            </CardContent>
          </Card>

          {/* 總會員數 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">總會員數</CardTitle>
              <Users className="w-4 h-4 text-purple" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(userActivityStats?.total_members || 0)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {userActivityStats?.vip_percentage || 0}% VIP 會員
              </p>
            </CardContent>
          </Card>

          {/* 轉換率 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">試用轉換率</CardTitle>
              <TrendingUp className="w-4 h-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subscriptionStats?.trial_to_vip_conversion_rate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                試用轉 VIP 的比例
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 訂閱趨勢圖表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 訂閱趨勢折線圖 */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱趨勢</CardTitle>
              <CardDescription>新增訂閱數量變化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={subscriptionTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period_start"
                    tickFormatter={formatDate}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip
                    labelFormatter={formatDate}
                    contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="new_subscriptions"
                    stroke={COLORS.primary}
                    name="總訂閱"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_trials"
                    stroke={COLORS.warning}
                    name="試用"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="new_vip"
                    stroke={COLORS.success}
                    name="VIP"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 收入趨勢折線圖 */}
          <Card>
            <CardHeader>
              <CardTitle>收入趨勢</CardTitle>
              <CardDescription>收入金額變化</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period_start"
                    tickFormatter={formatDate}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip
                    labelFormatter={formatDate}
                    formatter={(value: any) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.success}
                    name="收入"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 訂閱狀態分布 & 付款方式分布 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 訂閱狀態圓餅圖 */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱狀態分布</CardTitle>
              <CardDescription>各狀態訂閱數量佔比</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '活躍', value: subscriptionStats?.active_subscriptions || 0, color: COLORS.success },
                      { name: '試用', value: subscriptionStats?.trial_subscriptions || 0, color: COLORS.warning },
                      { name: '已過期', value: subscriptionStats?.expired_subscriptions || 0, color: COLORS.danger },
                      { name: '已取消', value: subscriptionStats?.cancelled_subscriptions || 0, color: COLORS.purple }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: '活躍', value: subscriptionStats?.active_subscriptions || 0, color: COLORS.success },
                      { name: '試用', value: subscriptionStats?.trial_subscriptions || 0, color: COLORS.warning },
                      { name: '已過期', value: subscriptionStats?.expired_subscriptions || 0, color: COLORS.danger },
                      { name: '已取消', value: subscriptionStats?.cancelled_subscriptions || 0, color: COLORS.purple }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 付款方式收入圓餅圖 */}
          <Card>
            <CardHeader>
              <CardTitle>付款方式收入分布</CardTitle>
              <CardDescription>各付款方式收入佔比</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'ATM', value: revenueStats?.atm_revenue || 0, color: COLORS.primary },
                      { name: '超商條碼', value: revenueStats?.barcode_revenue || 0, color: COLORS.success },
                      { name: '超商代碼', value: revenueStats?.cvs_revenue || 0, color: COLORS.warning }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[
                      { name: 'ATM', value: revenueStats?.atm_revenue || 0, color: COLORS.primary },
                      { name: '超商條碼', value: revenueStats?.barcode_revenue || 0, color: COLORS.success },
                      { name: '超商代碼', value: revenueStats?.cvs_revenue || 0, color: COLORS.warning }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* 詳細統計資料 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 訂閱詳細資料 */}
          <Card>
            <CardHeader>
              <CardTitle>訂閱詳細資料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">總訂閱數</span>
                <span className="font-semibold">{formatNumber(subscriptionStats?.total_subscriptions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">活躍訂閱</span>
                <span className="font-semibold text-success">{formatNumber(subscriptionStats?.active_subscriptions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">試用訂閱</span>
                <span className="font-semibold text-warning">{formatNumber(subscriptionStats?.trial_subscriptions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">已過期</span>
                <span className="font-semibold text-danger">{formatNumber(subscriptionStats?.expired_subscriptions || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">已取消</span>
                <span className="font-semibold text-purple">{formatNumber(subscriptionStats?.cancelled_subscriptions || 0)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">轉換率</span>
                <span className="font-semibold">{subscriptionStats?.trial_to_vip_conversion_rate || 0}%</span>
              </div>
            </CardContent>
          </Card>

          {/* 收入詳細資料 */}
          <Card>
            <CardHeader>
              <CardTitle>收入詳細資料</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">總收入</span>
                <span className="font-semibold text-success">{formatCurrency(revenueStats?.total_revenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">已完成</span>
                <span className="font-semibold">{formatNumber(revenueStats?.completed_payments || 0)} 筆</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">待付款</span>
                <span className="font-semibold text-warning">{formatNumber(revenueStats?.pending_payments || 0)} 筆</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">失敗</span>
                <span className="font-semibold text-danger">{formatNumber(revenueStats?.failed_payments || 0)} 筆</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">平均訂單金額</span>
                <span className="font-semibold">{formatCurrency(revenueStats?.average_order_amount || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* 使用者活躍度 */}
          <Card>
            <CardHeader>
              <CardTitle>使用者活躍度</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">總會員數</span>
                <span className="font-semibold">{formatNumber(userActivityStats?.total_members || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">活躍會員</span>
                <span className="font-semibold text-success">{formatNumber(userActivityStats?.active_members || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VIP 會員</span>
                <span className="font-semibold text-primary">{formatNumber(userActivityStats?.vip_members || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VIP 佔比</span>
                <span className="font-semibold">{userActivityStats?.vip_percentage || 0}%</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">總上傳次數</span>
                <span className="font-semibold">{formatNumber(userActivityStats?.total_uploads || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">總查詢次數</span>
                <span className="font-semibold">{formatNumber(userActivityStats?.total_queries || 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

