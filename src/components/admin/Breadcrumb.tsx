'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  customItems?: BreadcrumbItem[]
}

// 路徑對應的中文名稱
const pathLabels: Record<string, string> = {
  // 主要導航
  'dashboard': '儀表板',
  'members': '會員管理',
  'debts': '債務管理',
  'messages': '站內信',
  'audit-logs': '審計日誌',
  'level-config': '等級配置',
  'activity-rules': '活躍度規則',
  
  // 訂閱管理
  'subscription-management': '訂閱管理',
  'analytics': '報表分析',
  
  // 站內信
  'inbox': '收件箱',
  'send': '發送訊息',
  
  // 詳情頁
  'edit': '編輯',
  'view': '查看',
  'create': '新增',
  'detail': '詳情',
}

export default function Breadcrumb({ customItems }: BreadcrumbProps) {
  const router = useRouter()
  const pathname = usePathname()

  // 如果有自訂項目，直接使用
  if (customItems) {
    return (
      <nav className="flex items-center space-x-2 text-sm text-foreground-muted mb-6">
        <button
          onClick={() => router.push('/admin/dashboard')}
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="w-4 h-4" />
        </button>
        {customItems.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <ChevronRight className="w-4 h-4" />
            {item.path ? (
              <button
                onClick={() => item.path && router.push(item.path)}
                className="hover:text-foreground transition-colors"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    )
  }

  // 自動生成麵包屑
  const pathSegments = pathname.split('/').filter(Boolean)
  
  // 移除 'admin' 前綴
  if (pathSegments[0] === 'admin') {
    pathSegments.shift()
  }

  // 如果是首頁，不顯示麵包屑
  if (pathSegments.length === 0 || (pathSegments.length === 1 && pathSegments[0] === 'dashboard')) {
    return null
  }

  // 生成麵包屑項目
  const breadcrumbItems: BreadcrumbItem[] = pathSegments.map((segment, index) => {
    const path = `/admin/${pathSegments.slice(0, index + 1).join('/')}`
    const label = pathLabels[segment] || segment
    
    // 最後一個項目不需要路徑（當前頁面）
    return {
      label,
      path: index === pathSegments.length - 1 ? undefined : path
    }
  })

  return (
    <nav className="flex items-center space-x-2 text-sm text-foreground-muted mb-6">
      {/* 首頁圖示 */}
      <button
        onClick={() => router.push('/admin/dashboard')}
        className="flex items-center hover:text-foreground transition-colors"
        title="返回儀表板"
      >
        <Home className="w-4 h-4" />
      </button>

      {/* 麵包屑項目 */}
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ChevronRight className="w-4 h-4" />
          {item.path ? (
            <button
              onClick={() => item.path && router.push(item.path)}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

