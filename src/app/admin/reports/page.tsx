'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'
import PieChart from '@/components/stats/PieChart'

interface ReportSummary {
  total_records: number
  total_face_value: number
  unique_debtors: number
  date_range: {
    start: string
    end: string
  }
  filters: {
    region: string
    status: string
  }
}

interface ReportData {
  summary: ReportSummary
  grouped_data: any
  group_by: string
}

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)

  // 表單狀態
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [region, setRegion] = useState('')
  const [status, setStatus] = useState('')
  const [groupBy, setGroupBy] = useState('region')

  const regions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
  const statuses = ['待觀察', '正常繳款', '已結清', '呆帳']

  // 查詢報表
  const handleQuery = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (region) params.append('region', region)
      if (status) params.append('status', status)
      if (groupBy) params.append('group_by', groupBy)

      const res = await fetch(`/api/reports/query?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('查詢失敗')
      }

      const data = await res.json()
      if (data.success) {
        setReportData(data.data)
      } else {
        setError(data.message || '查詢失敗')
      }
    } catch (err: any) {
      setError(err.message || '查詢過程發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  // 匯出報表
  const handleExport = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams()
      params.append('format', 'csv')
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)
      if (region) params.append('region', region)
      if (status) params.append('status', status)

      const res = await fetch(`/api/reports/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error('匯出失敗')
      }

      // 下載檔案
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `debt_records_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || '匯出過程發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">報表管理</h1>
          <p className="mt-2 text-foreground-muted">查詢和匯出債務記錄報表</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* 查詢條件 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">查詢條件</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                開始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                結束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 地區篩選 */}
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                地區
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">全部</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* 還款狀況篩選 */}
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                還款狀況
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">全部</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 分組方式 */}
            <div>
              <label className="block text-sm font-medium text-foreground-muted mb-2">
                分組方式
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full px-3 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="region">按地區</option>
                <option value="status">按還款狀況</option>
                <option value="date">按日期</option>
              </select>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '查詢中...' : '查詢報表'}
            </button>
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '匯出中...' : '匯出 CSV'}
            </button>
          </div>
        </div>

        {/* 報表結果 */}
        {reportData && (
          <div className="space-y-8">
            {/* 摘要統計 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">報表摘要</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-foreground-muted text-sm">總記錄數</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {reportData.summary.total_records.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-muted text-sm">總債務金額</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    ${reportData.summary.total_face_value.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-muted text-sm">債務人數</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {reportData.summary.unique_debtors.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-muted text-sm">日期範圍</p>
                  <p className="text-sm text-foreground mt-1">
                    {reportData.summary.date_range.start} ~ {reportData.summary.date_range.end}
                  </p>
                </div>
              </div>
            </div>

            {/* 分組數據圖表 */}
            {reportData.group_by !== 'none' && reportData.group_by !== 'date' && (
              <PieChart
                title={`${reportData.group_by === 'region' ? '地區' : '還款狀況'}分佈`}
                data={Object.entries(reportData.grouped_data).map(([name, data]: [string, any]) => ({
                  name,
                  value: data.count,
                }))}
                height={400}
              />
            )}

            {/* 詳細數據表格 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">詳細數據</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-3 px-4 text-foreground-muted font-medium">
                        {reportData.group_by === 'region' ? '地區' : reportData.group_by === 'status' ? '還款狀況' : '日期'}
                      </th>
                      <th className="text-right py-3 px-4 text-foreground-muted font-medium">記錄數</th>
                      <th className="text-right py-3 px-4 text-foreground-muted font-medium">總金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(reportData.grouped_data).map(([key, data]: [string, any]) => (
                      <tr key={key} className="border-b border-dark-200 last:border-0">
                        <td className="py-3 px-4 text-foreground">{key}</td>
                        <td className="py-3 px-4 text-foreground text-right">{data.count.toLocaleString()}</td>
                        <td className="py-3 px-4 text-foreground text-right">
                          ${data.total_face_value.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

