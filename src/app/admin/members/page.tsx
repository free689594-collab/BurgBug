'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/admin/AdminNav'

interface Member {
  user_id: string
  account: string
  status: 'pending' | 'approved' | 'suspended'
  role: 'user' | 'admin' | 'super_admin'
  created_at: string
  last_login: string | null
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  })
  
  // 篩選和搜尋狀態
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  
  // 操作狀態
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 批量操作狀態
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchOperating, setBatchOperating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'suspend' | 'delete'
    ids: string[]
  } | null>(null)

  // 載入會員列表（使用 useCallback 避免依賴項警告）
  const fetchMembers = useCallback(async (offset: number = 0) => {
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

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/admin/members?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '載入失敗')
        return
      }

      setMembers(data.data.members)
      setPagination(data.data.pagination)
    } catch (err) {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, roleFilter, searchQuery, pagination.limit])

  // 更新會員狀態
  const updateMemberStatus = async (userId: string, newStatus: string) => {
    try {
      setUpdatingId(userId)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      const response = await fetch(`/api/admin/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '更新失敗')
        return
      }

      setSuccess('更新成功')
      // 重新載入列表
      fetchMembers(pagination.offset)

      // 3 秒後清除成功訊息
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('網路錯誤，請稍後再試')
    } finally {
      setUpdatingId(null)
    }
  }

  // 初始載入
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // 處理搜尋
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setPagination(prev => ({ ...prev, offset: 0 }))
  }

  // 全選/取消全選
  const handleSelectAll = () => {
    if (selectedIds.length === members.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(members.map(m => m.user_id))
    }
  }

  // 選擇單個會員
  const handleSelectMember = (userId: string) => {
    if (selectedIds.includes(userId)) {
      setSelectedIds(selectedIds.filter(id => id !== userId))
    } else {
      setSelectedIds([...selectedIds, userId])
    }
  }

  // 批量批准
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      setError('請先選擇要批准的會員')
      return
    }
    setConfirmAction({ type: 'approve', ids: selectedIds })
    setShowConfirmDialog(true)
  }

  // 批量停用
  const handleBatchSuspend = () => {
    if (selectedIds.length === 0) {
      setError('請先選擇要停用的會員')
      return
    }
    setConfirmAction({ type: 'suspend', ids: selectedIds })
    setShowConfirmDialog(true)
  }

  // 批量刪除
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) {
      setError('請先選擇要刪除的會員')
      return
    }
    setConfirmAction({ type: 'delete', ids: selectedIds })
    setShowConfirmDialog(true)
  }

  // 執行批量操作
  const executeBatchOperation = async () => {
    if (!confirmAction) return

    try {
      setBatchOperating(true)
      setError('')
      setSuccess('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      const { type, ids } = confirmAction

      // 根據操作類型執行不同的 API 呼叫
      if (type === 'approve' || type === 'suspend') {
        const newStatus = type === 'approve' ? 'approved' : 'suspended'
        const promises = ids.map(userId =>
          fetch(`/api/admin/members/${userId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
          })
        )

        const results = await Promise.all(promises)
        const allSuccess = results.every(r => r.ok)

        if (!allSuccess) {
          setError('部分操作失敗，請重試')
          return
        }

        const actionText = type === 'approve' ? '批准' : '停用'
        setSuccess(`✅ 已${actionText}${ids.length}個會員`)
      } else if (type === 'delete') {
        // 刪除會員
        const promises = ids.map(userId =>
          fetch(`/api/admin/members/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        )

        const results = await Promise.all(promises)
        const allSuccess = results.every(r => r.ok)

        if (!allSuccess) {
          setError('部分刪除失敗，請重試')
          return
        }

        setSuccess(`✅ 已刪除${ids.length}個會員`)
      }

      // 清除選擇並重新載入
      setSelectedIds([])
      setShowConfirmDialog(false)
      setConfirmAction(null)
      fetchMembers(pagination.offset)

      // 3 秒後清除成功訊息
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('網路錯誤，請稍後再試')
    } finally {
      setBatchOperating(false)
    }
  }

  // 處理分頁
  const handlePrevPage = () => {
    const newOffset = Math.max(0, pagination.offset - pagination.limit)
    setPagination(prev => ({ ...prev, offset: newOffset }))
    fetchMembers(newOffset)
  }

  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit
      setPagination(prev => ({ ...prev, offset: newOffset }))
      fetchMembers(newOffset)
    }
  }

  // 狀態標籤樣式
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      approved: 'bg-green-500/20 text-green-400 border-green-500/50',
      suspended: 'bg-red-500/20 text-red-400 border-red-500/50'
    }
    const labels = {
      pending: '待審核',
      approved: '已審核',
      suspended: '已停用'
    }
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  // 角色標籤樣式
  const getRoleBadge = (role: string) => {
    const styles = {
      user: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
      admin: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    }
    const labels = {
      user: '會員',
      admin: '管理員',
      super_admin: '超級管理員'
    }
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-medium border ${styles[role as keyof typeof styles]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">會員管理</h1>
          <p className="mt-2 text-gray-400">管理系統會員、審核註冊申請</p>
        </div>

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
            <p className="text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* 批量操作工具欄 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-sm text-blue-400">
                已選擇 {selectedIds.length} 個會員
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBatchApprove}
                  disabled={batchOperating}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {batchOperating ? '處理中...' : '批量批准'}
                </button>
                <button
                  onClick={handleBatchSuspend}
                  disabled={batchOperating}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {batchOperating ? '處理中...' : '批量停用'}
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={batchOperating}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {batchOperating ? '處理中...' : '批量刪除'}
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  disabled={batchOperating}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white text-sm rounded transition-colors"
                >
                  取消選擇
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 篩選和搜尋 */}
        <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 狀態篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                狀態
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="pending">待審核</option>
                <option value="approved">已審核</option>
                <option value="suspended">已停用</option>
              </select>
            </div>

            {/* 角色篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                角色
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="user">會員</option>
                <option value="admin">管理員</option>
                <option value="super_admin">超級管理員</option>
              </select>
            </div>

            {/* 搜尋 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜尋帳號
              </label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="輸入帳號..."
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  搜尋
                </button>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('')
                      setSearchQuery('')
                    }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    清除
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* 會員列表 */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              載入中...
            </div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              沒有找到符合條件的會員
            </div>
          ) : (
            <>
              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-12">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === members.length && members.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        帳號
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        角色
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        註冊時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        最後登入
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {members.map((member) => (
                      <tr key={member.user_id} className="hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(member.user_id)}
                            onChange={() => handleSelectMember(member.user_id)}
                            className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {member.account}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getRoleBadge(member.role)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getStatusBadge(member.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {new Date(member.created_at).toLocaleDateString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {member.last_login 
                            ? new Date(member.last_login).toLocaleString('zh-TW')
                            : '從未登入'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/admin/members/${member.user_id}`)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                            >
                              查看
                            </button>
                            {member.status === 'pending' && (
                              <button
                                onClick={() => updateMemberStatus(member.user_id, 'approved')}
                                disabled={updatingId === member.user_id}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                              >
                                {updatingId === member.user_id ? '處理中...' : '核准'}
                              </button>
                            )}
                            {member.status === 'approved' && (
                              <button
                                onClick={() => updateMemberStatus(member.user_id, 'suspended')}
                                disabled={updatingId === member.user_id}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                              >
                                {updatingId === member.user_id ? '處理中...' : '停用'}
                              </button>
                            )}
                            {member.status === 'suspended' && (
                              <button
                                onClick={() => updateMemberStatus(member.user_id, 'approved')}
                                disabled={updatingId === member.user_id}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded transition-colors"
                              >
                                {updatingId === member.user_id ? '處理中...' : '啟用'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 手機版卡片 */}
              <div className="md:hidden divide-y divide-gray-700">
                {members.map((member) => (
                  <div key={member.user_id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(member.user_id)}
                          onChange={() => handleSelectMember(member.user_id)}
                          className="mt-1 w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <div>
                          <p className="font-medium text-white">{member.account}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(member.created_at).toLocaleDateString('zh-TW')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {getRoleBadge(member.role)}
                        {getStatusBadge(member.status)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {member.status === 'pending' && (
                        <button
                          onClick={() => updateMemberStatus(member.user_id, 'approved')}
                          disabled={updatingId === member.user_id}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                        >
                          {updatingId === member.user_id ? '處理中...' : '核准'}
                        </button>
                      )}
                      {member.status === 'approved' && (
                        <button
                          onClick={() => updateMemberStatus(member.user_id, 'suspended')}
                          disabled={updatingId === member.user_id}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                        >
                          {updatingId === member.user_id ? '處理中...' : '停用'}
                        </button>
                      )}
                      {member.status === 'suspended' && (
                        <button
                          onClick={() => updateMemberStatus(member.user_id, 'approved')}
                          disabled={updatingId === member.user_id}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                        >
                          {updatingId === member.user_id ? '處理中...' : '啟用'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

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

        {/* 確認對話框 */}
        {showConfirmDialog && confirmAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-white mb-4">
                {confirmAction.type === 'approve' && '確認批准會員？'}
                {confirmAction.type === 'suspend' && '確認停用會員？'}
                {confirmAction.type === 'delete' && '確認刪除會員？'}
              </h3>
              <p className="text-gray-400 mb-6">
                {confirmAction.type === 'approve' && `將批准 ${confirmAction.ids.length} 個會員的帳號`}
                {confirmAction.type === 'suspend' && `將停用 ${confirmAction.ids.length} 個會員的帳號`}
                {confirmAction.type === 'delete' && `將永久刪除 ${confirmAction.ids.length} 個會員，此操作無法復原`}
              </p>
              {confirmAction.type === 'delete' && (
                <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded">
                  <p className="text-red-400 text-sm">
                    ⚠️ 警告：刪除會員將同時刪除其所有相關資料，包括上傳的債務記錄。
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmDialog(false)
                    setConfirmAction(null)
                  }}
                  disabled={batchOperating}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={executeBatchOperation}
                  disabled={batchOperating}
                  className={`flex-1 px-4 py-2 text-white rounded transition-colors ${
                    confirmAction.type === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
                      : confirmAction.type === 'suspend'
                      ? 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600'
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-gray-600'
                  }`}
                >
                  {batchOperating ? '處理中...' : '確認'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

