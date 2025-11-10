'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import { 
  Search, 
  Home, 
  Users, 
  FileText, 
  Mail, 
  Settings,
  CreditCard,
  BarChart3,
  User,
  DollarSign,
  Calendar
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PageItem {
  id: string
  title: string
  path: string
  icon: React.ReactNode
  category: string
}

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  path: string
  icon: React.ReactNode
  category: string
}

export default function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // 頁面列表
  const pages: PageItem[] = [
    { id: 'dashboard', title: '儀表板', path: '/admin/dashboard', icon: <Home className="w-4 h-4" />, category: '主要功能' },
    { id: 'members', title: '會員管理', path: '/admin/members', icon: <Users className="w-4 h-4" />, category: '主要功能' },
    { id: 'debts', title: '債務管理', path: '/admin/debts', icon: <FileText className="w-4 h-4" />, category: '主要功能' },
    { id: 'subscription', title: '訂閱管理', path: '/admin/subscription-management', icon: <CreditCard className="w-4 h-4" />, category: '訂閱管理' },
    { id: 'analytics', title: '報表分析', path: '/admin/analytics', icon: <BarChart3 className="w-4 h-4" />, category: '訂閱管理' },
    { id: 'inbox', title: '收件箱', path: '/admin/messages/inbox', icon: <Mail className="w-4 h-4" />, category: '站內信' },
    { id: 'send', title: '發送訊息', path: '/admin/messages/send', icon: <Mail className="w-4 h-4" />, category: '站內信' },
    { id: 'audit', title: '審計日誌', path: '/admin/audit-logs', icon: <Settings className="w-4 h-4" />, category: '系統配置' },
    { id: 'level', title: '等級配置', path: '/admin/level-config', icon: <Settings className="w-4 h-4" />, category: '系統配置' },
    { id: 'activity', title: '活躍度規則', path: '/admin/activity-rules', icon: <Settings className="w-4 h-4" />, category: '系統配置' },
  ]

  // 搜尋會員、訂閱、付款記錄
  const searchData = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      // 並行搜尋會員、訂閱、付款記錄
      const [membersRes, subscriptionsRes, paymentsRes] = await Promise.all([
        fetch(`/api/admin/members/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/subscription/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/payments/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const results: SearchResult[] = []

      // 處理會員搜尋結果
      if (membersRes.ok) {
        const data = await membersRes.json()
        if (data.success && data.data) {
          data.data.slice(0, 5).forEach((member: any) => {
            results.push({
              id: `member-${member.id}`,
              title: member.nickname || member.account,
              subtitle: `帳號：${member.account} | ${member.business_type || '未設定'}`,
              path: `/admin/members/${member.id}`,
              icon: <User className="w-4 h-4" />,
              category: '會員'
            })
          })
        }
      }

      // 處理訂閱搜尋結果
      if (subscriptionsRes.ok) {
        const data = await subscriptionsRes.json()
        if (data.success && data.data) {
          data.data.slice(0, 5).forEach((sub: any) => {
            results.push({
              id: `subscription-${sub.id}`,
              title: `${sub.member_account} - ${sub.plan_name}`,
              subtitle: `狀態：${sub.status} | 到期：${sub.end_date}`,
              path: `/admin/subscription-management?member=${sub.member_account}`,
              icon: <CreditCard className="w-4 h-4" />,
              category: '訂閱'
            })
          })
        }
      }

      // 處理付款搜尋結果
      if (paymentsRes.ok) {
        const data = await paymentsRes.json()
        if (data.success && data.data) {
          data.data.slice(0, 5).forEach((payment: any) => {
            results.push({
              id: `payment-${payment.id}`,
              title: `訂單 ${payment.merchant_trade_no}`,
              subtitle: `金額：NT$ ${payment.amount} | ${payment.status}`,
              path: `/admin/subscription-management?payment=${payment.id}`,
              icon: <DollarSign className="w-4 h-4" />,
              category: '付款記錄'
            })
          })
        }
      }

      setSearchResults(results)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 防抖搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      searchData(search)
    }, 300)

    return () => clearTimeout(timer)
  }, [search, searchData])

  // 處理選擇
  const handleSelect = (path: string) => {
    router.push(path)
    onOpenChange(false)
    setSearch('')
  }

  // 過濾頁面
  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(search.toLowerCase())
  )

  // 按類別分組
  const groupedPages = filteredPages.reduce((acc, page) => {
    if (!acc[page.category]) {
      acc[page.category] = []
    }
    acc[page.category].push(page)
    return acc
  }, {} as Record<string, PageItem[]>)

  const groupedResults = searchResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = []
    }
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  return (
    <Command.Dialog 
      open={open} 
      onOpenChange={onOpenChange}
      label="全域搜尋"
      className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl bg-dark-300 border border-dark-200 rounded-lg shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center border-b border-dark-200 px-4">
        <Search className="w-5 h-5 text-foreground-muted mr-2" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="搜尋頁面、會員、訂閱、付款記錄..."
          className="w-full bg-transparent py-4 text-foreground placeholder:text-foreground-muted outline-none"
        />
      </div>

      <Command.List className="max-h-96 overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-sm text-foreground-muted">
          {loading ? '搜尋中...' : '沒有找到結果'}
        </Command.Empty>

        {/* 頁面結果 */}
        {Object.entries(groupedPages).map(([category, items]) => (
          <Command.Group key={category} heading={category} className="mb-2">
            {items.map((page) => (
              <Command.Item
                key={page.id}
                value={page.title}
                onSelect={() => handleSelect(page.path)}
                className="flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-dark-200 transition-colors data-[selected=true]:bg-dark-200"
              >
                <div className="mr-3 text-foreground-muted">{page.icon}</div>
                <span className="text-foreground">{page.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}

        {/* 搜尋結果 */}
        {Object.entries(groupedResults).map(([category, items]) => (
          <Command.Group key={category} heading={category} className="mb-2">
            {items.map((result) => (
              <Command.Item
                key={result.id}
                value={result.title}
                onSelect={() => handleSelect(result.path)}
                className="flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-dark-200 transition-colors data-[selected=true]:bg-dark-200"
              >
                <div className="mr-3 text-foreground-muted">{result.icon}</div>
                <div className="flex-1">
                  <div className="text-foreground">{result.title}</div>
                  {result.subtitle && (
                    <div className="text-xs text-foreground-muted mt-0.5">{result.subtitle}</div>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>

      <div className="border-t border-dark-200 px-4 py-2 text-xs text-foreground-muted flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>↑↓ 選擇</span>
          <span>Enter 確認</span>
          <span>Esc 關閉</span>
        </div>
        <span>Ctrl+K 開啟搜尋</span>
      </div>
    </Command.Dialog>
  )
}

