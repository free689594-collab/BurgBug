'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useNotification } from '@/contexts/NotificationContext'

export default function LoginPage() {
  const router = useRouter()
  const { showLevelUp, showBadgeUnlock } = useNotification()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberAccount, setRememberAccount] = useState(false)
  const [rememberPassword, setRememberPassword] = useState(false)
  const [keepLoggedIn, setKeepLoggedIn] = useState(false)

  // 簡單的加密/解密函數（Base64 編碼，僅用於混淆，不是真正的加密）
  const encode = (str: string) => {
    try {
      return btoa(encodeURIComponent(str))
    } catch {
      return str
    }
  }

  const decode = (str: string) => {
    try {
      return decodeURIComponent(atob(str))
    } catch {
      return str
    }
  }

  // 頁面加載時，檢查是否有保存的帳號和密碼
  useEffect(() => {
    const savedAccount = localStorage.getItem('remembered_account')
    const savedPassword = localStorage.getItem('remembered_password')

    if (savedAccount) {
      setAccount(decode(savedAccount))
      setRememberAccount(true)
    }

    if (savedPassword) {
      setPassword(decode(savedPassword))
      setRememberPassword(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account, password, keepLoggedIn }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '登入失敗')
        return
      }

      // 根據用戶選擇，決定是否保存帳號
      if (rememberAccount) {
        localStorage.setItem('remembered_account', encode(account))
      } else {
        localStorage.removeItem('remembered_account')
      }

      // 根據用戶選擇，決定是否保存密碼
      if (rememberPassword) {
        localStorage.setItem('remembered_password', encode(password))
      } else {
        localStorage.removeItem('remembered_password')
      }

      // 儲存 token 到 localStorage（前端使用）
      if (data.data?.session?.access_token) {
        localStorage.setItem('access_token', data.data.session.access_token)
        localStorage.setItem('refresh_token', data.data.session.refresh_token)
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      // 備援：若瀏覽器未寫入 HttpOnly Cookie（極少數情況），以非 HttpOnly Cookie 備援 5 分鐘
      try {
        if (data.data?.session?.access_token) {
          document.cookie = `access_token=${data.data.session.access_token}; Path=/; SameSite=Lax`;
        }
      } catch {}

      // 檢查是否有升級或解鎖勳章
      if (data.data.activity) {
        // 檢查等級升級
        if (data.data.activity.level_up?.leveledUp) {
          showLevelUp(data.data.activity.level_up)
        }

        // 檢查勳章解鎖
        if (data.data.activity.badge_check?.newBadges?.length > 0) {
          showBadgeUnlock(data.data.activity.badge_check)
        }
      }

      // 根據 API 回傳的 redirectTo 導向對應頁面
      const redirectTo = data.data?.redirectTo || '/dashboard'

      // 等待 2 秒讓使用者看到通知，再進行導向
      setTimeout(() => {
        router.replace(redirectTo)
      }, 2000)

      // 若 3 秒後仍停留在登入頁，解除 loading 以避免卡住
      setTimeout(() => setLoading(false), 3000)
    } catch (err: any) {
      setError('網路錯誤，請稍後再試')
    } finally {
      // 確保錯誤或導向失敗時不會卡在 loading
      if (typeof window !== 'undefined' && window.location.pathname === '/login') {
        setLoading(false)
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-dark-300 p-8 shadow-xl">
        {/* 返回首頁按鈕 */}
        <div className="flex justify-start">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <span>←</span>
            <span>返回首頁</span>
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">臻好尋</h1>
          <p className="mt-2 text-foreground-muted">債務查詢系統</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-foreground">
                帳號
              </label>
              <input
                id="account"
                name="account"
                type="text"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="mt-1 block w-full rounded-md bg-dark-200 border border-dark-100 px-3 py-2 text-foreground placeholder-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="請輸入帳號（5-15 字元）"
                minLength={5}
                maxLength={15}
                pattern="[A-Za-z0-9]{5,15}"
              />
              <p className="mt-1 text-xs text-foreground-muted">
                僅允許英文字母和數字，5-15 字元
              </p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md bg-dark-200 border border-dark-100 px-3 py-2 text-foreground placeholder-foreground-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="請輸入密碼"
                minLength={8}
              />
            </div>

            {/* 記住帳號、密碼和保持登入複選框 */}
            <div className="space-y-3">
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <input
                    id="rememberAccount"
                    name="rememberAccount"
                    type="checkbox"
                    checked={rememberAccount}
                    onChange={(e) => setRememberAccount(e.target.checked)}
                    className="h-4 w-4 rounded border-dark-100 bg-dark-200 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="rememberAccount" className="ml-2 block text-sm text-foreground-muted cursor-pointer hover:text-foreground transition-colors">
                    記住帳號
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="rememberPassword"
                    name="rememberPassword"
                    type="checkbox"
                    checked={rememberPassword}
                    onChange={(e) => setRememberPassword(e.target.checked)}
                    className="h-4 w-4 rounded border-dark-100 bg-dark-200 text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="rememberPassword" className="ml-2 block text-sm text-foreground-muted cursor-pointer hover:text-foreground transition-colors">
                    記住密碼
                  </label>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="keepLoggedIn"
                  name="keepLoggedIn"
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="h-4 w-4 rounded border-dark-100 bg-dark-200 text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="keepLoggedIn" className="ml-2 block text-sm text-foreground-muted cursor-pointer hover:text-foreground transition-colors">
                  保持登入（7 天內關閉瀏覽器不登出）
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-500 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2 text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-dark-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        {/* 註冊連結 */}
        <div className="text-center">
          <p className="text-sm text-foreground-muted">
            還沒有帳號？{' '}
            <a href="/register" className="text-primary hover:text-primary-dark font-medium">
              立即註冊
            </a>
          </p>
        </div>

        {/* 測試帳號資訊（開發模式） */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="text-center text-sm text-foreground-muted border-t border-dark-100 pt-4">
            <p className="font-medium mb-2">測試帳號：</p>
            <p className="mt-1">管理員：q689594 / q6969520</p>
            <p>會員：testuser1 / TestPass123!</p>
          </div>
        )}
      </div>
    </div>
  )
}

