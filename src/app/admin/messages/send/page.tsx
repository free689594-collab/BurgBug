'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/layouts/AdminLayout'

interface Member {
  user_id: string
  account: string
  nickname: string
}

export default function AdminMessagesPage() {
  const router = useRouter()
  const [receiverType, setReceiverType] = useState<'all' | 'individual'>('all')
  const [receiverId, setReceiverId] = useState('')
  const [messageType, setMessageType] = useState<'system' | 'announcement'>('system')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/admin/members?status=approved&limit=1000', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }

      const result = await response.json()
      setMembers(result.data?.members || [])
    } catch (error) {
      console.error('Failed to fetch members:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject || !content) {
      alert('請填寫主旨和內容')
      return
    }

    if (receiverType === 'individual' && !receiverId) {
      alert('請選擇收件者')
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
          receiver_id: receiverType === 'all' ? 'all' : receiverId,
          subject,
          content,
          message_type: messageType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      alert(`✅ ${result.message || '訊息已發送'}`)
      
      // 清空表單
      setSubject('')
      setContent('')
      setReceiverId('')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('發送失敗')
    } finally {
      setLoading(false)
    }
  }

  const filteredMembers = Array.isArray(members)
    ? members.filter(member =>
        member.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.account?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">發送系統訊息</h1>
          <p className="text-gray-600 mt-2">發送系統通知或公告給會員</p>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
          {/* 訊息類型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              訊息類型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="system"
                  checked={messageType === 'system'}
                  onChange={(e) => setMessageType(e.target.value as 'system')}
                  className="mr-2"
                />
                <span>系統通知</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="announcement"
                  checked={messageType === 'announcement'}
                  onChange={(e) => setMessageType(e.target.value as 'announcement')}
                  className="mr-2"
                />
                <span>重要公告</span>
              </label>
            </div>
          </div>

          {/* 收件者類型 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              收件者 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="all"
                  checked={receiverType === 'all'}
                  onChange={(e) => setReceiverType(e.target.value as 'all')}
                  className="mr-2"
                />
                <span>所有會員</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="individual"
                  checked={receiverType === 'individual'}
                  onChange={(e) => {
                    setReceiverType(e.target.value as 'individual')
                    if (members.length === 0) fetchMembers()
                  }}
                  className="mr-2"
                />
                <span>指定會員</span>
              </label>
            </div>

            {receiverType === 'individual' && (
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
                  required={receiverType === 'individual'}
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
            )}
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

          {/* 預覽 */}
          {(subject || content) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">預覽</h3>
              <div className="bg-white p-4 rounded border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  {messageType === 'system' && (
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                      系統通知
                    </span>
                  )}
                  {messageType === 'announcement' && (
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      重要公告
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{subject || '(無主旨)'}</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{content || '(無內容)'}</p>
              </div>
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '發送中...' : `📢 發送${receiverType === 'all' ? '給所有會員' : '給指定會員'}`}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}

