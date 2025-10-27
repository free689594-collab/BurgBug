'use client'

import AdminNav from '@/components/admin/AdminNav'

interface AdminLayoutProps {
  children: React.ReactNode
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
export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <AdminNav />
      
      {/* 主要內容區域 */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  )
}

