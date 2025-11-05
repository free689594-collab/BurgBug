'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LevelBadge } from './LevelBadge'
import { TrendingUp, ChevronDown } from 'lucide-react'

interface MemberNavProps {
  className?: string
}

interface MemberInfo {
  account: string
  nickname?: string
  business_type?: string
  business_region?: string
  status: string
  role: string
  quota?: {
    // 支援兩種欄位名稱（與 /profile 頁面保持一致）
    remaining_uploads?: number
    remaining_queries?: number
    uploads_remaining?: number
    queries_remaining?: number
    daily_upload_limit?: number
    daily_query_limit?: number
  }
  // 等級資訊
  level_info?: {
    current_level: number
    title: string
    title_color: string
    activity_points: number
  }
  // 預留未來擴展欄位
  level?: string          // 會員等級（例如：青銅、白銀、黃金）
  badges?: string[]       // 勳章列表
}

export default function MemberNav({ className = '' }: MemberNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [messagesDropdownOpen, setMessagesDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchMemberInfo()
    fetchUnreadCount()

    // 監聽使用者資料更新事件
    const handleUserDataUpdated = () => {
      fetchMemberInfo()
    }

    // 監聽訊息更新事件
    const handleMessagesUpdated = () => {
      fetchUnreadCount()
    }

    window.addEventListener('userDataUpdated', handleUserDataUpdated)
    window.addEventListener('messagesUpdated', handleMessagesUpdated)

    // 定期更新未讀數量（每 30 秒）
    const unreadInterval = setInterval(fetchUnreadCount, 30000)

    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdated)
      window.removeEventListener('messagesUpdated', handleMessagesUpdated)
      clearInterval(unreadInterval)
    }
  }, [])

  const fetchMemberInfo = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMember(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch member info:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const res = await fetch('/api/messages/unread-count', {
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
    { name: '首頁', path: '/dashboard', icon: '🏠' },
    { name: '債務上傳', path: '/debts/upload', icon: '📤' },
    { name: '債務查詢', path: '/debts/search', icon: '🔍' },
    { name: '我的債務人', path: '/debts/my-debtors', icon: '📋' },
  ]

  const messagesItems = [
    { name: '收件箱', path: '/messages/inbox', icon: '📥' },
    { name: '發送訊息', path: '/messages/send', icon: '📤' },
  ]

  // 狀態顯示文字和顏色
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'approved':
        return { text: '已審核', color: 'text-green-400' }
      case 'pending':
        return { text: '待審核', color: 'text-yellow-400' }
      case 'suspended':
        return { text: '已停用', color: 'text-red-400' }
      default:
        return { text: status, color: 'text-foreground-muted' }
    }
  }

  const statusDisplay = member ? getStatusDisplay(member.status) : null

  return (
    <nav className={`bg-dark-300 border-b border-dark-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo 和導航選單 */}
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary">臻好尋</span>
            </div>

            {/* 桌面版導航選單 */}
            <div className="hidden md:ml-6 md:flex md:space-x-4">
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

              {/* 站內信下拉選單 */}
              <div className="relative">
                <button
                  onClick={() => setMessagesDropdownOpen(!messagesDropdownOpen)}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith('/messages')
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
                        className={`w-full text-left flex items-center px-4 py-2 text-sm transition-colors ${
                          pathname === item.path
                            ? 'bg-dark-200 text-primary'
                            : 'text-foreground-muted hover:bg-dark-200 hover:text-foreground'
                        }`}
                      >
                        <span className="mr-2">{item.icon}</span>
                        {item.name}
                        {item.path === '/messages/inbox' && unreadCount > 0 && (
                          <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 會員資訊和登出 */}
          <div className="flex items-center">
            {/* 桌面版會員資訊 */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {member && !loading && (
                <>
                  {/* 等級徽章 */}
                  {member.level_info && (
                    <button
                      onClick={() => router.push('/profile')}
                      className="transition-transform hover:scale-105"
                      title="查看個人資料"
                    >
                      <LevelBadge
                        level={member.level_info.current_level}
                        title={member.level_info.title}
                        titleColor={member.level_info.title_color}
                        size="small"
                      />
                    </button>
                  )}

                  {/* 活躍度點數 */}
                  {member.level_info && (
                    <div className="flex items-center space-x-1 px-2 py-1 bg-dark-200 rounded-md">
                      <TrendingUp className="w-3 h-3" style={{ color: member.level_info.title_color }} />
                      <span className="text-xs font-medium" style={{ color: member.level_info.title_color }}>
                        {member.level_info.activity_points}
                      </span>
                    </div>
                  )}

                  {/* 配額顯示（與 /profile 頁面保持一致）*/}
                  <div className="flex items-center space-x-3 px-3 py-1 bg-dark-200 rounded-md">
                    <div className="text-xs">
                      <div className="text-foreground-muted">上傳</div>
                      <div className="text-foreground font-medium">
                        {(member.quota?.remaining_uploads ?? member.quota?.uploads_remaining ?? 0)}/{member.quota?.daily_upload_limit ?? 10}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-dark-100"></div>
                    <div className="text-xs">
                      <div className="text-foreground-muted">查詢</div>
                      <div className="text-foreground font-medium">
                        {(member.quota?.remaining_queries ?? member.quota?.queries_remaining ?? 0)}/{member.quota?.daily_query_limit ?? 20}
                      </div>
                    </div>
                  </div>

                  {/* 會員資訊 */}
                  <div className="text-sm">
                    <div className="text-foreground font-medium flex items-center space-x-2">
                      <span>{member.nickname || member.account}</span>
                    </div>
                    <div className="text-foreground-muted text-xs flex items-center space-x-2 flex-wrap">
                      <span>{member.business_type || '未設定'}</span>
                      <span>·</span>
                      <span>{member.business_region || '未設定'}</span>
                      <span>·</span>
                      <span className={statusDisplay?.color}>{statusDisplay?.text}</span>
                    </div>
                  </div>
                </>
              )}

              {/* 管理後台按鈕（僅管理員顯示） */}
              {(member?.role === 'admin' || member?.role === 'super_admin') && (
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 rounded-md transition-colors border border-primary/30"
                >
                  ⚙️ 管理後台
                </button>
              )}

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground bg-dark-200 hover:bg-dark-100 rounded-md transition-colors"
              >
                登出
              </button>
            </div>

            {/* 手機版選單按鈕 */}
            <div className="flex items-center md:hidden">
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
        <div className="md:hidden border-t border-dark-200">
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
            <div className="px-2 space-y-1">
              {messagesItems.map((item) => {
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
                    {item.path === '/messages/inbox' && unreadCount > 0 && (
                      <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          
          {member && !loading && (
            <div className="pt-4 pb-3 border-t border-dark-200">
              {/* 手機版會員資訊 */}
              <div className="px-4 mb-3">
                <div className="text-base font-medium text-foreground flex items-center space-x-2">
                  <span>{member.nickname || member.account}</span>
                  {/* 等級徽章 */}
                  {member.level_info && (
                    <button
                      onClick={() => {
                        router.push('/profile')
                        setIsMenuOpen(false)
                      }}
                    >
                      <LevelBadge
                        level={member.level_info.current_level}
                        title={member.level_info.title}
                        titleColor={member.level_info.title_color}
                        size="small"
                      />
                    </button>
                  )}
                </div>
                {/* 活躍度點數 */}
                {member.level_info && (
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3" style={{ color: member.level_info.title_color }} />
                    <span className="text-xs font-medium" style={{ color: member.level_info.title_color }}>
                      活躍度：{member.level_info.activity_points} 點
                    </span>
                  </div>
                )}
                <div className="text-sm text-foreground-muted mt-1">
                  {member.business_type || '未設定'} · {member.business_region || '未設定'}
                </div>
                <div className={`text-sm mt-1 flex items-center space-x-2 ${statusDisplay?.color}`}>
                  <span>{statusDisplay?.text}</span>
                </div>
              </div>

              {/* 手機版配額顯示 */}
              <div className="px-4 mb-3">
                <div className="flex items-center space-x-4 px-3 py-2 bg-dark-200 rounded-md">
                  <div className="text-sm">
                    <div className="text-foreground-muted">今日剩餘上傳</div>
                    <div className="text-foreground font-medium">
                      {(member.quota?.remaining_uploads ?? member.quota?.uploads_remaining ?? 0)} / {(member.quota?.daily_upload_limit ?? 10)} 次
                    </div>
                  </div>
                  <div className="h-10 w-px bg-dark-100"></div>
                  <div className="text-sm">
                    <div className="text-foreground-muted">今日剩餘查詢</div>
                    <div className="text-foreground font-medium">
                      {(member.quota?.remaining_queries ?? member.quota?.queries_remaining ?? 0)} / {(member.quota?.daily_query_limit ?? 20)} 次
                    </div>
                  </div>
                </div>
              </div>

              {/* 手機版管理後台按鈕（僅管理員顯示） */}
              {(member?.role === 'admin' || member?.role === 'super_admin') && (
                <div className="px-2 mb-2">
                  <button
                    onClick={() => {
                      router.push('/admin/dashboard')
                      setIsMenuOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-base font-medium text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 rounded-md transition-colors border border-primary/30"
                  >
                    ⚙️ 管理後台
                  </button>
                </div>
              )}

              {/* 手機版登出按鈕 */}
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

