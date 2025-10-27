'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'

interface Member {
  user_id: string
  account: string
  nickname: string
}

function ComposeMessageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [receiverId, setReceiverId] = useState(searchParams.get('reply_to') || '')
  const [subject, setSubject] = useState(searchParams.get('subject') || '')
  const [content, setContent] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/members/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }

      const result = await response.json()
      setMembers(result.data || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!receiverId || !subject || !content) {
      alert('請填寫所有欄位')
      return
    }

    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          subject,
          content,
          message_type: 'personal'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      alert('✅ 訊息已發送')
      router.push('/messages?tab=sent')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('發送失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = members.filter(member =>
    member.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.account.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <MemberLayout>
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">撰寫訊息</h1>
          <button
            onClick={() => router.push('/messages')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← 返回
          </button>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          {/* 收件者 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收件者 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="搜尋會員（暱稱或帳號）"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">請選擇收件者</option>
                {filteredMembers.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.nickname} ({member.account})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 主旨 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              主旨 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={200}
              placeholder="請輸入訊息主旨"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              {subject.length} / 200 字元
            </p>
          </div>

          {/* 內容 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              內容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              placeholder="請輸入訊息內容"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length} 字元
            </p>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '發送中...' : '✉️ 發送訊息'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/messages')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </MemberLayout>
  )
}

export default function ComposeMessagePage() {
  return (
    <Suspense fallback={
      <MemberLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-foreground">載入中...</div>
        </div>
      </MemberLayout>
    }>
      <ComposeMessageContent />
    </Suspense>
  )
}

