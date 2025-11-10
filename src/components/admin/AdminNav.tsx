'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface AdminNavProps {
  className?: string
}

export default function AdminNav({ className = '' }: AdminNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [subscriptionDropdownOpen, setSubscriptionDropdownOpen] = useState(false)
  const [messagesDropdownOpen, setMessagesDropdownOpen] = useState(false)
  const [systemDropdownOpen, setSystemDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // 從 localStorage 取得使用者資訊
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const userData = JSON.parse(userStr)
        setUser(userData)

        // 如果是管理員，載入完整的會員資料（包含暱稱、等級等）
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          fetchAdminProfile(userData.id)
          fetchUnreadCount()
        }
      } catch (e) {
        console.error('Failed to parse user:', e)
      }
    }
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const res = await fetch('/api/admin/messages/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setUnreadCount(data.data.count || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const fetchAdminProfile = async (userId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const res = await fetch(`/api/member/profile?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          // 合併管理員資料
          setUser((prev: any) => ({
            ...prev,
            nickname: data.data.user?.nickname,
            level: data.data.level?.current_level,
            level_name: data.data.level?.title,
            activity_points: data.data.level?.activity_points
          }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin profile:', error)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
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

  const navItems = [
    { name: '儀表板', path: '/admin/dashboard', icon: '📊' },
    { name: '會員管理', path: '/admin/members', icon: '👥' },
    { name: '債務管理', path: '/admin/debts', icon: '📋' },
  ]

  const subscriptionItems = [
    { name: '訂閱管理', path: '/admin/subscription-management', icon: '💳' },
    { name: '報表分析', path: '/admin/analytics', icon: '📈' },
  ]

  const messagesItems = [
    { name: '收件箱', path: '/admin/messages/inbox', icon: '📥' },
    { name: '發送訊息', path: '/admin/messages/send', icon: '📤' },
  ]

  const systemItems = [
    { name: '審計日誌', path: '/admin/audit-logs', icon: '📝' },
    { name: '等級配置', path: '/admin/level-config', icon: '🏆' },
    { name: '活躍度規則', path: '/admin/activity-rules', icon: '⚡' },
  ]

  return (
    <nav className={`bg-dark-300 border-b border-dark-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo 和導航選單 */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary">臻好尋</span>
              <span className="ml-2 text-sm text-foreground-muted">管理後台</span>
            </div>

            {/* 桌面版導航選單 */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4 sm:items-center">
              {navItems.map((item) => {
                const isActive = pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-dark-200 text-primary'
                        : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                )
              })}

              {/* 訂閱管理下拉選單 */}
              <div className="relative">
                <button
                  onClick={() => setSubscriptionDropdownOpen(!subscriptionDropdownOpen)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith('/admin/subscription-management') ||
                    pathname.startsWith('/admin/analytics')
                      ? 'bg-dark-200 text-primary'
                      : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">💰</span>
                  訂閱管理
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                {subscriptionDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-dark-300 border border-dark-200 rounded-md shadow-lg z-50">
                    {subscriptionItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          router.push(item.path)
                          setSubscriptionDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors ${
                          pathname === item.path
                            ? 'bg-dark-200 text-primary'
                            : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 站內信下拉選單 */}
              <div className="relative">
                <button
                  onClick={() => setMessagesDropdownOpen(!messagesDropdownOpen)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith('/admin/messages')
                      ? 'bg-dark-200 text-primary'
                      : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">✉️</span>
                  站內信
                  {unreadCount > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {unreadCount}
                    </span>
                  )}
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                {messagesDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-dark-300 border border-dark-200 rounded-md shadow-lg z-50">
                    {messagesItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          router.push(item.path)
                          setMessagesDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors ${
                          pathname === item.path
                            ? 'bg-dark-200 text-primary'
                            : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                        {item.name === '收件箱' && unreadCount > 0 && (
                          <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 系統配置下拉選單 */}
              <div className="relative">
                <button
                  onClick={() => setSystemDropdownOpen(!systemDropdownOpen)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith('/admin/audit-logs') ||
                    pathname.startsWith('/admin/level-config') ||
                    pathname.startsWith('/admin/activity-rules')
                      ? 'bg-dark-200 text-primary'
                      : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">⚙️</span>
                  系統配置
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                {systemDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-dark-300 border border-dark-200 rounded-md shadow-lg z-50">
                    {systemItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          router.push(item.path)
                          setSystemDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors ${
                          pathname === item.path
                            ? 'bg-dark-200 text-primary'
                            : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 使用者資訊和登出 */}
          <div className="flex items-center">
            {/* 桌面版使用者資訊 */}
            <div className="hidden sm:flex sm:items-center sm:space-x-4">
              {user && (
                <div className="flex items-center space-x-3">
                  {/* 大頭貼 */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {user.nickname ? user.nickname.charAt(0) : user.account.charAt(0).toUpperCase()}
                  </div>

                  {/* 資訊 */}
                  <div className="text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="text-foreground font-medium">
                        {user.nickname || user.account}
                      </span>
                      {user.level && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                          LV{user.level}
                        </span>
                      )}
                    </div>
                    <div className="text-foreground-muted text-xs">
                      {user.level_name || (user.role === 'super_admin' ? '最高權限管理員' : user.role === 'admin' ? '一般管理員' : '會員')}
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground bg-dark-200 hover:bg-dark-100 rounded-md transition-colors"
              >
                登出
              </button>
            </div>

            {/* 手機版選單按鈕 */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-foreground-muted hover:text-foreground hover:bg-dark-200 transition-colors"
              >
                <span className="sr-only">開啟選單</span>
                {isMenuOpen ? (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 手機版選單 */}
      {isMenuOpen && (
        <div className="sm:hidden border-t border-dark-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    router.push(item.path)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full text-left flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-dark-200 text-primary'
                      : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </button>
              )
            })}

            {/* 訂閱管理區塊 */}
            <div className="pt-2">
              <div className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center">
                <span className="mr-2">💰</span>
                訂閱管理
              </div>
              {subscriptionItems.map((item) => {
                const isActive = pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full text-left flex items-center px-6 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-dark-200 text-primary'
                        : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                )
              })}
            </div>

            {/* 站內信區塊 */}
            <div className="pt-2">
              <div className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center">
                <span className="mr-2">✉️</span>
                站內信
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              {messagesItems.map((item) => {
                const isActive = pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full text-left flex items-center px-6 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-dark-200 text-primary'
                        : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                    {item.name === '收件箱' && unreadCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* 系統配置區塊 */}
            <div className="pt-2">
              <div className="px-3 py-2 text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center">
                <span className="mr-2">⚙️</span>
                系統配置
              </div>
              {systemItems.map((item) => {
                const isActive = pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      router.push(item.path)
                      setIsMenuOpen(false)
                    }}
                    className={`w-full text-left flex items-center px-6 py-2 text-base font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-dark-200 text-primary'
                        : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </button>
                )
              })}
            </div>
          </div>
          {user && (
            <div className="pt-4 pb-3 border-t border-dark-200">
              <div className="px-4 mb-3">
                <div className="flex items-center space-x-3 mb-2">
                  {/* 大頭貼 */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {user.nickname ? user.nickname.charAt(0) : user.account.charAt(0).toUpperCase()}
                  </div>

                  {/* 資訊 */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-base font-medium text-foreground">
                        {user.nickname || user.account}
                      </span>
                      {user.level && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                          LV{user.level}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-foreground-muted">
                      {user.level_name || (user.role === 'super_admin' ? '最高權限管理員' : user.role === 'admin' ? '一般管理員' : '會員')}
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-base font-medium text-foreground-muted hover:text-foreground hover:bg-dark-200 rounded-md transition-colors"
                >
                  登出
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

