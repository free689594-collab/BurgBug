'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'

interface DebtRecord {
  id: string
  debtor_name: string
  debtor_id_full: string
  debtor_phone?: string | null
  gender: string
  profession?: string | null
  residence: string
  debt_date: string
  face_value: number
  payment_frequency: string
  repayment_status: string
  note?: string | null
  created_at: string
  updated_at?: string | null
  debtor_id_first_letter: string
  debtor_id_last5: string
}

interface Stats {
  total_count: number
  total_face_value: number
  by_status: Record<string, { count: number; total_value: number }>
  by_region: Record<string, number>
}

export default function MyDebtorsPage() {
  const router = useRouter()
  
  // 資料狀態
  const [records, setRecords] = useState<DebtRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  
  // 篩選條件
  const [statusFilter, setStatusFilter] = useState('')
  const [residenceFilter, setResidenceFilter] = useState('')
  
  // 分頁
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20
  
  // UI 狀態
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // 選項列表
  const statusOptions = ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳']
  const residenceOptions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
  const paymentFrequencyMap: Record<string, string> = {
    'daily': '日結',
    'weekly': '周結',
    'monthly': '月結'
  }

  const checkUserStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      setLoading(false)
    } catch (err) {
      console.error('Failed to check user status:', err)
      router.push('/login')
    }
  }, [router])

  const fetchRecords = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString()
      })

      if (statusFilter) params.append('status', statusFilter)
      if (residenceFilter) params.append('residence', residenceFilter)

      const response = await fetch(`/api/debts/my-debtors?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗，請稍後再試')
        return
      }

      setRecords(data.data.records || [])
      setStats(data.data.stats || null)
      setTotalPages(data.data.pagination.total_pages || 1)
      setError('')
    } catch (err) {
      console.error('Fetch records error:', err)
      setError('系統錯誤，請稍後再試')
    }
  }, [currentPage, statusFilter, residenceFilter, router])

  // 檢查使用者登入狀態
  useEffect(() => {
    checkUserStatus()
  }, [checkUserStatus])

  // 載入資料
  useEffect(() => {
    if (loading === false) {
      fetchRecords()
    }
  }, [fetchRecords, loading])

  // 更新還款狀態
  const handleUpdateStatus = async (recordId: string, newStatus: string) => {
    setUpdatingId(recordId)
    setUpdateSuccess(null)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/debts/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          repayment_status: newStatus
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '更新失敗，請稍後再試')
        return
      }

      // 更新成功
      setUpdateSuccess(recordId)
      fetchRecords() // 重新載入資料

      // 3 秒後清除成功訊息
      setTimeout(() => {
        setUpdateSuccess(null)
      }, 3000)
    } catch (err) {
      console.error('Update status error:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setUpdatingId(null)
    }
  }

  // 格式化金額
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-foreground">載入中...</div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">我的債務人管理</h1>
          <p className="text-foreground-muted">
            管理您上傳的所有債務記錄，查看統計資訊
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 統計資訊 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 總筆數 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-muted text-sm">總筆數</p>
                  <p className="text-3xl font-bold text-foreground mt-2">
                    {stats.total_count}
                  </p>
                </div>
                <div className="text-4xl">📋</div>
              </div>
            </div>

            {/* 總票面金額 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground-muted text-sm">總票面金額</p>
                  <p className="text-2xl font-bold text-green-400 mt-2">
                    {formatCurrency(stats.total_face_value)}
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            {/* 按還款狀況統計 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 md:col-span-2">
              <p className="text-foreground-muted text-sm mb-4">按還款狀況統計</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stats.by_status).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className={`text-sm px-2 py-1 rounded ${
                      status === '正常' ? 'bg-green-500/20 text-green-400' :
                      status === '結清' ? 'bg-blue-500/20 text-blue-400' :
                      status === '呆帳' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {status}
                    </span>
                    <span className="text-foreground text-sm font-medium">
                      {data.count} 筆
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 按居住地統計 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 md:col-span-2 lg:col-span-4">
              <p className="text-foreground-muted text-sm mb-4">按居住地統計</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(stats.by_region).map(([region, count]) => (
                  <div key={region} className="flex items-center justify-between bg-dark-400 rounded px-3 py-2">
                    <span className="text-foreground text-sm">{region}</span>
                    <span className="text-blue-400 text-sm font-medium">{count} 筆</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 篩選條件 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                還款狀況篩選
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                居住地篩選
              </label>
              <select
                value={residenceFilter}
                onChange={(e) => {
                  setResidenceFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                {residenceOptions.map((residence) => (
                  <option key={residence} value={residence}>
                    {residence}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('')
                  setResidenceFilter('')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                清除篩選
              </button>
            </div>
          </div>
        </div>

        {/* 債務記錄列表 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg overflow-hidden">
          {/* 表格標題 */}
          <div className="bg-dark-400 px-6 py-4 border-b border-dark-200">
            <h2 className="text-lg font-semibold text-foreground">
              債務記錄列表 {records.length > 0 && `(第 ${currentPage} 頁，共 ${records.length} 筆)`}
            </h2>
          </div>

          {/* 無資料提示 */}
          {records.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-foreground-muted text-lg">尚無債務記錄</p>
              <p className="text-foreground-muted text-sm mt-2">
                請前往「債務上傳」頁面新增債務記錄
              </p>
              <button
                onClick={() => router.push('/debts/upload')}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                前往上傳
              </button>
            </div>
          )}

          {/* 表格內容 */}
          {records.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-400 border-b border-dark-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      債務人資訊
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      居住地
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      債務日期
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      票面金額
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      還款配合
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      還款狀況
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-dark-400 transition-colors">
                      {/* 債務人資訊 */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-foreground font-medium">{record.debtor_name}</p>
                          <p className="text-foreground-muted text-sm">
                            {record.debtor_id_first_letter}***{record.debtor_id_last5}
                          </p>
                          <p className="text-foreground-muted text-xs">
                            {record.gender} {record.profession && `· ${record.profession}`}
                          </p>
                        </div>
                      </td>

                      {/* 居住地 */}
                      <td className="px-4 py-4">
                        <span className="text-foreground text-sm">{record.residence}</span>
                      </td>

                      {/* 債務日期 */}
                      <td className="px-4 py-4">
                        <span className="text-foreground text-sm">{formatDate(record.debt_date)}</span>
                      </td>

                      {/* 票面金額 */}
                      <td className="px-4 py-4">
                        <span className="text-green-400 font-semibold">
                          {formatCurrency(record.face_value)}
                        </span>
                      </td>

                      {/* 還款配合 */}
                      <td className="px-4 py-4">
                        <span className="text-foreground text-sm">
                          {paymentFrequencyMap[record.payment_frequency] || record.payment_frequency}
                        </span>
                      </td>

                      {/* 還款狀況 */}
                      <td className="px-4 py-4">
                        <select
                          value={record.repayment_status}
                          onChange={(e) => handleUpdateStatus(record.id, e.target.value)}
                          disabled={updatingId === record.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            record.repayment_status === '正常' ? 'bg-green-500/20 text-green-400' :
                            record.repayment_status === '結清' ? 'bg-blue-500/20 text-blue-400' :
                            record.repayment_status === '呆帳' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        {updatingId === record.id && (
                          <p className="text-xs text-blue-400 mt-1">更新中...</p>
                        )}
                        {updateSuccess === record.id && (
                          <p className="text-xs text-green-400 mt-1">✓ 已更新</p>
                        )}
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => {
                            // 顯示詳細資訊（可以用 modal 或導向詳情頁）
                            alert(`債務人：${record.debtor_name}\n身分證：${record.debtor_id_full}\n電話：${record.debtor_phone || '未提供'}\n備註：${record.note || '無'}`)
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          查看詳情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="bg-dark-400 px-6 py-4 border-t border-dark-200 flex items-center justify-between">
              <div className="text-sm text-foreground-muted">
                第 {currentPage} 頁，共 {totalPages} 頁
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  上一頁
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 使用說明 */}
        <div className="mt-8 p-4 bg-dark-300 border border-dark-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">📋 使用說明</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 此頁面顯示您上傳的所有債務記錄（完整資訊，不遮罩）</li>
            <li>• 可以直接在列表中更新還款狀況，系統會自動儲存</li>
            <li>• 使用篩選功能快速找到特定條件的債務記錄</li>
            <li>• 點擊「查看詳情」可查看完整的債務人資訊和備註</li>
            <li>• 每頁顯示 20 筆記錄，使用分頁功能瀏覽更多資料</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}


