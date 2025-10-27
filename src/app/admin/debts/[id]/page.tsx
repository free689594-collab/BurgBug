'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  updated_at: string
  admin_edited_by: string | null
  admin_edit_reason: string | null
  uploader: {
    user_id: string
    nickname: string
    account: string
    business_type: string
    business_region: string
    status: string
  }
  editor: {
    nickname: string
    account: string
  } | null
}

interface ModificationRequest {
  id: string
  field_name: string
  old_value: string
  new_value: string
  reason: string
  status: string
  created_at: string
  admin_comment: string | null
  requester: {
    nickname: string
    account: string
  }
  reviewer: {
    nickname: string
    account: string
  } | null
}

interface Like {
  id: string
  created_at: string
  liker: {
    nickname: string
    account: string
  }
}

export default function AdminDebtDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [record, setRecord] = useState<DebtRecord | null>(null)
  const [modificationRequests, setModificationRequests] = useState<ModificationRequest[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>({})

  useEffect(() => {
    fetchDebtDetail()
  }, [id])

  const fetchDebtDetail = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch(`/api/admin/debts/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login')
          return
        }
        throw new Error('Failed to fetch debt detail')
      }

      const data = await response.json()
      setRecord(data.data.record)
      setModificationRequests(data.data.modification_requests)
      setLikes(data.data.likes)
      setEditData(data.data.record)
    } catch (error) {
      console.error('Failed to fetch debt detail:', error)
      alert('載入失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    setEditing(true)
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditData(record)
  }

  const handleSaveEdit = async () => {
    const reason = prompt('請輸入編輯原因：')
    if (!reason) return

    try {
      const token = localStorage.getItem('access_token')

      // 過濾掉關聯欄位（uploader, editor）、唯讀欄位和生成欄位
      const {
        uploader,
        editor,
        created_at,
        likes_count,
        debtor_id_first_letter,  // 生成欄位，不能更新
        debtor_id_last5,         // 生成欄位，不能更新
        ...updateData
      } = editData

      const response = await fetch(`/api/admin/debts/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updateData,
          edit_reason: reason
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update debt record')
      }

      alert('✅ 更新成功')
      setEditing(false)
      fetchDebtDetail()
    } catch (error) {
      console.error('Failed to update debt record:', error)
      alert('更新失敗')
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除這筆債務記錄嗎？此操作無法復原！')) return

    const reason = prompt('請輸入刪除原因：')
    if (!reason) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/admin/debts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delete_reason: reason })
      })

      if (!response.ok) {
        throw new Error('Failed to delete debt record')
      }

      alert('✅ 刪除成功')
      router.push('/admin/debts')
    } catch (error) {
      console.error('Failed to delete debt record:', error)
      alert('刪除失敗')
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW')
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-gray-500">載入中...</div>
      </AdminLayout>
    )
  }

  if (!record) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-gray-500">找不到債務記錄</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 標題和操作按鈕 */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/debts')}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← 返回列表
            </button>
            <h1 className="text-3xl font-bold text-gray-900">債務記錄詳情</h1>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <>
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ✏️ 編輯
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  🗑️ 刪除
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  ✅ 儲存
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  ❌ 取消
                </button>
              </>
            )}
          </div>
        </div>

        {/* 債務人資訊 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">債務人資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
              {editing ? (
                <input
                  type="text"
                  value={editData.debtor_name}
                  onChange={(e) => setEditData({ ...editData, debtor_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{record.debtor_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">身分證</label>
              {editing ? (
                <input
                  type="text"
                  value={editData.debtor_id_full}
                  onChange={(e) => setEditData({ ...editData, debtor_id_full: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{record.debtor_id_full}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性別</label>
              {editing ? (
                <select
                  value={editData.gender}
                  onChange={(e) => setEditData({ ...editData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
              ) : (
                <p className="text-gray-900">{record.gender}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手機</label>
              {editing ? (
                <input
                  type="text"
                  value={editData.debtor_phone || ''}
                  onChange={(e) => setEditData({ ...editData, debtor_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{record.debtor_phone || '未提供'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">職業</label>
              {editing ? (
                <input
                  type="text"
                  value={editData.profession || ''}
                  onChange={(e) => setEditData({ ...editData, profession: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{record.profession || '未提供'}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">居住地</label>
              {editing ? (
                <select
                  value={editData.residence}
                  onChange={(e) => setEditData({ ...editData, residence: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="北北基宜">北北基宜</option>
                  <option value="桃竹苗">桃竹苗</option>
                  <option value="中彰投">中彰投</option>
                  <option value="雲嘉南">雲嘉南</option>
                  <option value="高屏">高屏</option>
                  <option value="花東">花東</option>
                  <option value="離島">離島</option>
                </select>
              ) : (
                <p className="text-gray-900">{record.residence}</p>
              )}
            </div>
          </div>
        </div>

        {/* 債務資料 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">債務資料</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">債務日期</label>
              {editing ? (
                <input
                  type="date"
                  value={editData.debt_date}
                  onChange={(e) => setEditData({ ...editData, debt_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{formatDate(record.debt_date)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">票面金額</label>
              {editing ? (
                <input
                  type="number"
                  value={editData.face_value}
                  onChange={(e) => setEditData({ ...editData, face_value: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900 font-semibold">{formatCurrency(record.face_value)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">還款配合</label>
              {editing ? (
                <select
                  value={editData.payment_frequency}
                  onChange={(e) => setEditData({ ...editData, payment_frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="月結">月結</option>
                  <option value="季結">季結</option>
                  <option value="半年結">半年結</option>
                  <option value="年結">年結</option>
                  <option value="不定期">不定期</option>
                </select>
              ) : (
                <p className="text-gray-900">{record.payment_frequency}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">還款狀況</label>
              {editing ? (
                <select
                  value={editData.repayment_status}
                  onChange={(e) => setEditData({ ...editData, repayment_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="正常">正常</option>
                  <option value="待觀察">待觀察</option>
                  <option value="延遲">延遲</option>
                  <option value="呆帳">呆帳</option>
                </select>
              ) : (
                <p className="text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    record.repayment_status === '正常' ? 'bg-green-100 text-green-800' :
                    record.repayment_status === '待觀察' ? 'bg-yellow-100 text-yellow-800' :
                    record.repayment_status === '延遲' ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.repayment_status}
                  </span>
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
              {editing ? (
                <textarea
                  value={editData.note || ''}
                  onChange={(e) => setEditData({ ...editData, note: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              ) : (
                <p className="text-gray-900">{record.note || '無'}</p>
              )}
            </div>
          </div>
        </div>

        {/* 上傳者資訊 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">上傳者資訊</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">暱稱</label>
              <p className="text-gray-900">{record.uploader.nickname}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
              <p className="text-gray-900">{record.uploader.account}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">業務類型</label>
              <p className="text-gray-900">{record.uploader.business_type}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">業務區域</label>
              <p className="text-gray-900">{record.uploader.business_region}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">上傳時間</label>
              <p className="text-gray-900">{formatDateTime(record.created_at)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最後更新</label>
              <p className="text-gray-900">{formatDateTime(record.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* 編輯記錄 */}
        {record.admin_edited_by && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-yellow-900">管理員編輯記錄</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">編輯者：</span>
                {record.editor?.nickname} ({record.editor?.account})
              </p>
              <p className="text-gray-700">
                <span className="font-medium">編輯原因：</span>
                {record.admin_edit_reason}
              </p>
            </div>
          </div>
        )}

        {/* 修改申請記錄 */}
        {modificationRequests.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">修改申請記錄</h2>
            <div className="space-y-4">
              {modificationRequests.map((req) => (
                <div key={req.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{req.field_name}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      req.status === 'approved' ? 'bg-green-100 text-green-800' :
                      req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {req.status === 'approved' ? '已核准' : req.status === 'rejected' ? '已拒絕' : '待審核'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">原值：</span>{req.old_value}</p>
                    <p><span className="font-medium">新值：</span>{req.new_value}</p>
                    <p><span className="font-medium">申請原因：</span>{req.reason}</p>
                    <p><span className="font-medium">申請人：</span>{req.requester.nickname}</p>
                    <p><span className="font-medium">申請時間：</span>{formatDateTime(req.created_at)}</p>
                    {req.admin_comment && (
                      <p><span className="font-medium">審核意見：</span>{req.admin_comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 按讚記錄 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">按讚記錄 ({likes.length})</h2>
          {likes.length === 0 ? (
            <p className="text-gray-500">尚無按讚記錄</p>
          ) : (
            <div className="space-y-2">
              {likes.map((like) => (
                <div key={like.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-900">{like.liker.nickname} ({like.liker.account})</span>
                  <span className="text-sm text-gray-500">{formatDateTime(like.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

