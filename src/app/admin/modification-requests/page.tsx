'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/layouts/AdminLayout'
import { FileEdit, CheckCircle, XCircle } from 'lucide-react'

interface ModificationRequest {
  id: string
  user_id: string
  request_type?: string
  field_name?: string
  old_value: string
  new_value: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  members?: { nickname: string; business_type?: string; business_region?: string }
  debt_records?: { debtor_name: string; debtor_id_first_letter: string; debtor_id_last5: string }
}

export default function AdminModificationRequestsPage() {
  const [profileRequests, setProfileRequests] = useState<ModificationRequest[]>([])
  const [debtRequests, setDebtRequests] = useState<ModificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'debt'>('profile')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [adminComment, setAdminComment] = useState('')

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      // 修正：使用正確的token key
      const token = localStorage.getItem('access_token')

      if (!token) {
        console.error('No access token found')
        return
      }

      const res = await fetch('/api/admin/modification-requests?status=pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setProfileRequests(data.data.profile || [])
        setDebtRequests(data.data.debt || [])
      } else {
        console.error('Fetch requests failed:', await res.text())
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (id: string, type: 'profile' | 'debt', status: 'approved' | 'rejected') => {
    setReviewingId(id)
    try {
      // 修正：使用正確的token key
      const token = localStorage.getItem('access_token')

      if (!token) {
        alert('未找到認證令牌，請重新登入')
        return
      }

      const res = await fetch(`/api/admin/modification-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type, status, admin_comment: adminComment || null })
      })

      if (res.ok) {
        alert(status === 'approved' ? '✅ 已核准' : '✅ 已拒絕')
        setAdminComment('')
        fetchRequests()
      } else {
        const errorData = await res.json()
        alert(`操作失敗：${errorData.error || '未知錯誤'}`)
      }
    } catch (error) {
      console.error('Failed to review:', error)
      alert('操作失敗')
    } finally {
      setReviewingId(null)
    }
  }

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'nickname': return '暱稱'
      case 'business_type': return '業務類型'
      case 'business_region': return '業務區域'
      default: return type
    }
  }

  const requests = activeTab === 'profile' ? profileRequests : debtRequests

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileEdit className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">資料修改申請審核</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'profile' ? 'bg-primary text-white' : 'bg-dark-200 text-foreground-muted'
            }`}
          >
            會員資料 ({profileRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('debt')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'debt' ? 'bg-primary text-white' : 'bg-dark-200 text-foreground-muted'
            }`}
          >
            債務資料 ({debtRequests.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 bg-dark-300 rounded-lg">
            <p className="text-foreground-muted">目前沒有待審核的申請</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-dark-300 border border-dark-200 rounded-lg p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-foreground mb-1">
                    {activeTab === 'profile' 
                      ? `修改${getRequestTypeText(req.request_type!)}`
                      : `修改${req.field_name}`
                    }
                  </h3>
                  <p className="text-sm text-foreground-muted">
                    申請人：{req.members?.nickname || '未知'}
                    {activeTab === 'debt' && req.debt_records && (
                      <> | 債務人：{req.debt_records.debtor_id_first_letter}****{req.debt_records.debtor_id_last5}</>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">原值</p>
                    <p className="text-sm bg-dark-200 px-3 py-2 rounded">{req.old_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">新值</p>
                    <p className="text-sm bg-green-500/10 text-green-400 px-3 py-2 rounded">{req.new_value}</p>
                  </div>
                </div>

                {req.reason && (
                  <div className="mb-3">
                    <p className="text-xs text-foreground-muted mb-1">申請理由</p>
                    <p className="text-sm">{req.reason}</p>
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-xs text-foreground-muted mb-1 block">管理員回覆（選填）</label>
                  <textarea
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    className="w-full bg-dark-200 border border-dark-100 rounded px-3 py-2 text-sm"
                    rows={2}
                    placeholder="輸入審核意見..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleReview(req.id, activeTab, 'approved')}
                    disabled={reviewingId === req.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    核准
                  </button>
                  <button
                    onClick={() => handleReview(req.id, activeTab, 'rejected')}
                    disabled={reviewingId === req.id}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    拒絕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

