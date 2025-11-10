'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Calendar, Upload, Search, CreditCard, AlertCircle, CheckCircle, ArrowLeft, ChevronDown, ChevronUp, Check } from 'lucide-react'

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

interface SubscriptionHistoryItem {
  subscription_id: string
  plan_name: string
  display_name: string
  status: string
  subscription_type: string
  start_date: string
  end_date: string
  days_duration: number
  payment_amount: number | null
  payment_status: string | null
  created_at: string
}

interface PaymentHistoryItem {
  payment_id: string
  order_number: string
  amount: number
  payment_method: string
  payment_status: string
  ecpay_trade_no: string | null
  paid_at: string | null
  created_at: string
  plan_name: string | null
}

type PaymentMethod = 'atm' | 'barcode' | 'cvs'

export default function SubscriptionPage() {
  const router = useRouter()
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistoryItem[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('atm')
  const [processing, setProcessing] = useState(false)
  const [showDetailedInfo, setShowDetailedInfo] = useState(false)

  // 從 plans 陣列中取得特定方案
  const freeTrialPlan = plans.find(p => p.plan_name === 'free_trial')
  const vipMonthlyPlan = plans.find(p => p.plan_name === 'vip_monthly')
  const [showHistory, setShowHistory] = useState(false)
  const [showPayments, setShowPayments] = useState(false)
  const detailsRef = useRef<HTMLDivElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)
  const paymentsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAllData()

    // 處理付款結果（從 URL 參數）
    const searchParams = new URLSearchParams(window.location.search)
    const paymentStatus = searchParams.get('payment')
    const orderNo = searchParams.get('order')
    const message = searchParams.get('message')

    if (paymentStatus) {
      if (paymentStatus === 'success') {
        setError('')
        alert(`✅ 付款成功！訂單編號：${orderNo}\n\n您的訂閱已成功開通，感謝您的支持！`)
      } else if (paymentStatus === 'pending') {
        setError('')
        alert(`⏳ ${message || '取號成功'}\n\n訂單編號：${orderNo}\n\n請於期限內完成繳費，繳費完成後訂閱將自動開通。`)
      } else if (paymentStatus === 'failed') {
        setError(`付款失敗：${message || '未知錯誤'}`)
      } else if (paymentStatus === 'error') {
        setError(`系統錯誤：${message || '未知錯誤'}`)
      }

      // 清除 URL 參數
      window.history.replaceState({}, '', '/subscription')

      // 重新載入資料
      setTimeout(() => {
        fetchAllData()
      }, 1000)
    }
  }, [])

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      // 並行查詢所有資料
      const [statusResponse, uploadQuotaResponse, queryQuotaResponse, plansResponse] = await Promise.all([
        fetch('/api/subscription/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subscription/check-quota', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action_type: 'upload' })
        }),
        fetch('/api/subscription/check-quota', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action_type: 'query' })
        }),
        fetch('/api/subscription/plans', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (!statusResponse.ok) {
        throw new Error('查詢訂閱狀態失敗')
      }

      const statusData = await statusResponse.json()
      setSubscriptionStatus(statusData.data)

      if (uploadQuotaResponse.ok && queryQuotaResponse.ok) {
        const uploadData = await uploadQuotaResponse.json()
        const queryData = await queryQuotaResponse.json()

        setQuotaInfo({
          upload: uploadData.data,
          query: queryData.data
        })
      }

      if (plansResponse.ok) {
        const plansData = await plansResponse.json()
        setPlans(plansData.data || [])
      }

      // 並行查詢歷史記錄和付款記錄
      const [historyResponse, paymentsResponse] = await Promise.all([
        fetch('/api/subscription/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subscription/payments', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        setSubscriptionHistory(historyData.data.history || [])
      }

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json()
        setPaymentHistory(paymentsData.data.payments || [])
      }

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRenew = async () => {
    try {
      setProcessing(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      // 1. 建立付款訂單
      const response = await fetch('/api/subscription/payment/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_type: 'vip_monthly',
          payment_method: selectedPaymentMethod,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '建立付款訂單失敗')
      }

      const data = await response.json()

      if (!data.success || !data.data.form_data) {
        throw new Error('付款資料格式錯誤')
      }

      // 2. 建立並提交綠界付款表單
      const formData = data.data.form_data
      const actionUrl = data.data.action_url

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = actionUrl
      form.style.display = 'none'

      // 加入所有付款參數
      Object.keys(formData).forEach((key) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = formData[key]
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()

    } catch (err: any) {
      setError(err.message)
      setProcessing(false)
    }
  }

  const toggleDetailedInfo = () => {
    setShowDetailedInfo(!showDetailedInfo)
    if (!showDetailedInfo) {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
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

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">已過期</Badge>
    }
    if (status === 'trial') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">試用中</Badge>
    }
    if (status === 'active') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">使用中</Badge>
    }
    return <Badge>{status}</Badge>
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-foreground">載入中...</div>
        </div>
      </MemberLayout>
    )
  }

  if (error || !subscriptionStatus) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">{error || '無法載入訂閱資訊'}</div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">訂閱管理</h1>
            <p className="text-muted-foreground mt-1">查看和管理您的訂閱</p>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        {/* 精簡的訂閱狀態摘要 */}
        <Card className="border border-border/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                {subscriptionStatus.is_vip ? (
                  <Crown className="w-5 h-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-blue-500" />
                )}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {getSubscriptionTypeLabel(subscriptionStatus.subscription_type)}
                  </span>
                  <span className="text-muted-foreground">|</span>
                  <span className={`font-semibold ${subscriptionStatus.days_remaining <= 7 ? 'text-red-500' : 'text-green-500'}`}>
                    剩餘 {subscriptionStatus.days_remaining} 天
                  </span>
                  <span className="text-muted-foreground">|</span>
                  {getStatusBadge(subscriptionStatus.status, subscriptionStatus.is_active)}
                </div>
              </div>

              {/* 額度快速檢視 */}
              {quotaInfo && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">上傳:</span>
                    <span className="font-semibold">{quotaInfo.upload.remaining}/{quotaInfo.upload.limit_value || '∞'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Search className="w-4 h-4 text-purple-500" />
                    <span className="text-muted-foreground">查詢:</span>
                    <span className="font-semibold">{quotaInfo.query.remaining}/{quotaInfo.query.limit_value || '∞'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 警告訊息 */}
            {subscriptionStatus.days_remaining <= 7 && subscriptionStatus.is_active && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-200">
                  您的訂閱即將到期，請盡快續費以繼續使用服務
                </div>
              </div>
            )}

            {!subscriptionStatus.is_active && (
              <div className="flex items-start gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-200">
                  您的訂閱已過期，請續費以繼續使用服務
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 訂閱方案選擇區域（主要區域） */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground">選擇訂閱方案</h2>
            <p className="text-muted-foreground mt-1">升級 VIP 享受更多功能和額度</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 免費試用方案 */}
            <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-purple-500/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">免費試用</CardTitle>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    體驗版
                  </Badge>
                </div>
                <CardDescription>
                  適合初次使用的會員
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 價格 */}
                <div className="text-center py-3">
                  <div className="text-4xl font-bold text-foreground">免費</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {freeTrialPlan?.duration_days || 30} 天試用期
                  </div>
                </div>

                {/* 功能列表 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>總共 {freeTrialPlan?.upload_quota_total || 10} 次上傳額度</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>總共 {freeTrialPlan?.query_quota_total || 10} 次查詢額度</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>完整的債務查詢功能</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>活躍度系統</span>
                  </div>
                </div>

                {/* 說明 */}
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs text-blue-200 text-center">
                    新會員審核通過後自動獲得免費試用
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* VIP 月費方案 */}
            <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 relative overflow-hidden">
              {/* 推薦標籤 */}
              <div className="absolute top-4 right-4">
                <Badge className="bg-yellow-500 text-black font-semibold">
                  ⭐ 推薦
                </Badge>
              </div>

              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-500" />
                  <CardTitle className="text-xl">VIP 月費</CardTitle>
                </div>
                <CardDescription>
                  適合經常使用的專業會員
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 價格 */}
                <div className="text-center py-3">
                  <div className="text-4xl font-bold text-foreground">
                    NT$ {vipMonthlyPlan?.price?.toLocaleString() || '1,500'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">每月</div>
                </div>

                {/* 功能列表 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>每日 {vipMonthlyPlan?.upload_quota_daily || 20} 次上傳額度</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>每日 {vipMonthlyPlan?.query_quota_daily || 30} 次查詢額度</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>每日額度自動重置</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>完整的債務查詢功能</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>活躍度系統</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>VIP 專屬徽章</span>
                  </div>
                </div>

                {/* 付款方式選擇 */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">選擇付款方式</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('atm')}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPaymentMethod === 'atm'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-border hover:border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold">ATM 虛擬帳號</div>
                          <div className="text-xs text-muted-foreground mt-0.5">取得虛擬帳號後到 ATM 轉帳</div>
                        </div>
                        <div className="text-lg">🏧</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('barcode')}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPaymentMethod === 'barcode'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-border hover:border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold">超商條碼</div>
                          <div className="text-xs text-muted-foreground mt-0.5">列印條碼到超商繳費</div>
                        </div>
                        <div className="text-lg">📊</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('cvs')}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPaymentMethod === 'cvs'
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-border hover:border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold">超商代碼</div>
                          <div className="text-xs text-muted-foreground mt-0.5">取得代碼到超商繳費</div>
                        </div>
                        <div className="text-lg">🏪</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 繳費期限說明 */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-orange-500">重要提醒</div>
                      <ul className="space-y-0.5 text-muted-foreground">
                        <li>• 繳費期限為 <span className="font-semibold text-foreground">3 天</span></li>
                        <li>• 建議提前 <span className="font-semibold text-foreground">3 天</span> 續費</li>
                        <li>• 繳費後需 <span className="font-semibold text-foreground">1-3 天</span> 啟用</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 立即訂閱按鈕 */}
                <Button
                  onClick={handleRenew}
                  disabled={processing}
                  className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold"
                  size="lg"
                >
                  {processing ? (
                    <>處理中...</>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      立即訂閱 VIP
                    </>
                  )}
                </Button>

                {/* 優惠價提示 */}
                <div className="text-xs text-center text-muted-foreground space-y-1 px-2">
                  <p className="text-[10px] leading-relaxed">
                    ※ 目前為平台初創上線初期，<br />
                    月費 NT$1,500 為暫定優惠價，<br />
                    後續將依功能擴充調整為標準月費。
                  </p>
                  <p className="text-[10px] opacity-70">
                    使用綠界金流安全付款
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 詳細資訊摺疊區域 */}
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={toggleDetailedInfo}
            className="w-full flex items-center justify-center gap-2"
          >
            {showDetailedInfo ? (
              <>
                <ChevronUp className="w-4 h-4" />
                隱藏詳細資訊
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                查看詳細訂閱資訊
              </>
            )}
          </Button>

          <div
            ref={detailsRef}
            className={`transition-all duration-500 overflow-hidden ${
              showDetailedInfo ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="space-y-4">
              {/* 訂閱詳細資訊 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">訂閱詳細資訊</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">開始日期</span>
                      </div>
                      <div className="text-base font-semibold">
                        {new Date(subscriptionStatus.start_date).toLocaleDateString('zh-TW')}
                      </div>
                    </div>

                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">到期日期</span>
                      </div>
                      <div className="text-base font-semibold">
                        {new Date(subscriptionStatus.end_date).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 使用額度詳情 */}
              {quotaInfo && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">使用額度詳情</CardTitle>
                    <CardDescription>
                      {quotaInfo.upload.quota_type === 'daily' ? '每日額度' : '總額度'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 上傳額度 */}
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Upload className="w-5 h-5 text-blue-500" />
                          <span className="font-semibold">上傳額度</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-blue-500">
                            {quotaInfo.upload.remaining}
                          </span>
                          <span className="text-muted-foreground">
                            / {quotaInfo.upload.limit_value || '∞'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {quotaInfo.upload.has_quota ? '還有剩餘額度' : '額度已用完'}
                        </div>
                      </div>

                      {/* 查詢額度 */}
                      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Search className="w-5 h-5 text-purple-500" />
                          <span className="font-semibold">查詢額度</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold text-purple-500">
                            {quotaInfo.query.remaining}
                          </span>
                          <span className="text-muted-foreground">
                            / {quotaInfo.query.limit_value || '∞'}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {quotaInfo.query.has_quota ? '還有剩餘額度' : '額度已用完'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* 訂閱歷史記錄（可摺疊） */}
        {subscriptionHistory.length > 0 && (
          <div className="space-y-2" ref={historyRef}>
            <Button
              variant="outline"
              onClick={() => {
                setShowHistory(!showHistory)
                if (!showHistory) {
                  setTimeout(() => {
                    historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 100)
                }
              }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>訂閱歷史記錄</span>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <div className={`transition-all duration-300 ${showHistory ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {subscriptionHistory.map((item) => (
                    <div
                      key={item.subscription_id}
                      className="p-3 border border-border/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{item.display_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.status === 'trial' && '試用中'}
                              {item.status === 'active' && '使用中'}
                              {item.status === 'expired' && '已過期'}
                              {item.status === 'cancelled' && '已取消'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.start_date).toLocaleDateString('zh-TW')} ~ {new Date(item.end_date).toLocaleDateString('zh-TW')}
                            <span className="ml-2">({item.days_duration} 天)</span>
                          </div>
                          {item.payment_amount && (
                            <div className="text-xs text-muted-foreground">
                              付款金額：NT$ {item.payment_amount.toLocaleString()}
                              {item.payment_status && (
                                <span className="ml-2">
                                  ({item.payment_status === 'completed' ? '已付款' : item.payment_status === 'pending' ? '待付款' : '付款失敗'})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 付款記錄（可摺疊） */}
        {paymentHistory.length > 0 && (
          <div className="space-y-2" ref={paymentsRef}>
            <Button
              variant="outline"
              onClick={() => {
                setShowPayments(!showPayments)
                if (!showPayments) {
                  setTimeout(() => {
                    paymentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }, 100)
                }
              }}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>付款記錄</span>
              </div>
              {showPayments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <div className={`transition-all duration-300 ${showPayments ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
              <Card>
                <CardContent className="p-4 space-y-3">
                  {paymentHistory.map((item) => (
                    <div
                      key={item.payment_id}
                      className="p-3 border border-border/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">NT$ {item.amount.toLocaleString()}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.payment_status === 'completed' && '已付款'}
                              {item.payment_status === 'pending' && '待付款'}
                              {item.payment_status === 'failed' && '付款失敗'}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.plan_name || '訂閱方案'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            付款方式：
                            {item.payment_method === 'atm' && 'ATM 虛擬帳號'}
                            {item.payment_method === 'barcode' && '超商條碼'}
                            {item.payment_method === 'cvs' && '超商代碼'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleString('zh-TW')}
                          </div>
                          {item.paid_at && (
                            <div className="text-xs text-green-500">
                              付款時間：{new Date(item.paid_at).toLocaleString('zh-TW')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 常見問題 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">常見問題</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-1">Q: 免費試用結束後會怎樣？</h4>
                <p className="text-sm text-muted-foreground">
                  試用期結束後，您將無法繼續上傳和查詢債務資料。您可以隨時訂閱 VIP 月費方案以繼續使用。
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Q: VIP 月費如何計費？</h4>
                <p className="text-sm text-muted-foreground">
                  VIP 月費採用月繳制，每月自動扣款。您可以隨時取消訂閱，取消後將在當期結束時停止服務。
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1">Q: 支援哪些付款方式？</h4>
                <p className="text-sm text-muted-foreground">
                  我們使用綠界金流，支援 ATM 虛擬帳號、超商條碼、超商代碼等多種付款方式。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}

