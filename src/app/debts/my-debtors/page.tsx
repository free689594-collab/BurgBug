'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import NotesTimelineModal from '@/components/debts/NotesTimelineModal'
import PrivateFieldsModal from '@/components/debts/PrivateFieldsModal'
import {
  REPAYMENT_STATUS_OPTIONS,
  getRepaymentStatusClasses,
  getRepaymentStatusLabel,
  normalizeRepaymentStatus
} from '@/utils/repaymentStatus'

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
  // 私密欄位
  settled_amount?: number | null
  recovered_amount?: number | null
  bad_debt_amount?: number | null
  internal_rating?: number | null
}

interface Stats {
  total_count: number
  total_face_value: number
  by_status: Record<string, { count: number; total_value: number }>
  by_region: Record<string, number>
}

interface PrivateStats {
  total_count: number
  total_face_value: number
  total_settled: number
  total_recovered: number
  total_bad_debt: number
  recovery_rate: number
  by_status: Record<string, {
    count: number
    face_value: number
    settled_amount: number
    recovered_amount: number
    bad_debt_amount: number
  }>
}

export default function MyDebtorsPage() {
  const router = useRouter()
  
  // 資料狀態
  const [records, setRecords] = useState<DebtRecord[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [privateStats, setPrivateStats] = useState<PrivateStats | null>(null)

  // 篩選條件
  const [statusFilter, setStatusFilter] = useState('')
  const [residenceFilter, setResidenceFilter] = useState('')
  const [privateFieldFilter, setPrivateFieldFilter] = useState('') // 'all' | 'filled' | 'empty'
  
  // 分頁
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20
  
  // UI 狀態
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null)

  // Modal 狀態
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [privateFieldsModalOpen, setPrivateFieldsModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<DebtRecord | null>(null)

  // 選項列表
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
      setPrivateStats(data.data.private_stats || null)
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

  // 前端篩選：私密欄位狀態
  const filteredRecords = records.filter(record => {
    if (!privateFieldFilter) return true

    const hasPrivateFields =
      record.settled_amount !== null ||
      record.recovered_amount !== null ||
      record.bad_debt_amount !== null ||
      record.internal_rating !== null

    if (privateFieldFilter === 'filled') {
      return hasPrivateFields
    } else if (privateFieldFilter === 'empty') {
      return !hasPrivateFields
    }

    return true
  })

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
        <div className="mb-6">
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

        {/* 總筆數 - 簡單顯示 */}
        {stats && (
          <div className="mb-6 flex items-center gap-2 text-foreground-muted">
            <span className="text-2xl">📋</span>
            <span className="text-sm">總筆數：</span>
            <span className="text-lg font-bold text-foreground">{stats.total_count}</span>
            <span className="text-sm">筆</span>
          </div>
        )}

        {/* 篩選條件 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300">🔍 篩選條件</h3>
            {(statusFilter || residenceFilter || privateFieldFilter) && (
              <span className="text-xs text-blue-400">
                已套用 {[statusFilter, residenceFilter, privateFieldFilter].filter(Boolean).length} 個篩選條件
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                還款狀況
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
                {REPAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                居住地
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-1">
                <span>私密欄位狀態</span>
                <span className="text-xs" title="篩選是否已填寫私密欄位">🔒</span>
              </label>
              <select
                value={privateFieldFilter}
                onChange={(e) => {
                  setPrivateFieldFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部</option>
                <option value="filled">已填寫</option>
                <option value="empty">未填寫</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('')
                  setResidenceFilter('')
                  setPrivateFieldFilter('')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                清除篩選
              </button>
            </div>
          </div>
        </div>

        {/* 私密統計儀表板 */}
        {privateStats && privateStats.total_count > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span>🔒</span>
                <span>私密統計儀表板</span>
                <span className="text-sm font-normal text-foreground-muted">
                  （已填寫私密欄位：{privateStats.total_count} 筆）
                </span>
              </h2>
            </div>

            {/* 總計統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {/* 總票面金額 */}
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-blue-300 font-medium">總票面金額</p>
                  <span className="text-2xl">💰</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(privateStats.total_face_value)}
                </p>
              </div>

              {/* 總結清金額 */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-green-300 font-medium">總結清金額</p>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(privateStats.total_settled)}
                </p>
              </div>

              {/* 總收回金額 */}
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-emerald-300 font-medium">總收回金額</p>
                  <span className="text-2xl">💵</span>
                </div>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatCurrency(privateStats.total_recovered)}
                </p>
              </div>

              {/* 總呆帳金額 */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-red-300 font-medium">總呆帳金額</p>
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-2xl font-bold text-red-400">
                  {formatCurrency(privateStats.total_bad_debt)}
                </p>
              </div>

              {/* 收回率 */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-purple-300 font-medium">收回率</p>
                  <span className="text-2xl">📈</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {privateStats.recovery_rate}%
                </p>
                <div className="mt-2 w-full bg-dark-400 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(privateStats.recovery_rate, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 按還款狀況分類統計 */}
            <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
              <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                <span>📊</span>
                <span>按還款狀況分類統計（私密欄位）</span>
              </h3>
              <div className="space-y-3">
                {Object.entries(privateStats.by_status)
                  .sort((a, b) => {
                    // 排序：結清 > 正常 > 疲勞 > 呆帳 > 待觀察
                    const order = ['結清', '議價結清', '代償', '結清 / 議價結清 / 代償', '正常', '疲勞', '呆帳', '待觀察']
                    return order.indexOf(a[0]) - order.indexOf(b[0])
                  })
                  .map(([status, data]) => {
                    const displayLabel = getRepaymentStatusLabel(status)
                    return (
                      <div key={status} className="bg-dark-400 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRepaymentStatusClasses(status)}`}>
                              {displayLabel}
                            </span>
                            <span className="text-sm text-gray-400">
                              {data.count} 筆
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-400">票面：</span>
                            <span className="text-blue-400 font-medium">{formatCurrency(data.face_value)}</span>
                          </div>
                          {data.settled_amount > 0 && (
                            <div>
                              <span className="text-gray-400">結清：</span>
                              <span className="text-green-400 font-medium">{formatCurrency(data.settled_amount)}</span>
                            </div>
                          )}
                          {data.recovered_amount > 0 && (
                            <div>
                              <span className="text-gray-400">收回：</span>
                              <span className="text-emerald-400 font-medium">{formatCurrency(data.recovered_amount)}</span>
                            </div>
                          )}
                          {data.bad_debt_amount > 0 && (
                            <div>
                              <span className="text-gray-400">呆帳：</span>
                              <span className="text-red-400 font-medium">{formatCurrency(data.bad_debt_amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        )}

        {/* 債務記錄列表 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg overflow-hidden">
          {/* 表格標題 */}
          <div className="bg-dark-400 px-6 py-4 border-b border-dark-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                債務記錄列表
                {filteredRecords.length > 0 && (
                  <span className="text-sm font-normal text-foreground-muted ml-2">
                    （顯示 {filteredRecords.length} 筆
                    {filteredRecords.length !== records.length && ` / 共 ${records.length} 筆`}）
                  </span>
                )}
              </h2>
              {privateFieldFilter && (
                <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                  🔒 {privateFieldFilter === 'filled' ? '已填寫私密欄位' : '未填寫私密欄位'}
                </span>
              )}
            </div>
          </div>

          {/* 無資料提示 */}
          {filteredRecords.length === 0 && records.length === 0 && (
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

          {/* 篩選後無資料 */}
          {filteredRecords.length === 0 && records.length > 0 && (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-foreground-muted text-lg">找不到符合條件的記錄</p>
              <p className="text-foreground-muted text-sm mt-2">
                請調整篩選條件後再試
              </p>
              <button
                onClick={() => {
                  setStatusFilter('')
                  setResidenceFilter('')
                  setPrivateFieldFilter('')
                  setCurrentPage(1)
                }}
                className="mt-4 px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                清除所有篩選
              </button>
            </div>
          )}

          {/* 表格內容 */}
          {filteredRecords.length > 0 && (
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
                      <div className="flex items-center gap-1">
                        私密欄位
                        <span className="text-yellow-400" title="僅您可見">🔒</span>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-200">
                  {filteredRecords.map((record) => (
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
                          value={normalizeRepaymentStatus(record.repayment_status)}
                          onChange={(e) => handleUpdateStatus(record.id, e.target.value)}
                          disabled={updatingId === record.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${getRepaymentStatusClasses(record.repayment_status)}`}
                        >
                          {REPAYMENT_STATUS_OPTIONS.map((status) => (
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

                      {/* 私密欄位 */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {record.internal_rating && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-foreground-muted">評價:</span>
                              <span className="text-yellow-400">
                                {'★'.repeat(record.internal_rating)}{'☆'.repeat(5 - record.internal_rating)}
                              </span>
                            </div>
                          )}
                          {(record.settled_amount || record.recovered_amount || record.bad_debt_amount) && (
                            <div className="text-xs text-foreground-muted">
                              {record.settled_amount && <div>結清: {formatCurrency(record.settled_amount)}</div>}
                              {record.recovered_amount && <div>收回: {formatCurrency(record.recovered_amount)}</div>}
                              {record.bad_debt_amount && <div>呆帳: {formatCurrency(record.bad_debt_amount)}</div>}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRecord(record)
                              setPrivateFieldsModalOpen(true)
                            }}
                            className="text-blue-400 hover:text-blue-300 text-xs"
                          >
                            {record.settled_amount || record.recovered_amount || record.bad_debt_amount || record.internal_rating ? '編輯' : '新增'}
                          </button>
                        </div>
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setSelectedRecord(record)
                              setNotesModalOpen(true)
                            }}
                            className="text-blue-400 hover:text-blue-300 text-sm whitespace-nowrap"
                          >
                            📝 備註紀錄
                          </button>
                          <button
                            onClick={() => {
                              alert(`債務人：${record.debtor_name}\n身分證：${record.debtor_id_full}\n電話：${record.debtor_phone || '未提供'}\n備註：${record.note || '無'}`)
                            }}
                            className="text-gray-400 hover:text-gray-300 text-sm whitespace-nowrap"
                          >
                            查看詳情
                          </button>
                        </div>
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
            <li>• 點擊「📝 備註紀錄」可查看和新增該債務人的備註時間軸</li>
            <li>• 🔒 <strong>私密欄位</strong>（結清金額、已收回金額、呆帳金額、內部評價）僅您可見，不會同步給其他會員</li>
            <li>• 💡 <strong>建議填寫私密欄位</strong>：填寫後可在「私密統計儀表板」查看詳細的收回率和分類統計</li>
            <li>• 📊 私密統計儀表板只統計已填寫私密欄位的債務人，幫助您更好地管理債務</li>
            <li>• 每頁顯示 20 筆記錄，使用分頁功能瀏覽更多資料</li>
          </ul>
        </div>

        {/* 備註時間軸 Modal */}
        {selectedRecord && (
          <NotesTimelineModal
            debtRecordId={selectedRecord.id}
            debtorName={selectedRecord.debtor_name}
            isOpen={notesModalOpen}
            onClose={() => {
              setNotesModalOpen(false)
              setSelectedRecord(null)
            }}
          />
        )}

        {/* 私密欄位編輯 Modal */}
        {selectedRecord && (
          <PrivateFieldsModal
            debtRecordId={selectedRecord.id}
            debtorName={selectedRecord.debtor_name}
            initialData={{
              settled_amount: selectedRecord.settled_amount,
              recovered_amount: selectedRecord.recovered_amount,
              bad_debt_amount: selectedRecord.bad_debt_amount,
              internal_rating: selectedRecord.internal_rating
            }}
            isOpen={privateFieldsModalOpen}
            onClose={() => {
              setPrivateFieldsModalOpen(false)
              setSelectedRecord(null)
            }}
            onSuccess={() => {
              // 重新載入資料
              fetchRecords()
            }}
          />
        )}
      </div>
    </MemberLayout>
  )
}


