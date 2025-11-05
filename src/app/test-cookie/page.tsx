'use client'

import { useEffect, useState } from 'react'

export default function TestCookiePage() {
  const [cookieInfo, setCookieInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkCookie = async () => {
      try {
        const response = await fetch('/api/test-cookie')
        const data = await response.json()
        setCookieInfo(data)
      } catch (error) {
        console.error('Error checking cookie:', error)
      } finally {
        setLoading(false)
      }
    }

    checkCookie()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-foreground">檢查中...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-2xl space-y-6 rounded-lg bg-dark-300 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Cookie 測試頁面</h1>
        
        <div className="space-y-4">
          <div className="rounded-lg bg-dark-200 p-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">access_token Cookie</h2>
            {cookieInfo?.hasAccessToken ? (
              <div className="space-y-2">
                <p className="text-green-500">✅ Cookie 存在</p>
                <p className="text-sm text-foreground-muted">
                  Token 長度: {cookieInfo.accessTokenLength} 字元
                </p>
                <p className="text-sm text-foreground-muted">
                  Token 前 50 字元: {cookieInfo.accessTokenPreview}
                </p>
              </div>
            ) : (
              <p className="text-red-500">❌ Cookie 不存在</p>
            )}
          </div>

          <div className="rounded-lg bg-dark-200 p-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">refresh_token Cookie</h2>
            {cookieInfo?.hasRefreshToken ? (
              <div className="space-y-2">
                <p className="text-green-500">✅ Cookie 存在</p>
                <p className="text-sm text-foreground-muted">
                  Token 長度: {cookieInfo.refreshTokenLength} 字元
                </p>
              </div>
            ) : (
              <p className="text-red-500">❌ Cookie 不存在</p>
            )}
          </div>

          <div className="rounded-lg bg-dark-200 p-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">測試說明</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-foreground-muted">
              <li>登入時勾選「保持登入」</li>
              <li>登入成功後，訪問此頁面，應該看到兩個 ✅</li>
              <li>完全關閉瀏覽器</li>
              <li>重新開啟瀏覽器，再次訪問此頁面</li>
              <li>如果還是看到兩個 ✅，表示 Cookie 沒有被清除</li>
              <li>如果看到 ❌，表示 Cookie 被瀏覽器清除了</li>
            </ol>
          </div>

          <div className="rounded-lg bg-dark-200 p-4">
            <h2 className="text-lg font-semibold text-foreground mb-2">可能的原因</h2>
            <ul className="list-disc list-inside space-y-2 text-sm text-foreground-muted">
              <li>瀏覽器設定為「關閉時清除所有 Cookie」</li>
              <li>使用無痕模式（隱私瀏覽）</li>
              <li>瀏覽器擴充功能自動清除 Cookie</li>
              <li>瀏覽器的隱私設定過於嚴格</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-4">
          <a
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90 transition-colors"
          >
            前往登入
          </a>
          <a
            href="/dashboard"
            className="rounded-md bg-dark-100 px-4 py-2 text-foreground hover:bg-dark-100/80 transition-colors"
          >
            前往 Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}

