'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'

interface Message {
  id: string
  sender_id: string
  sender_type: string
  receiver_id: string
  subject: string
  content: string
  message_type: string
  is_read: boolean
  read_at: string | null
  created_at: string
  sender?: {
    account: string
    nickname: string
  }
  receiver?: {
    account: string
    nickname: string
  }
}

export default function MessagesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [unreadOnly, setUnreadOnly] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [activeTab, pagination.page, unreadOnly])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const endpoint = activeTab === 'inbox' ? '/api/messages/inbox' : '/api/messages/sent'
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(activeTab === 'inbox' && unreadOnly ? { unread_only: 'true' } : {})
      })

      const response = await fetch(`${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const result = await response.json()
      setMessages(result.data || [])
      setPagination(result.pagination)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      alert('載入訊息失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('確定要刪除這則訊息嗎？')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      alert('✅ 訊息已刪除')
      fetchMessages()
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('刪除失敗')
    }
  }

  const handleViewMessage = (messageId: string) => {
    router.push(`/messages/${messageId}`)
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

  return (
    <MemberLayout>
      <div className="max-w-6xl mx-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">站內信</h1>
          <p className="text-gray-600 mt-2">查看和管理您的訊息</p>
        </div>

        {/* 分頁切換 */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => {
                  setActiveTab('inbox')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'inbox'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📥 收件箱
              </button>
              <button
                onClick={() => {
                  setActiveTab('sent')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'sent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📤 寄件箱
              </button>
            </nav>
          </div>

          {/* 篩選選項（僅收件箱） */}
          {activeTab === 'inbox' && (
            <div className="p-4 border-b border-gray-200">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => {
                    setUnreadOnly(e.target.checked)
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">只顯示未讀訊息</span>
              </label>
            </div>
          )}

          {/* 訊息列表 */}
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">載入中...</div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {activeTab === 'inbox' ? '沒有收到的訊息' : '沒有發送的訊息'}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    activeTab === 'inbox' && !message.is_read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleViewMessage(message.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {activeTab === 'inbox' && !message.is_read && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        <span className="text-sm text-gray-600">
                          {activeTab === 'inbox' 
                            ? `來自：${message.sender?.nickname || message.sender?.account || '系統'}`
                            : `發送給：${message.receiver?.nickname || message.receiver?.account || '未知'}`
                          }
                        </span>
                        {message.message_type === 'system' && (
                          <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                            系統
                          </span>
                        )}
                        {message.message_type === 'announcement' && (
                          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                            公告
                          </span>
                        )}
                      </div>
                      <h3 className={`text-base mb-1 ${
                        activeTab === 'inbox' && !message.is_read ? 'font-bold' : 'font-medium'
                      }`}>
                        {message.subject}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        {message.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(message.id)
                      }}
                      className="ml-4 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 分頁 */}
          {!loading && messages.length > 0 && (
            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                顯示 {((pagination.page - 1) * pagination.limit) + 1} 到{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} 筆，
                共 {pagination.total} 筆
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一頁
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  第 {pagination.page} / {pagination.totalPages} 頁
                </span>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 撰寫新訊息按鈕 */}
        <button
          onClick={() => router.push('/messages/compose')}
          className="fixed bottom-8 right-8 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="text-xl">✉️</span>
          <span>撰寫訊息</span>
        </button>
      </div>
    </MemberLayout>
  )
}

