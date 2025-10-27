'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'

interface Message {
  id: string
  subject: string
  content: string
  message_type: 'system' | 'announcement' | 'personal'
  is_read: boolean
  created_at: string
  sender: {
    id: string
    account: string
    nickname: string
  } | null
  sender_id: string | null
}

export default function AdminInboxPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [selectedMessages, setSelectedMessages] = useState<string[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/admin/messages/inbox?status=${statusFilter}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const result = await response.json()
      setMessages(result.data?.messages || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      alert('載入訊息失敗')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const handleMarkAsRead = async (messageIds: string[], isRead: boolean) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/admin/messages/inbox', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message_ids: messageIds,
          is_read: isRead
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update messages')
      }

      // 重新載入訊息列表
      await fetchMessages()
      setSelectedMessages([])
    } catch (error) {
      console.error('Failed to update messages:', error)
      alert('更新失敗')
    }
  }

  const handleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([])
    } else {
      setSelectedMessages(messages.map(m => m.id))
    }
  }

  const handleSelectMessage = (messageId: string) => {
    if (selectedMessages.includes(messageId)) {
      setSelectedMessages(selectedMessages.filter(id => id !== messageId))
    } else {
      setSelectedMessages([...selectedMessages, messageId])
    }
  }

  const handleViewMessage = async (message: Message) => {
    setSelectedMessage(message)
    
    // 如果訊息未讀，標記為已讀
    if (!message.is_read) {
      await handleMarkAsRead([message.id], true)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyContent.trim()) {
      alert('請輸入回覆內容')
      return
    }

    try {
      setReplying(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_id: selectedMessage.sender_id,
          subject: `Re: ${selectedMessage.subject}`,
          content: replyContent,
          message_type: 'personal'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send reply')
      }

      alert('✅ 回覆已發送！')
      setReplyContent('')
      setSelectedMessage(null)
    } catch (error) {
      console.error('Failed to send reply:', error)
      alert('回覆發送失敗')
    } finally {
      setReplying(false)
    }
  }

  const getMessageTypeLabel = (type: string) => {
    if (type === 'system') return '系統通知'
    if (type === 'announcement') return '重要公告'
    return '會員報信'
  }

  const getMessageTypeColor = (type: string) => {
    if (type === 'system') return 'bg-blue-600'
    if (type === 'announcement') return 'bg-red-600'
    return 'bg-green-600'
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">收件箱</h1>
          <p className="text-foreground-muted mt-2">查看和管理收到的訊息</p>
        </div>

        {/* 篩選和操作列 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* 篩選 */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-foreground-muted">狀態：</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-dark-200 border border-dark-100 rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">全部</option>
                <option value="unread">未讀</option>
                <option value="read">已讀</option>
              </select>
            </div>

            {/* 批量操作 */}
            {selectedMessages.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-foreground-muted">
                  已選擇 {selectedMessages.length} 則訊息
                </span>
                <button
                  onClick={() => handleMarkAsRead(selectedMessages, true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm transition-colors"
                >
                  標記為已讀
                </button>
                <button
                  onClick={() => handleMarkAsRead(selectedMessages, false)}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm transition-colors"
                >
                  標記為未讀
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 訊息列表 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-foreground-muted">載入中...</div>
          ) : messages.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted">沒有訊息</div>
          ) : (
            <div className="divide-y divide-dark-200">
              {/* 全選列 */}
              <div className="px-4 py-3 bg-dark-200 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedMessages.length === messages.length && messages.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-primary bg-dark-100 border-dark-50 rounded focus:ring-primary focus:ring-2"
                />
                <span className="ml-3 text-sm text-foreground-muted">全選</span>
              </div>

              {/* 訊息項目 */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`px-4 py-4 hover:bg-dark-200 transition-colors ${
                    !message.is_read ? 'bg-dark-250' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 選擇框 */}
                    <input
                      type="checkbox"
                      checked={selectedMessages.includes(message.id)}
                      onChange={() => handleSelectMessage(message.id)}
                      className="mt-1 w-4 h-4 text-primary bg-dark-100 border-dark-50 rounded focus:ring-primary focus:ring-2"
                    />

                    {/* 訊息內容 */}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleViewMessage(message)}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        {/* 未讀標記 */}
                        {!message.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        
                        {/* 訊息類型 */}
                        <span className={`px-2 py-0.5 ${getMessageTypeColor(message.message_type)} text-white text-xs rounded-full`}>
                          {getMessageTypeLabel(message.message_type)}
                        </span>

                        {/* 主旨 */}
                        <span className={`font-medium ${!message.is_read ? 'text-foreground' : 'text-foreground-muted'}`}>
                          {message.subject}
                        </span>
                      </div>

                      {/* 發送者和時間 */}
                      <div className="flex items-center space-x-4 text-sm text-foreground-muted">
                        <span>
                          來自：{message.sender ? message.sender.nickname || message.sender.account : '系統'}
                        </span>
                        <span>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: zhTW })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 訊息詳情彈窗 */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-300 border border-dark-200 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                {/* 標題列 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`px-2 py-0.5 ${getMessageTypeColor(selectedMessage.message_type)} text-white text-xs rounded-full`}>
                        {getMessageTypeLabel(selectedMessage.message_type)}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedMessage.subject}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="text-foreground-muted hover:text-foreground"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 訊息資訊 */}
                <div className="mb-4 pb-4 border-b border-dark-200">
                  <div className="text-sm text-foreground-muted space-y-1">
                    <div>
                      來自：{selectedMessage.sender ? selectedMessage.sender.nickname || selectedMessage.sender.account : '系統'}
                    </div>
                    <div>
                      時間：{new Date(selectedMessage.created_at).toLocaleString('zh-TW')}
                    </div>
                  </div>
                </div>

                {/* 訊息內容 */}
                <div className="prose prose-invert max-w-none">
                  <div className="text-foreground whitespace-pre-wrap">{selectedMessage.content}</div>
                </div>

                {/* 回覆區域 - 只在會員報信時顯示 */}
                {selectedMessage.message_type === 'personal' && selectedMessage.sender_id && (
                  <div className="mt-6 pt-6 border-t border-dark-200">
                    <h3 className="text-lg font-semibold text-foreground mb-3">💬 回覆訊息</h3>
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="輸入回覆內容..."
                      rows={4}
                      className="w-full px-4 py-3 bg-dark-200 border border-dark-100 rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                    <div className="mt-3 flex justify-end space-x-2">
                      <button
                        onClick={handleReply}
                        disabled={replying || !replyContent.trim()}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {replying ? '發送中...' : '📤 發送回覆'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 操作按鈕 */}
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setSelectedMessage(null)
                      setReplyContent('')
                    }}
                    className="px-4 py-2 bg-dark-200 hover:bg-dark-100 text-foreground rounded-md transition-colors"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

