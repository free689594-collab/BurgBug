'use client'

/**
 * 付款結果頁面
 * /subscription/payment/result
 * 
 * 功能：
 * 1. 顯示付款處理中的訊息
 * 2. 等待後端處理完成
 * 3. 導向訂閱管理頁面
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaymentResultPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    // 倒數計時
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/subscription')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-dark-300 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-dark-200 border-dark-100">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-blue-400 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <CardTitle className="text-2xl text-foreground">付款處理中</CardTitle>
          <CardDescription className="text-foreground-muted">
            我們正在處理您的付款，請稍候...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-dark-100 rounded-lg">
            <p className="text-sm text-foreground-muted text-center">
              付款完成後，系統會自動更新您的訂閱狀態。
            </p>
            <p className="text-sm text-foreground-muted text-center mt-2">
              {countdown} 秒後自動導向訂閱管理頁面...
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>驗證付款資訊</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>更新訂閱狀態</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground-muted">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>啟用 VIP 權限</span>
            </div>
          </div>

          <div className="pt-4 border-t border-dark-100">
            <button
              onClick={() => router.push('/subscription')}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              立即前往訂閱管理
            </button>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-200 text-center">
              💡 如果長時間未更新，請重新整理頁面或聯繫客服
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

