'use client'

import { useState, useEffect } from 'react'
import AdminNav from '@/components/admin/AdminNav'

interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource: string
  resource_id: string | null
  meta: any
  created_at: string
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false
  })
  
  // 篩選狀態
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // 展開狀態
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // 錯誤狀態
  const [error, setError] = useState('')

  // 載入審計日誌
  const fetchLogs = async (offset: number = 0) => {
    try {
      setLoading(true)
      setError('')
      
      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      // 建立查詢參數
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: offset.toString(),
      })

      if (actionFilter !== 'all') {
        params.append('action', actionFilter)
      }

      if (startDate) {
        params.append('start_date', new Date(startDate).toISOString())
      }

      if (endDate) {
        // 設定為當天結束時間
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        params.append('end_date', end.toISOString())
      }

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗')
        return
      }

      setLogs(data.data.logs)
      setPagination(data.data.pagination)
    } catch (err) {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    fetchLogs()
  }, [actionFilter, startDate, endDate])

  // 處理分頁
  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    setPagination(prev => ({ ...prev, offset: newOffset }))
    fetchLogs(newOffset)
  }

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit
      setPagination(prev => ({ ...prev, offset: newOffset }))
      fetchLogs(newOffset)
    }
  }

  // 操作類型標籤樣式
  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      LOGIN: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      LOGOUT: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      REGISTER: 'bg-green-500/20 text-green-400 border-green-500/50',
      UPDATE_MEMBER: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      DELETE_MEMBER: 'bg-red-500/20 text-red-400 border-red-500/50',
      CREATE_DEBT: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      UPDATE_DEBT: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      DELETE_DEBT: 'bg-red-500/20 text-red-400 border-red-500/50',
    }
    
    const labels: Record<string, string> = {
      LOGIN: '登入',
      LOGOUT: '登出',
      REGISTER: '註冊',
      UPDATE_MEMBER: '更新會員',
      DELETE_MEMBER: '刪除會員',
      CREATE_DEBT: '新增債務',
      UPDATE_DEBT: '更新債務',
      DELETE_DEBT: '刪除債務',
    }

    const style = styles[action] || 'bg-gray-500/20 text-gray-400 border-gray-500/50'
    const label = labels[action] || action

    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${style}`}>
        {label}
      </span>
    )
  }

  // 切換展開/收合
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">審計日誌</h1>
          <p className="mt-2 text-gray-400">查看系統操作記錄和安全日誌</p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* 篩選 */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 操作類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                操作類型
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="LOGIN">登入</option>
                <option value="LOGOUT">登出</option>
                <option value="REGISTER">註冊</option>
                <option value="UPDATE_MEMBER">更新會員</option>
                <option value="DELETE_MEMBER">刪除會員</option>
                <option value="CREATE_DEBT">新增債務</option>
                <option value="UPDATE_DEBT">更新債務</option>
                <option value="DELETE_DEBT">刪除債務</option>
              </select>
            </div>

            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                開始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                結束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 清除篩選按鈕 */}
          {(actionFilter !== 'all' || startDate || endDate) && (
            <div className="mt-4">
              <button
                onClick={() => {
                  setActionFilter('all')
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                清除篩選
              </button>
            </div>
          )}
        </div>

        {/* 日誌列表 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              載入中...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              沒有找到符合條件的日誌
            </div>
          ) : (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        資源
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        使用者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        詳細資訊
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(log.created_at).toLocaleString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {log.resource}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {log.meta?.account || log.user_id?.substring(0, 8) || '系統'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {expandedId === log.id ? '收合' : '展開'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 手機版卡片 */}
              <div className="md:hidden divide-y divide-gray-700">
                {logs.map((log) => (
                  <div key={log.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {getActionBadge(log.action)}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(log.created_at).toLocaleString('zh-TW')}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {expandedId === log.id ? '收合' : '展開'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-400">
                      {log.meta?.account || log.user_id?.substring(0, 8) || '系統'}
                    </p>
                  </div>
                ))}
              </div>

              {/* 展開的詳細資訊 */}
              {expandedId && (
                <div className="border-t border-gray-700 bg-gray-900 p-6">
                  {logs.map((log) => {
                    if (log.id !== expandedId) return null
                    return (
                      <div key={log.id}>
                        <h3 className="text-lg font-medium text-white mb-4">詳細資訊</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex">
                            <span className="text-gray-400 w-32">操作 ID：</span>
                            <span className="text-white font-mono">{log.id}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-32">使用者 ID：</span>
                            <span className="text-white font-mono">{log.user_id || '無'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-32">資源類型：</span>
                            <span className="text-white">{log.resource}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-32">資源 ID：</span>
                            <span className="text-white font-mono">{log.resource_id || '無'}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-400 w-32">時間：</span>
                            <span className="text-white">{new Date(log.created_at).toLocaleString('zh-TW')}</span>
                          </div>
                          {log.meta && Object.keys(log.meta).length > 0 && (
                            <div>
                              <span className="text-gray-400">額外資訊：</span>
                              <pre className="mt-2 p-3 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto">
                                {JSON.stringify(log.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 分頁 */}
              <div className="px-6 py-4 bg-gray-700 border-t border-gray-600 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  顯示 {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} / 共 {pagination.total} 筆
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasMore}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

