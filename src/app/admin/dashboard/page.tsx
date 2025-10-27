'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import StatCard from '@/components/stats/StatCard'
import TrendChart from '@/components/stats/TrendChart'
import PieChart from '@/components/stats/PieChart'
import RegionStatsComparison from '@/components/stats/RegionStatsComparison'

interface Stats {
  members: {
    total: number
    pending: number
    approved: number
    suspended: number
    today: number
    week: number
    month: number
  }
  debts: {
    total: number
    today: number
    week: number
    month: number
    unique_debtors: number
  }
  activity: {
    last24Hours: number
  }
  distribution: {
    by_region: { [key: string]: number }
  }
}

interface TrendData {
  period: {
    start_date: string
    end_date: string
    days: number
  }
  uploads?: Array<{ date: string; count: number }>
  queries?: Array<{ date: string; count: number }>
}

interface RegionStatsData {
  regions: Record<string, {
    actual: number
    override: number
    display: number
  }>
  summary: {
    total: number
    north: number
    central: number
    south: number
    east: number
  }
  totals: {
    actual: number
    override: number
    display: number
  }
}

interface AuditLog {
  id: number
  action: string
  resource: string
  resource_id: string
  meta: any
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [trendData, setTrendData] = useState<TrendData | null>(null)
  const [regionStats, setRegionStats] = useState<RegionStatsData | null>(null)
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/login')
      return
    }

    // 載入統計資料、趨勢數據、區域統計和最近活動
    Promise.all([
      fetchStats(token),
      fetchTrends(token),
      fetchRegionStats(token),
      fetchRecentLogs(token)
    ]).finally(() => {
      setLoading(false)
    })
  }, [router])

  const fetchStats = async (token: string) => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch stats:', err)
      setError('無法載入統計資料')
    }
  }

  const fetchTrends = async (token: string) => {
    try {
      const res = await fetch('/api/stats/trends?days=30&type=all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch trends')
      }

      const data = await res.json()
      if (data.success) {
        setTrendData(data.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch trends:', err)
    }
  }

  const fetchRegionStats = async (token: string) => {
    try {
      const res = await fetch('/api/region/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch region stats')
      }

      const data = await res.json()
      if (data.success) {
        setRegionStats(data.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch region stats:', err)
    }
  }

  const fetchRecentLogs = async (token: string) => {
    try {
      const res = await fetch('/api/admin/audit-logs?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) {
        throw new Error('Failed to fetch logs')
      }

      const data = await res.json()
      if (data.success) {
        setRecentLogs(data.data.logs)
      }
    } catch (err: any) {
      console.error('Failed to fetch logs:', err)
    }
  }

  const handleUpdateOverrides = async (newOverrides: Record<string, number>) => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    try {
      const res = await fetch('/api/admin/display-overrides', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ overrides: newOverrides }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || '更新失敗')
      }

      // 重新載入區域統計
      await fetchRegionStats(token)
    } catch (err: any) {
      throw new Error(err.message || '更新灌水量失敗')
    }
  }

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'LOGIN': '登入',
      'LOGOUT': '登出',
      'ADMIN_CREATE_USER': '建立使用者',
      'MEMBER_APPROVED': '審核通過',
      'MEMBER_SUSPENDED': '停權',
      'DEBT_CREATED': '新增債務記錄',
      'DEBT_UPDATED': '更新債務記錄',
    }
    return actionMap[action] || action
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '剛剛'
    if (minutes < 60) return `${minutes} 分鐘前`
    if (hours < 24) return `${hours} 小時前`
    if (days < 7) return `${days} 天前`
    return date.toLocaleDateString('zh-TW')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-foreground-muted">載入中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">儀表板</h1>
          <p className="mt-2 text-foreground-muted">系統概覽與即時統計</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="總會員數"
            value={stats?.members.total || 0}
            icon="👥"
            trend={{
              value: stats?.members.today || 0,
              label: '今日新增',
              isPositive: true,
            }}
          />
          <StatCard
            title="待審核會員"
            value={stats?.members.pending || 0}
            icon="⏳"
            onClick={() => router.push('/admin/members?status=pending')}
            subtitle="點擊前往審核"
          />
          <StatCard
            title="總債務記錄"
            value={stats?.debts.total || 0}
            icon="📋"
            trend={{
              value: stats?.debts.today || 0,
              label: '今日新增',
              isPositive: true,
            }}
          />
          <StatCard
            title="24小時活動"
            value={stats?.activity.last24Hours || 0}
            icon="📊"
            onClick={() => router.push('/admin/audit-logs')}
            subtitle="點擊查看詳情"
          />
        </div>



        {/* 區域統計對比（6 小區 + 灌水配置） - 實際 + 展示 */}
        {regionStats && (
          <div className="mb-8">
            <RegionStatsComparison
              regions={regionStats.regions}
              summary={regionStats.summary}
              totals={regionStats.totals}
              onUpdate={handleUpdateOverrides}
            />
          </div>
        )}

        {/* 趨勢圖表 */}
        {trendData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <TrendChart
              title="債務上傳趨勢（最近 30 天）"
              data={trendData.uploads || []}
              lines={[
                { dataKey: 'count', name: '上傳數量', color: '#3B82F6' },
              ]}
              height={300}
            />
            <TrendChart
              title="債務查詢趨勢（最近 30 天）"
              data={trendData.queries || []}
              lines={[
                { dataKey: 'count', name: '查詢數量', color: '#10B981' },
              ]}
              height={300}
            />
          </div>
        )}


      </div>
    </div>
  )
}

