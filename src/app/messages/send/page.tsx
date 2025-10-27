'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'

export default function MemberSendMessagePage() {
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !content.trim()) {
      alert('請填寫主旨和內容')
      return
    }

    if (subject.length > 200) {
      alert('主旨不能超過 200 字元')
      return
    }

    try {
      setSending(true)
      const token = localStorage.getItem('access_token')
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_type: 'admin',
          subject: subject.trim(),
          content: content.trim(),
          message_type: 'personal'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || '發送失敗')
      }

      alert('訊息已發送！')
      setSubject('')
      setContent('')
      router.push('/messages/inbox')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.message || '發送失敗，請稍後再試')
    } finally {
      setSending(false)
    }
  }

  const handleCancel = () => {
    if (subject || content) {
      if (confirm('確定要取消嗎？未儲存的內容將會遺失。')) {
        router.push('/messages/inbox')
      }
    } else {
      router.push('/messages/inbox')
    }
  }

  return (
    <MemberLayout>
      <div className="max-w-3xl mx-auto">
        {/* 標題 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">發送訊息給管理員</h1>
          <p className="text-foreground-muted mt-2">有任何問題或建議，歡迎與我們聯繫</p>
        </div>

        {/* 表單 */}
        <form onSubmit={handleSubmit} className="bg-dark-300 border border-dark-200 rounded-lg p-6">
          {/* 收件者說明 */}
          <div className="mb-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-700 rounded-md">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-200">
                <p className="font-medium mb-1">收件者：系統管理員</p>
                <p className="text-blue-300">您的訊息將會發送給所有管理員，我們會盡快回覆您。</p>
              </div>
            </div>
          </div>

          {/* 主旨 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              主旨 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="請輸入訊息主旨"
              maxLength={200}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-md text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
            <p className="mt-1 text-xs text-foreground-muted">
              {subject.length} / 200 字元
            </p>
          </div>

          {/* 內容 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              內容 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="請輸入訊息內容"
              rows={10}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-md text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              required
            />
            <p className="mt-1 text-xs text-foreground-muted">
              {content.length} 字元
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={sending}
              className="px-6 py-2 bg-dark-200 hover:bg-dark-100 text-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={sending || !subject.trim() || !content.trim()}
              className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>發送中...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>發送訊息</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* 使用提示 */}
        <div className="mt-6 p-4 bg-dark-300 border border-dark-200 rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">💡 使用提示</h3>
          <ul className="text-sm text-foreground-muted space-y-1">
            <li>• 請清楚描述您的問題或建議，以便我們更快為您處理</li>
            <li>• 如需查詢特定債務記錄，請提供相關資訊（如債務人姓名、上傳日期等）</li>
            <li>• 管理員會在收到訊息後盡快回覆，請耐心等候</li>
            <li>• 您可以在「收件箱」查看管理員的回覆</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}

