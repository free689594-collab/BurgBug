'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function WaitingApprovalContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const isNewRegistration = searchParams.get('registered') === 'true'
  const status = searchParams.get('status') || 'pending' // 從 URL 取得狀態，預設為 pending

  useEffect(() => {
    // 從 localStorage 取得使用者資訊
    const userStr = localStorage.getItem('user')
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token')

      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // 清除 localStorage
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')

      // 導向根目錄（顯示歡迎首頁）
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-dark-200 rounded-lg shadow-xl p-8 border border-dark-100">
          {/* 圖示 */}
          <div className="flex justify-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              status === 'suspended' ? 'bg-red-900/20' : 'bg-dark-300'
            }`}>
              {status === 'suspended' ? (
                <svg
                  className="w-10 h-10 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                  />
                </svg>
              ) : (
                <svg
                  className="w-10 h-10 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* 標題 */}
          <h1 className="text-2xl font-bold text-center text-foreground mb-4">
            {status === 'suspended'
              ? '帳號已停用'
              : isNewRegistration
                ? '註冊成功！'
                : '帳號審核中'}
          </h1>

          {/* 說明文字 */}
          <div className="space-y-4 mb-8">
            {isNewRegistration && status !== 'suspended' && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mb-4">
                <p className="text-green-400 text-sm text-center">
                  ✓ 您的帳號已成功建立！請等待管理員審核。
                </p>
              </div>
            )}

            {status === 'suspended' && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-4">
                <p className="text-red-400 text-sm text-center">
                  ⚠ 您的帳號已被停用，無法使用系統功能。
                </p>
              </div>
            )}

            <p className="text-foreground-muted text-center">
              {status === 'suspended'
                ? '您的帳號已被管理員停用'
                : '您的帳號正在等待管理員審核'}
            </p>

            {user && (
              <div className="bg-dark-300 rounded-md p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">帳號：</span>
                  <span className="text-foreground font-medium">{user.account}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-muted">狀態：</span>
                  <span className={`font-medium ${
                    status === 'suspended' ? 'text-red-400' : 'text-yellow-500'
                  }`}>
                    {status === 'suspended' ? '已停用' : '待審核'}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-dark-300 rounded-md p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">
                {status === 'suspended' ? '停用說明' : '審核說明'}
              </h3>
              <ul className="text-sm text-foreground-muted space-y-1 list-disc list-inside">
                {status === 'suspended' ? (
                  <>
                    <li>您的帳號已被管理員停用</li>
                    <li>停用期間無法使用任何系統功能</li>
                    <li>如有疑問，請聯繫系統管理員</li>
                    <li>若需恢復使用，請等待管理員重新啟用</li>
                  </>
                ) : (
                  <>
                    <li>管理員將在 1-3 個工作天內完成審核</li>
                    <li>審核通過後，您將可以使用所有功能</li>
                    <li>如有疑問，請聯繫系統管理員</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* 登出按鈕 */}
          <button
            onClick={handleLogout}
            className="w-full bg-dark-300 hover:bg-dark-100 text-foreground font-medium py-3 px-4 rounded-md transition-colors duration-200 border border-dark-100"
          >
            登出
          </button>

          {/* 提示文字 */}
          <p className="text-xs text-foreground-muted text-center mt-4">
            {status === 'suspended'
              ? '帳號恢復後，請重新登入以使用完整功能'
              : '審核通過後，請重新登入以使用完整功能'}
          </p>
        </div>

        {/* 底部資訊 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-foreground-muted">
            臻好尋 - 債務查詢系統
          </p>
        </div>
      </div>
    </div>
  )
}

export default function WaitingApprovalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">載入中...</div>
      </div>
    }>
      <WaitingApprovalContent />
    </Suspense>
  )
}

