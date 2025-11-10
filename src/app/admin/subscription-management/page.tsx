'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Calendar, CreditCard, Clock, ChevronLeft, ChevronRight, Search, Settings } from 'lucide-react'

interface ExpiringSubscription {
  subscription_id: string
  user_id: string
  account: string
  nickname: string
  plan_name: string
  subscription_type: 'free_trial' | 'paid'
  status: string
  end_date: string
  days_remaining: number
  created_at: string
}

interface PaymentRecord {
  payment_id: string
  order_number: string
  user_id: string
  account: string
  nickname: string
  amount: number
  payment_method: string
  payment_status: string
  ecpay_trade_no: string | null
  paid_at: string | null
  created_at: string
  plan_name: string | null
}

interface SubscriptionPlan {
  id: string
  plan_name: string
  display_name: string
  description: string | null
  price: number
  duration_days: number
  upload_quota_daily: number | null
  query_quota_daily: number | null
  upload_quota_total: number | null
  query_quota_total: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function SubscriptionManagementPage() {
  const router = useRouter()
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [daysThreshold, setDaysThreshold] = useState(7)

  // 付款記錄篩選
  const [paymentStatus, setPaymentStatus] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [searchAccount, setSearchAccount] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPayments, setTotalPayments] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 20

  // 即將到期訂閱篩選
  const [expiringTypeFilter, setExpiringTypeFilter] = useState<'all' | 'free_trial' | 'paid'>('all')
  const [expiringStatusFilter, setExpiringStatusFilter] = useState<'all' | 'trial' | 'active'>('all')
  const [expiringSearchQuery, setExpiringSearchQuery] = useState('')

