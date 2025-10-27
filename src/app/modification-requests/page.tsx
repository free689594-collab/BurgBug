'use client'

import { useState, useEffect } from 'react'
import MemberLayout from '@/components/layouts/MemberLayout'
import { FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react'

interface ModificationRequest {
  id: string
  request_type?: string
  field_name?: string
  old_value: string
  new_value: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_comment: string | null
  created_at: string
  reviewed_at: string | null
  debt_records?: {
    debtor_name: string
    debtor_id_first_letter: string
    debtor_id_last5: string
  }
}

export default function ModificationRequestsPage() {
  const [profileRequests, setProfileRequests] = useState<ModificationRequest[]>([])
  const [debtRequests, setDebtRequests] = useState<ModificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'debt'>('profile')

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

      const [profileRes, debtRes] = await Promise.all([
        fetch('/api/modification-requests/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/modification-requests/debt', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfileRequests(profileData.data || [])
      } else {
        console.error('Profile requests failed:', await profileRes.text())
      }

      if (debtRes.ok) {
        const debtData = await debtRes.json()
        setDebtRequests(debtData.data || [])
      } else {
        console.error('Debt requests failed:', await debtRes.text())
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1"><Clock className="w-3 h-3" />待審核</span>
      case 'approved':
        return <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs flex items-center gap-1"><CheckCircle className="w-3 h-3" />已核准</span>
      case 'rejected':
        return <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs flex items-center gap-1"><XCircle className="w-3 h-3" />已拒絕</span>
      default:
        return null
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW')
  }

  const requests = activeTab === 'profile' ? profileRequests : debtRequests

  return (
    <MemberLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <FileEdit className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">資料修改申請</h1>
        </div>

        {/* 分頁 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-primary text-white'
                : 'bg-dark-200 text-foreground-muted hover:bg-dark-100'
            }`}
          >
            會員資料 ({profileRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('debt')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'debt'
                ? 'bg-primary text-white'
                : 'bg-dark-200 text-foreground-muted hover:bg-dark-100'
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
            <p className="text-foreground-muted">尚無{activeTab === 'profile' ? '會員' : '債務'}資料修改申請</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-dark-300 border border-dark-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">
                        {activeTab === 'profile' 
                          ? `修改${getRequestTypeText(req.request_type!)}`
                          : `修改${req.field_name}`
                        }
                      </h3>
                      {getStatusBadge(req.status)}
                    </div>
                    {activeTab === 'debt' && req.debt_records && (
                      <p className="text-sm text-foreground-muted mb-2">
                        債務人：{req.debt_records.debtor_id_first_letter}****{req.debt_records.debtor_id_last5}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-foreground-muted">{formatDate(req.created_at)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">原值</p>
                    <p className="text-sm text-foreground bg-dark-200 px-3 py-2 rounded">{req.old_value}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground-muted mb-1">新值</p>
                    <p className="text-sm text-foreground bg-dark-200 px-3 py-2 rounded">{req.new_value}</p>
                  </div>
                </div>

                {req.reason && (
                  <div className="mb-3">
                    <p className="text-xs text-foreground-muted mb-1">申請理由</p>
                    <p className="text-sm text-foreground">{req.reason}</p>
                  </div>
                )}

                {req.admin_comment && (
                  <div className="bg-dark-200 px-3 py-2 rounded">
                    <p className="text-xs text-foreground-muted mb-1">管理員回覆</p>
                    <p className="text-sm text-foreground">{req.admin_comment}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MemberLayout>
  )
}

