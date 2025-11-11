'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CreditCard, LogOut } from 'lucide-react'

function SubscriptionExpiredContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/dashboard'
  const [isLoading, setIsLoading] = useState(false)

  const handleRenew = () => {
    setIsLoading(true)
    router.push('/subscription')
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        router.push('/login')
      }
    } catch (error) {
      console.error('登出失敗:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <Card className="w-full max-w-md border-yellow-500/20 bg-gray-800/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            訂閱已過期
          </CardTitle>
          <CardDescription className="text-gray-400">
            您的訂閱已經過期，請續費以繼續使用服務
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 提示訊息 */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <p className="text-sm text-yellow-200">
              訂閱過期後，您將無法：
            </p>
            <ul className="mt-2 space-y-1 text-sm text-gray-300 list-disc list-inside">
              <li>上傳新的債務記錄</li>
              <li>查詢債務資訊</li>
              <li>使用其他進階功能</li>
            </ul>
          </div>

          {/* 操作按鈕 */}
          <div className="space-y-3">
            <Button
              onClick={handleRenew}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              立即續費
            </Button>

            <Button
              onClick={handleLogout}
              disabled={isLoading}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>

          {/* 說明文字 */}
          <div className="text-center text-sm text-gray-400">
            <p>如有任何問題，請聯繫客服</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SubscriptionExpiredPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">載入中...</div>}>
      <SubscriptionExpiredContent />
    </Suspense>
  )
}
