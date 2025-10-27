'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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

export default function MessageDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [message, setMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessage()
  }, [id])

  const fetchMessage = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/messages/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch message')
      }

      const result = await response.json()
      setMessage(result.data)
    } catch (error) {
      console.error('Failed to fetch message:', error)
      alert('載入訊息失敗')
      router.push('/messages')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('確定要刪除這則訊息嗎？')) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      alert('✅ 訊息已刪除')
      router.push('/messages')
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('刪除失敗')
    }
  }

  const handleReply = () => {
    if (!message) return
    router.push(`/messages/compose?reply_to=${message.sender_id}&subject=Re: ${message.subject}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (loading) {
    return (
      <MemberLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">載入中...</div>
        </div>
      </MemberLayout>
    )
  }

  if (!message) {
    return (
      <MemberLayout>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">訊息不存在</div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="max-w-4xl mx-auto">
        {/* 標題列 */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/messages')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← 返回訊息列表
          </button>
          <div className="flex gap-2">
            {message.sender_type !== 'system' && (
              <button
                onClick={handleReply}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                回覆
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              刪除
            </button>
          </div>
        </div>

        {/* 訊息內容 */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* 訊息標頭 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{message.subject}</h1>
              <div className="flex gap-2">
                {message.message_type === 'system' && (
                  <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded-full">
                    系統訊息
                  </span>
                )}
                {message.message_type === 'announcement' && (
                  <span className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-full">
                    公告
                  </span>
                )}
                {message.is_read && (
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                    已讀
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-medium">寄件者：</span>
                <span>
                  {message.sender_type === 'system' 
                    ? '系統'
                    : `${message.sender?.nickname || message.sender?.account || '未知'} (${message.sender?.account || ''})`
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">收件者：</span>
                <span>
                  {message.receiver?.nickname || message.receiver?.account || '未知'} ({message.receiver?.account || ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">發送時間：</span>
                <span>{formatDate(message.created_at)}</span>
              </div>
              {message.read_at && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">已讀時間：</span>
                  <span>{formatDate(message.read_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 訊息內容 */}
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800">
                {message.content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

