'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Save } from 'lucide-react'

interface SubscriptionConfig {
  trial_days: number
  monthly_price: number
  free_upload_quota: number
  free_query_quota: number
  vip_upload_daily: number
  vip_query_daily: number
  notify_before_days: number[]
  ecpay_merchant_id: string
  ecpay_hash_key: string
  ecpay_hash_iv: string
  ecpay_test_mode: boolean
}

export default function AdminSubscriptionConfigPage() {
  const router = useRouter()
  const [config, setConfig] = useState<SubscriptionConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/subscription/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('需要管理員權限')
        }
        throw new Error('查詢配置失敗')
      }

      const data = await response.json()
      setConfig(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/subscription/config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '更新配置失敗')
      }

      setSuccess('配置更新成功！')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof SubscriptionConfig, value: any) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
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

  if (error && !config) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">{error}</div>
        </div>
      </AdminLayout>
    )
  }

  if (!config) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-red-400">無法載入配置</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">訂閱系統配置</h1>
          <p className="text-muted-foreground mt-1">管理訂閱系統的參數設定</p>
        </div>

        {/* 成功訊息 */}
        {success && (
          <div className="flex items-start gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-200">{success}</div>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">{error}</div>
          </div>
        )}

        {/* 訂閱方案設定 */}
        <Card>
          <CardHeader>
            <CardTitle>訂閱方案設定</CardTitle>
            <CardDescription>設定免費試用和 VIP 月費的參數</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 免費試用設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">免費試用</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="trial_days">試用天數</Label>
                  <Input
                    id="trial_days"
                    type="number"
                    value={config.trial_days}
                    onChange={(e) => handleChange('trial_days', parseInt(e.target.value))}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free_upload_quota">上傳額度（總次數）</Label>
                  <Input
                    id="free_upload_quota"
                    type="number"
                    value={config.free_upload_quota}
                    onChange={(e) => handleChange('free_upload_quota', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="free_query_quota">查詢額度（總次數）</Label>
                  <Input
                    id="free_query_quota"
                    type="number"
                    value={config.free_query_quota}
                    onChange={(e) => handleChange('free_query_quota', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* VIP 月費設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">VIP 月費</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_price">月費價格（NT$）</Label>
                  <Input
                    id="monthly_price"
                    type="number"
                    value={config.monthly_price}
                    onChange={(e) => handleChange('monthly_price', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vip_upload_daily">上傳額度（每日）</Label>
                  <Input
                    id="vip_upload_daily"
                    type="number"
                    value={config.vip_upload_daily}
                    onChange={(e) => handleChange('vip_upload_daily', parseInt(e.target.value))}
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vip_query_daily">查詢額度（每日）</Label>
                  <Input
                    id="vip_query_daily"
                    type="number"
                    value={config.vip_query_daily}
                    onChange={(e) => handleChange('vip_query_daily', parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 通知設定 */}
        <Card>
          <CardHeader>
            <CardTitle>通知設定</CardTitle>
            <CardDescription>設定到期前通知的天數</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notify_before_days">到期前通知天數（逗號分隔）</Label>
              <Input
                id="notify_before_days"
                type="text"
                value={config.notify_before_days.join(',')}
                onChange={(e) => handleChange('notify_before_days', e.target.value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d)))}
                placeholder="例如: 7,3,1"
              />
              <p className="text-xs text-muted-foreground">
                目前設定: {config.notify_before_days.join(', ')} 天前通知
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 綠界金流設定 */}
        <Card>
          <CardHeader>
            <CardTitle>綠界金流設定</CardTitle>
            <CardDescription>設定 ECPay 金流參數（Phase 4 實作）</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ecpay_merchant_id">商店代號（Merchant ID）</Label>
              <Input
                id="ecpay_merchant_id"
                type="text"
                value={config.ecpay_merchant_id || ''}
                onChange={(e) => handleChange('ecpay_merchant_id', e.target.value)}
                placeholder="2000132"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ecpay_hash_key">Hash Key</Label>
              <Input
                id="ecpay_hash_key"
                type="password"
                value={config.ecpay_hash_key || ''}
                onChange={(e) => handleChange('ecpay_hash_key', e.target.value)}
                placeholder="請輸入 Hash Key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ecpay_hash_iv">Hash IV</Label>
              <Input
                id="ecpay_hash_iv"
                type="password"
                value={config.ecpay_hash_iv || ''}
                onChange={(e) => handleChange('ecpay_hash_iv', e.target.value)}
                placeholder="請輸入 Hash IV"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="ecpay_test_mode"
                type="checkbox"
                checked={config.ecpay_test_mode}
                onChange={(e) => handleChange('ecpay_test_mode', e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="ecpay_test_mode" className="cursor-pointer">
                測試模式（使用綠界測試環境）
              </Label>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-xs text-yellow-200">
                ⚠️ 綠界金流整合將在 Phase 4 實作。目前可以先設定測試環境參數。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 儲存按鈕 */}
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/subscription/stats')}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? '儲存中...' : '儲存設定'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}

