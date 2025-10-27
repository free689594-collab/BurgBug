'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'

interface DebtRecord {
  id: string
  debtor_name: string
  debtor_id_full: string
  debtor_phone: string | null
  gender: string
  profession: string | null
  residence: string
  debt_date: string
  face_value: number
  payment_frequency: string
  repayment_status: string
  note: string | null
  likes_count: number
  created_at: string
  uploader: {
    nickname: string
    business_type: string
    business_region: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminDebtsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<DebtRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  // 篩選條件
  const [search, setSearch] = useState('')
  const [uploader, setUploader] = useState('')
  const [residence, setResidence] = useState('')
  const [status, setStatus] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 批量選擇
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    fetchRecords()
  }, [pagination.page, sortBy, sortOrder])

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(uploader && { uploader }),
        ...(residence && { residence }),
        ...(status && { status }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo })
      })

      const response = await fetch(`/api/admin/debts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch records')
      }

      const data = await response.json()
      setRecords(data.data.records)
      setPagination(data.data.pagination)
    } catch (error) {
      console.error('Failed to fetch records:', error)
      alert('載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchRecords()
  }

  const handleReset = () => {
    setSearch('')
    setUploader('')
    setResidence('')
    setStatus('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setSortOrder('desc')
    setPagination(prev => ({ ...prev, page: 1 }))
    setTimeout(fetchRecords, 100)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.length === records.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(records.map(r => r.id))
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) {
      alert('請先選擇要刪除的記錄')
      return
    }

    const reason = prompt(`確定要刪除 ${selectedIds.length} 筆記錄嗎？\n請輸入刪除原因：`)
    if (!reason) return

    try {
      const token = localStorage.getItem('access_token')
      const deletePromises = selectedIds.map(id =>
        fetch(`/api/admin/debts/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ delete_reason: reason })
        })
      )

      await Promise.all(deletePromises)
      alert('✅ 批量刪除成功')
      setSelectedIds([])
      fetchRecords()
    } catch (error) {
      console.error('Batch delete failed:', error)
      alert('批量刪除失敗')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW')
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 標題 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">債務記錄管理</h1>
          <p className="mt-2 text-gray-600">查看、編輯和管理所有債務記錄</p>
        </div>

        {/* 篩選區域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">篩選條件</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜尋（姓名/身分證）
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="輸入關鍵字"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                上傳者
              </label>
              <input
                type="text"
                value={uploader}
                onChange={(e) => setUploader(e.target.value)}
                placeholder="暱稱或ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                居住地
              </label>
              <select
                value={residence}
                onChange={(e) => setResidence(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">全部</option>
                <option value="北北基宜">北北基宜</option>
                <option value="桃竹苗">桃竹苗</option>
                <option value="中彰投">中彰投</option>
                <option value="雲嘉南">雲嘉南</option>
                <option value="高屏">高屏</option>
                <option value="花東">花東</option>
                <option value="離島">離島</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                還款狀況
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">全部</option>
                <option value="正常">正常</option>
                <option value="待觀察">待觀察</option>
                <option value="延遲">延遲</option>
                <option value="呆帳">呆帳</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                債務日期起始
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                債務日期結束
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              🔍 搜尋
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              🔄 重置
            </button>
          </div>
        </div>

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-blue-900">已選擇 {selectedIds.length} 筆記錄</span>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              🗑️ 批量刪除
            </button>
          </div>
        )}

        {/* 記錄列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">載入中...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">沒有找到符合條件的記錄</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === records.length}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('debtor_name')}
                      >
                        債務人 {sortBy === 'debtor_name' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        身分證
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        居住地
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('debt_date')}
                      >
                        債務日期 {sortBy === 'debt_date' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('face_value')}
                      >
                        金額 {sortBy === 'face_value' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        還款狀況
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        上傳者
                      </th>
                      <th
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('likes_count')}
                      >
                        按讚 {sortBy === 'likes_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(record.id)}
                            onChange={() => handleSelectOne(record.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {record.debtor_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.debtor_id_full}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.residence}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {formatDate(record.debt_date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                          {formatCurrency(record.face_value)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.repayment_status === '正常' ? 'bg-green-100 text-green-800' :
                            record.repayment_status === '待觀察' ? 'bg-yellow-100 text-yellow-800' :
                            record.repayment_status === '延遲' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {record.repayment_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.uploader.nickname}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {record.likes_count}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => router.push(`/admin/debts/${record.id}`)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            查看
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  顯示 {((pagination.page - 1) * pagination.limit) + 1} 到{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，
                  共 {pagination.total} 筆
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    上一頁
                  </button>
                  <span className="px-3 py-1">
                    第 {pagination.page} / {pagination.totalPages} 頁
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

