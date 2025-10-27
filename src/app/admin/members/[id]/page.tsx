'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { LevelBadge } from '@/components/member/LevelBadge'
import { BadgeDisplay } from '@/components/member/BadgeDisplay'

interface MemberDetail {
  user_id: string
  account: string
  nickname: string
  email: string
  phone: string
  business_type: string
  business_region: string
  status: string
  level: number
  activity_points: number
  created_at: string
  updated_at: string
  level_config?: {
    level: number
    name: string
    required_points: number
    upload_quota: number
    query_quota: number
  }
  badges: any[]
  activity_history: any[]
  statistics: {
    upload_count: number
    query_count: number
    received_likes: number
    given_likes: number
  }
  today_usage: {
    upload_count: number
    query_count: number
  }
  recent_debts: any[]
  modification_requests: any[]
}

export default function MemberDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'debts' | 'requests'>('overview')

  useEffect(() => {
    fetchMemberDetail()
  }, [id])

  const fetchMemberDetail = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/admin/members/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch member detail')
      }

      const result = await response.json()
      setMember(result.data)
    } catch (error) {
      console.error('Failed to fetch member detail:', error)
      alert('載入會員資料失敗')
      router.push('/admin/members')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!confirm(`確定要將會員狀態改為「${newStatus}」嗎？`)) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      alert('✅ 狀態更新成功')
      fetchMemberDetail()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('更新失敗')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      pending: { text: '待審核', color: 'bg-yellow-100 text-yellow-800' },
      approved: { text: '已審核', color: 'bg-green-100 text-green-800' },
      suspended: { text: '已停用', color: 'bg-red-100 text-red-800' }
    }
    const badge = badges[status] || { text: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const getActionTypeName = (actionType: string) => {
    const types: Record<string, string> = {
      upload: '上傳債務',
      query: '查詢債務',
      like: '收到按讚',
      like_received: '收到按讚',
      daily_login: '每日登入',
      consecutive_login: '連續登入',
      first_upload: '首次上傳',
      level_up: '等級提升',
      badge_unlock: '解鎖勳章'
    }
    return types[actionType] || actionType
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">載入中...</div>
        </div>
      </AdminLayout>
    )
  }

  if (!member) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">會員不存在</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* 標題列 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/admin/members')}
              className="mb-2 text-gray-600 hover:text-gray-900"
            >
              ← 返回會員列表
            </button>
            <h1 className="text-3xl font-bold text-gray-900">會員詳細資料</h1>
          </div>
          <div className="flex gap-2">
            {member.status === 'pending' && (
              <button
                onClick={() => handleUpdateStatus('approved')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ✓ 審核通過
              </button>
            )}
            {member.status === 'approved' && (
              <button
                onClick={() => handleUpdateStatus('suspended')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                ✕ 停用帳號
              </button>
            )}
            {member.status === 'suspended' && (
              <button
                onClick={() => handleUpdateStatus('approved')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                ✓ 啟用帳號
              </button>
            )}
          </div>
        </div>

        {/* 會員基本資訊卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {member.nickname.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{member.nickname}</h2>
                <p className="text-gray-600">@{member.account}</p>
                <div className="mt-2">{getStatusBadge(member.status)}</div>
              </div>
            </div>
            <div className="text-right">
              <LevelBadge
                level={member.level || 1}
                title={member.level_config?.name || `等級 ${member.level || 1}`}
                titleColor="text-blue-600"
                size="large"
              />
              <p className="text-sm text-gray-600 mt-2">
                活躍度：{member.activity_points || 0} 點
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">電子郵件</p>
              <p className="font-medium">{member.email || '未提供'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">手機號碼</p>
              <p className="font-medium">{member.phone || '未提供'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">業務類型</p>
              <p className="font-medium">{member.business_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">業務區域</p>
              <p className="font-medium">{member.business_region}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">註冊時間</p>
              <p className="font-medium">{formatDate(member.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">最後更新</p>
              <p className="font-medium">{formatDate(member.updated_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">今日上傳</p>
              <p className="font-medium">
                {member.today_usage?.upload_count || 0} / {member.level_config?.upload_quota || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">今日查詢</p>
              <p className="font-medium">
                {member.today_usage?.query_count || 0} / {member.level_config?.query_quota || 0}
              </p>
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">上傳總次數</p>
                <p className="text-3xl font-bold text-gray-900">{member.statistics.upload_count}</p>
              </div>
              <div className="text-4xl">📤</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">查詢總次數</p>
                <p className="text-3xl font-bold text-gray-900">{member.statistics.query_count}</p>
              </div>
              <div className="text-4xl">🔍</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">收到的讚</p>
                <p className="text-3xl font-bold text-gray-900">{member.statistics.received_likes}</p>
              </div>
              <div className="text-4xl">👍</div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">給出的讚</p>
                <p className="text-3xl font-bold text-gray-900">{member.statistics.given_likes}</p>
              </div>
              <div className="text-4xl">💖</div>
            </div>
          </div>
        </div>

        {/* 勳章展示 */}
        {member.badges.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              🏆 已獲得勳章（{member.badges.length} 個）
            </h3>
            <BadgeDisplay
              badges={member.badges.map((badge: any) => ({
                badge_key: badge.badge_config?.badge_key || '',
                badge_name: badge.badge_config?.badge_name || '',
                description: badge.badge_config?.description || '',
                difficulty: badge.badge_config?.difficulty || 'easy',
                icon_name: badge.badge_config?.icon_name || 'Award',
                unlocked_at: badge.unlocked_at
              }))}
              totalBadges={member.badges.length}
            />
          </div>
        )}

        {/* 分頁內容 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 總覽
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'activity'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⚡ 活躍度歷史
              </button>
              <button
                onClick={() => setActiveTab('debts')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'debts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📋 債務記錄
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📝 修改申請
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="text-center text-gray-600 py-8">
                總覽資訊已顯示在上方卡片中
              </div>
            )}

            {activeTab === 'activity' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  最近 30 天活躍度記錄（{member.activity_history.length} 筆）
                </h3>
                {member.activity_history.length === 0 ? (
                  <div className="text-center text-gray-600 py-8">尚無活躍度記錄</div>
                ) : (
                  <div className="space-y-2">
                    {member.activity_history.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{getActionTypeName(activity.action)}</p>
                          <p className="text-sm text-gray-600">{formatDate(activity.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">+{activity.points} 點</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'debts' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  最近上傳的債務記錄（{member.recent_debts.length} 筆）
                </h3>
                {member.recent_debts.length === 0 ? (
                  <div className="text-center text-gray-600 py-8">尚無債務記錄</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">債務人</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">身分證</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">上傳時間</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {member.recent_debts.map((debt) => (
                          <tr key={debt.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{debt.debtor_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{debt.debtor_id}</td>
                            <td className="px-6 py-4 whitespace-nowrap">${debt.face_value?.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {formatDate(debt.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  資料修改申請記錄（{member.modification_requests.length} 筆）
                </h3>
                {member.modification_requests.length === 0 ? (
                  <div className="text-center text-gray-600 py-8">尚無修改申請</div>
                ) : (
                  <div className="space-y-4">
                    {member.modification_requests.map((request) => (
                      <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {request.status === 'pending' ? '待審核' :
                             request.status === 'approved' ? '已通過' : '已拒絕'}
                          </span>
                          <span className="text-sm text-gray-600">{formatDate(request.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600">申請原因：{request.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

