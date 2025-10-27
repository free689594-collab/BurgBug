'use client'

import MemberNav from '@/components/member/MemberNav'

interface MemberLayoutProps {
  children: React.ReactNode
}

/**
 * 會員頁面統一佈局組件
 * 
 * 功能：
 * - 整合 MemberNav 導航欄
 * - 提供統一的頁面容器
 * - 響應式設計
 * - 保持黑色調主題
 * 
 * 使用方式：
 * ```tsx
 * <MemberLayout>
 *   <YourPageContent />
 * </MemberLayout>
 * ```
 */
export default function MemberLayout({ children }: MemberLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 導航欄 */}
      <MemberNav />
      
      {/* 主要內容區域 */}
      <main className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  )
}