  // 調整訂閱天數對話框
  const [adjustingSubscription, setAdjustingSubscription] = useState<string | null>(null)
  const [adjustDays, setAdjustDays] = useState(30)
  const [adjustReason, setAdjustReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // 訂閱方案
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [planForm, setPlanForm] = useState({
    price: 0,
    duration_days: 30,
    upload_quota_daily: 0,
    query_quota_daily: 0,
    upload_quota_total: 0,
    query_quota_total: 0
  })

  useEffect(() => {
    fetchExpiringSubscriptions()
    fetchPayments()
    fetchPlans()
  }, [daysThreshold, paymentStatus, paymentMethod, searchAccount, currentPage])

  const fetchExpiringSubscriptions = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(
        `/api/admin/subscription/expiring?days=${daysThreshold}&limit=50&offset=0`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('查詢即將到期訂閱失敗')
      }

      const data = await response.json()
      setExpiringSubscriptions(data.data.subscriptions || [])
    } catch (err: any) {
      setError(err.message)
    }
  }

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString()
      })

      if (paymentStatus && paymentStatus !== 'all') params.append('status', paymentStatus)
      if (paymentMethod && paymentMethod !== 'all') params.append('method', paymentMethod)
      if (searchAccount) params.append('account', searchAccount)

      const response = await fetch(
        `/api/admin/payments?${params.toString()}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('查詢付款記錄失敗')
      }

      const data = await response.json()
      setPayments(data.data.payments || [])
      setTotalPayments(data.data.pagination.total)
      setHasMore(data.data.pagination.has_more)
    } catch (err: any) {
      console.error('查詢付款記錄錯誤:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch('/api/admin/subscription/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('查詢訂閱方案失敗')
      }

      const data = await response.json()
      setPlans(data.data)
    } catch (err: any) {
      console.error('查詢訂閱方案錯誤:', err)
    }
  }

  const handleEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan.plan_name)
    setPlanForm({
      price: plan.price,
      duration_days: plan.duration_days || 30,
      upload_quota_daily: plan.upload_quota_daily || 0,
      query_quota_daily: plan.query_quota_daily || 0,
      upload_quota_total: plan.upload_quota_total || 0,
      query_quota_total: plan.query_quota_total || 0
    })
  }

  const handleUpdatePlan = async (planName: string) => {
    try {
      setProcessing(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/subscription/plans', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_name: planName,
          ...planForm
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '更新訂閱方案失敗')
      }

      alert('訂閱方案更新成功')
      setEditingPlan(null)
      fetchPlans()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleAdjustSubscription = async (subscriptionId: string) => {
    try {
      setProcessing(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/subscription/adjust-days', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          days_to_adjust: adjustDays,
          reason: adjustReason || undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || '調整訂閱天數失敗')
      }

      const actionText = adjustDays > 0 ? '延長' : '縮短'
      alert(`訂閱已成功${actionText} ${Math.abs(adjustDays)} 天`)
      setAdjustingSubscription(null)
      setAdjustDays(30)
      setAdjustReason('')
      fetchExpiringSubscriptions()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  // 篩選即將到期訂閱
  const filteredExpiringSubscriptions = expiringSubscriptions.filter(sub => {
    // 訂閱類型篩選
    if (expiringTypeFilter !== 'all' && sub.subscription_type !== expiringTypeFilter) {
      return false
    }

    // 狀態篩選
    if (expiringStatusFilter !== 'all' && sub.status !== expiringStatusFilter) {
      return false
    }

    // 搜尋篩選（帳號或暱稱）
    if (expiringSearchQuery) {
      const query = expiringSearchQuery.toLowerCase()
      const matchAccount = sub.account?.toLowerCase().includes(query)
      const matchNickname = sub.nickname?.toLowerCase().includes(query)
      if (!matchAccount && !matchNickname) {
        return false
      }
    }

    return true
  })

  // 清除即將到期訂閱篩選
  const clearExpiringFilters = () => {
    setExpiringTypeFilter('all')
    setExpiringStatusFilter('all')
    setExpiringSearchQuery('')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'trial':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">試用中</Badge>
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">使用中</Badge>
      case 'expired':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">已過期</Badge>
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">已取消</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-500">待付款</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-green-500">已付款</Badge>
      case 'failed':
        return <Badge variant="outline" className="text-red-500">付款失敗</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
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

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/dashboard')}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">訂閱管理</h1>
            <p className="text-muted-foreground mt-1">管理會員訂閱和付款記錄</p>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        {/* 訂閱方案配置 */}
        {plans.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                訂閱方案配置
              </CardTitle>
              <CardDescription>管理訂閱方案的價格和配額設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {plans.map((plan) => (
                <div key={plan.id} className="border border-border/50 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">{plan.display_name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    {editingPlan !== plan.plan_name && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPlan(plan)}
                      >
                        編輯
                      </Button>
                    )}
                  </div>

                  {editingPlan === plan.plan_name ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`price-${plan.plan_name}`}>價格（新台幣）</Label>
                          <Input
                            id={`price-${plan.plan_name}`}
                            type="number"
                            min="0"
                            value={planForm.price}
                            onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`duration-${plan.plan_name}`}>訂閱天數</Label>
                          <Input
                            id={`duration-${plan.plan_name}`}
                            type="number"
                            min="1"
                            max="365"
                            value={planForm.duration_days}
                            onChange={(e) => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) })}
                          />
                          <p className="text-xs text-muted-foreground">
                            {plan.plan_name === 'free_trial' ? '免費試用期限（天）' : 'VIP 訂閱期限（天）'}
                          </p>
                        </div>
                        {plan.plan_name === 'vip_monthly' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`upload-daily-${plan.plan_name}`}>每日上傳次數</Label>
                              <Input
                                id={`upload-daily-${plan.plan_name}`}
                                type="number"
                                min="0"
                                value={planForm.upload_quota_daily}
                                onChange={(e) => setPlanForm({ ...planForm, upload_quota_daily: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`query-daily-${plan.plan_name}`}>每日查詢次數</Label>
                              <Input
                                id={`query-daily-${plan.plan_name}`}
                                type="number"
                                min="0"
                                value={planForm.query_quota_daily}
                                onChange={(e) => setPlanForm({ ...planForm, query_quota_daily: parseInt(e.target.value) })}
                              />
                            </div>
                          </>
                        )}
                        {plan.plan_name === 'free_trial' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`upload-total-${plan.plan_name}`}>總上傳次數</Label>
                              <Input
                                id={`upload-total-${plan.plan_name}`}
                                type="number"
                                min="0"
                                value={planForm.upload_quota_total}
                                onChange={(e) => setPlanForm({ ...planForm, upload_quota_total: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`query-total-${plan.plan_name}`}>總查詢次數</Label>
                              <Input
                                id={`query-total-${plan.plan_name}`}
                                type="number"
                                min="0"
                                value={planForm.query_quota_total}
                                onChange={(e) => setPlanForm({ ...planForm, query_quota_total: parseInt(e.target.value) })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdatePlan(plan.plan_name)}
                          disabled={processing}
                        >
                          {processing ? '更新中...' : '儲存變更'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setEditingPlan(null)}
                        >
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-accent/5 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">價格</div>
                        <div className="text-lg font-bold">NT$ {plan.price.toLocaleString()}</div>
                      </div>
                      <div className="p-3 bg-accent/5 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">訂閱天數</div>
                        <div className="text-lg font-bold">{plan.duration_days} 天</div>
                      </div>
                      {plan.upload_quota_daily !== null && (
                        <div className="p-3 bg-accent/5 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">每日上傳</div>
                          <div className="text-lg font-bold">{plan.upload_quota_daily} 次</div>
                        </div>
                      )}
                      {plan.query_quota_daily !== null && (
                        <div className="p-3 bg-accent/5 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">每日查詢</div>
                          <div className="text-lg font-bold">{plan.query_quota_daily} 次</div>
                        </div>
                      )}
                      {plan.upload_quota_total !== null && (
                        <div className="p-3 bg-accent/5 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">總上傳</div>
                          <div className="text-lg font-bold">{plan.upload_quota_total} 次</div>
                        </div>
                      )}
                      {plan.query_quota_total !== null && (
                        <div className="p-3 bg-accent/5 rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">總查詢</div>
                          <div className="text-lg font-bold">{plan.query_quota_total} 次</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 即將到期訂閱 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  即將到期訂閱
                </CardTitle>
                <CardDescription>查看即將到期的會員訂閱</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="days-threshold" className="text-sm">天數：</Label>
                <Select
                  value={daysThreshold.toString()}
                  onValueChange={(value) => setDaysThreshold(parseInt(value))}
                >
                  <SelectTrigger id="days-threshold" className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 天</SelectItem>
                    <SelectItem value="3">3 天</SelectItem>
                    <SelectItem value="7">7 天</SelectItem>
                    <SelectItem value="14">14 天</SelectItem>
                    <SelectItem value="30">30 天</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 篩選控制項 */}
            {expiringSubscriptions.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 p-4 bg-accent/5 rounded-lg border border-border/50">
                <div className="flex items-center gap-2">
                  <Label htmlFor="expiring-type-filter" className="text-sm whitespace-nowrap">訂閱類型：</Label>
                  <Select
                    value={expiringTypeFilter}
                    onValueChange={(value: any) => setExpiringTypeFilter(value)}
                  >
                    <SelectTrigger id="expiring-type-filter" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="free_trial">免費試用</SelectItem>
                      <SelectItem value="paid">VIP 會員</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="expiring-status-filter" className="text-sm whitespace-nowrap">狀態：</Label>
                  <Select
                    value={expiringStatusFilter}
                    onValueChange={(value: any) => setExpiringStatusFilter(value)}
                  >
                    <SelectTrigger id="expiring-status-filter" className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      <SelectItem value="trial">試用中</SelectItem>
                      <SelectItem value="active">使用中</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Label htmlFor="expiring-search" className="text-sm whitespace-nowrap">搜尋：</Label>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="expiring-search"
                      placeholder="帳號或暱稱"
                      value={expiringSearchQuery}
                      onChange={(e) => setExpiringSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {(expiringTypeFilter !== 'all' || expiringStatusFilter !== 'all' || expiringSearchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearExpiringFilters}
                    className="whitespace-nowrap"
                  >
                    清除篩選
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {expiringSubscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                沒有即將到期的訂閱
              </div>
            ) : filteredExpiringSubscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                沒有符合篩選條件的訂閱
              </div>
            ) : (
              <div className="space-y-6">
                {/* 免費試用會員 */}
                {filteredExpiringSubscriptions.filter(sub => sub.subscription_type === 'free_trial').length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <h4 className="font-semibold text-sm">免費試用會員</h4>
                      <span className="text-xs text-muted-foreground">
                        ({filteredExpiringSubscriptions.filter(sub => sub.subscription_type === 'free_trial').length} 位)
                      </span>
                    </div>
                    {filteredExpiringSubscriptions
                      .filter(sub => sub.subscription_type === 'free_trial')
                      .map((sub) => (
                        <div
                          key={sub.subscription_id}
                          className="p-4 border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800 rounded-lg hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{sub.nickname}</span>
                                <span className="text-sm text-muted-foreground">({sub.account})</span>
                                {getStatusBadge(sub.status)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>方案：{sub.plan_name}</div>
                                <div>到期日：{new Date(sub.end_date).toLocaleString('zh-TW')}</div>
                                <div className={`font-semibold ${sub.days_remaining <= 3 ? 'text-red-500' : 'text-yellow-600'}`}>
                                  剩餘 {sub.days_remaining} 天
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAdjustingSubscription(sub.subscription_id)}
                            >
                              調整天數
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* VIP 會員 */}
                {filteredExpiringSubscriptions.filter(sub => sub.subscription_type === 'paid').length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <h4 className="font-semibold text-sm">VIP 月費會員</h4>
                      <span className="text-xs text-muted-foreground">
                        ({filteredExpiringSubscriptions.filter(sub => sub.subscription_type === 'paid').length} 位)
                      </span>
                    </div>
                    {filteredExpiringSubscriptions
                      .filter(sub => sub.subscription_type === 'paid')
                      .map((sub) => (
                        <div
                          key={sub.subscription_id}
                          className="p-4 border border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-800 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{sub.nickname}</span>
                                <span className="text-sm text-muted-foreground">({sub.account})</span>
                                {getStatusBadge(sub.status)}
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div>方案：{sub.plan_name}</div>
                                <div>到期日：{new Date(sub.end_date).toLocaleString('zh-TW')}</div>
                                <div className={`font-semibold ${sub.days_remaining <= 3 ? 'text-red-500' : 'text-yellow-600'}`}>
                                  剩餘 {sub.days_remaining} 天
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAdjustingSubscription(sub.subscription_id)}
                            >
                              調整天數
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 調整訂閱天數對話框 */}
        {adjustingSubscription && (
          <Card className="border-blue-500/50">
            <CardHeader>
              <CardTitle>調整訂閱天數</CardTitle>
              <CardDescription>為會員延長或縮短訂閱期限</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adjust-days">調整天數（-365 到 365 天）</Label>
                <Input
                  id="adjust-days"
                  type="number"
                  min="-365"
                  max="365"
                  value={adjustDays}
                  onChange={(e) => setAdjustDays(parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  正數 = 延長訂閱，負數 = 縮短訂閱（例如：30 = 延長 30 天，-10 = 縮短 10 天）
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjust-reason">調整原因（選填）</Label>
                <Input
                  id="adjust-reason"
                  placeholder="例如：補償服務中斷、違規處理等"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAdjustSubscription(adjustingSubscription)}
                  disabled={processing || adjustDays === 0 || adjustDays < -365 || adjustDays > 365}
                >
                  {processing ? '處理中...' : adjustDays > 0 ? `確認延長 ${adjustDays} 天` : `確認縮短 ${Math.abs(adjustDays)} 天`}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAdjustingSubscription(null)
                    setAdjustDays(30)
                    setAdjustReason('')
                  }}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 付款記錄查詢 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              付款記錄查詢
            </CardTitle>
            <CardDescription>查詢和管理所有付款記錄</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 篩選條件 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-status">付款狀態</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger id="payment-status">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="pending">待付款</SelectItem>
                    <SelectItem value="completed">已付款</SelectItem>
                    <SelectItem value="failed">付款失敗</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">付款方式</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="atm">ATM 虛擬帳號</SelectItem>
                    <SelectItem value="barcode">超商條碼</SelectItem>
                    <SelectItem value="cvs">超商代碼</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-account">會員帳號</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search-account"
                    placeholder="搜尋帳號"
                    value={searchAccount}
                    onChange={(e) => setSearchAccount(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPaymentStatus('')
                    setPaymentMethod('')
                    setSearchAccount('')
                    setCurrentPage(0)
                  }}
                  className="w-full"
                >
                  清除篩選
                </Button>
              </div>
            </div>

            {/* 付款記錄列表 */}
            {payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                沒有符合條件的付款記錄
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.payment_id}
                      className="p-4 border border-border/50 rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">NT$ {payment.amount.toLocaleString()}</span>
                            {getPaymentStatusBadge(payment.payment_status)}
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>會員：{payment.nickname} ({payment.account})</div>
                            <div>方案：{payment.plan_name || '未知'}</div>
                            <div>
                              付款方式：
                              {payment.payment_method === 'atm' && 'ATM 虛擬帳號'}
                              {payment.payment_method === 'barcode' && '超商條碼'}
                              {payment.payment_method === 'cvs' && '超商代碼'}
                            </div>
                            <div>訂單編號：{payment.order_number}</div>
                            {payment.ecpay_trade_no && (
                              <div>綠界交易編號：{payment.ecpay_trade_no}</div>
                            )}
                            <div>建立時間：{new Date(payment.created_at).toLocaleString('zh-TW')}</div>
                            {payment.paid_at && (
                              <div className="text-green-500">
                                付款時間：{new Date(payment.paid_at).toLocaleString('zh-TW')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 分頁控制 */}
                {totalPayments > pageSize && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="text-sm text-muted-foreground">
                      顯示 {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalPayments)} / 共 {totalPayments} 筆
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        上一頁
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={!hasMore}
                      >
                        下一頁
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

