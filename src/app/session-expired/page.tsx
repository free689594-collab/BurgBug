'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SessionExpiredPage() {
  const router = useRouter()

  useEffect(() => {
    // 清除 localStorage 中的認證資訊
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }, [])

  const handleReLogin = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-dark-200 rounded-lg shadow-xl p-8 border border-dark-100">
          {/* 圖示 */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-dark-300 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-center text-foreground mb-4">
            會話已失效
          </h1>

          {/* 說明文字 */}
          <div className="space-y-4 mb-8">
            <p className="text-foreground-muted text-center">
              您的帳號已在其他裝置登入
            </p>
            
            <div className="bg-dark-300 rounded-md p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">為什麼會發生這種情況？</h3>
              <ul className="text-sm text-foreground-muted space-y-1 list-disc list-inside">
                <li>您在另一個瀏覽器或裝置上登入了此帳號</li>
                <li>系統僅允許單一裝置同時登入</li>
                <li>舊的登入會話已被自動登出</li>
              </ul>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-4">
              <div className="flex items-start">
                <svg
                  className="w-5 h-5 text-yellow-500 mt-0.5 mr-2 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-500 mb-1">安全提醒</h3>
                  <p className="text-xs text-foreground-muted">
                    如果這不是您本人的操作，請立即修改密碼並聯繫管理員
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 重新登入按鈕 */}
          <button
            onClick={handleReLogin}
            className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
          >
            重新登入
          </button>

          {/* 提示文字 */}
          <p className="text-xs text-foreground-muted text-center mt-4">
            點擊上方按鈕返回登入頁面
          </p>
        </div>

        {/* 底部資訊 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-foreground-muted">
            臻好尋 - 債務查詢系統
          </p>
          <p className="text-xs text-foreground-muted mt-2">
            單裝置登入保護機制
          </p>
        </div>
      </div>
    </div>
  )
}

