'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import Breadcrumb from '@/components/admin/Breadcrumb'
import CommandPalette from '@/components/admin/CommandPalette'
import KeyboardShortcutsHelp from '@/components/admin/KeyboardShortcutsHelp'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface AdminLayoutProps {
  children: React.ReactNode
  breadcrumbItems?: BreadcrumbItem[]
}

/**
 * 管理員頁面統一佈局組件
 * 
 * 功能：
 * - 整合 AdminNav 導航欄
 * - 提供統一的頁面容器
 * - 響應式設計
 * - 保持黑色調主題
 * 
 * 使用方式：
 * ```tsx
 * <AdminLayout>
 *   <YourPageContent />
 * </AdminLayout>
 * ```
 */
export default function AdminLayout({ children, breadcrumbItems }: AdminLayoutProps) {
  const router = useRouter()
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false)

  // 快捷鍵支援
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K 或 Cmd+K：開啟全域搜尋
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }

      // Ctrl+/ 或 Cmd+/：顯示快捷鍵列表
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        setShortcutsHelpOpen(true)
      }

      // Ctrl+1-6 或 Cmd+1-6：快速導航
      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault()
        const routes = [
          '/admin/dashboard',           // Ctrl+1
          '/admin/members',              // Ctrl+2
          '/admin/debts',                // Ctrl+3
          '/admin/subscription-management', // Ctrl+4
          '/admin/messages/inbox',       // Ctrl+5
          '/admin/audit-logs'            // Ctrl+6
        ]
        const index = parseInt(e.key) - 1
        if (routes[index]) {
          router.push(routes[index])
        }
      }

      // Esc：關閉彈窗
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false)
        setShortcutsHelpOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <AdminNav />

      {/* 主要內容區域 */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* 麵包屑導航 */}
        <Breadcrumb customItems={breadcrumbItems} />

        {children}
      </main>

      {/* Command Palette */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* 快捷鍵提示面板 */}
      <KeyboardShortcutsHelp open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
    </div>
  )
}

