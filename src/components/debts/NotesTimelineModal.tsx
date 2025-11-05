'use client'

import { useState, useEffect } from 'react'
import type { DebtRecordNote } from '@/types/debt'

interface NotesTimelineModalProps {
  debtRecordId: string
  debtorName: string
  isOpen: boolean
  onClose: () => void
}

export default function NotesTimelineModal({
  debtRecordId,
  debtorName,
  isOpen,
  onClose
}: NotesTimelineModalProps) {
  const [notes, setNotes] = useState<DebtRecordNote[]>([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 載入備註列表
  useEffect(() => {
    if (isOpen) {
      fetchNotes()
    }
  }, [isOpen, debtRecordId])

  const fetchNotes = async () => {
    try {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      const response = await fetch(`/api/debts/${debtRecordId}/notes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '載入備註失敗')
      }

      const data = await response.json()
      setNotes(data.data || [])
    } catch (err: any) {
      console.error('Failed to fetch notes:', err)
      setError(err.message || '載入備註失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newNoteContent.trim()) {
      setError('請輸入備註內容')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      const response = await fetch(`/api/debts/${debtRecordId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newNoteContent.trim()
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '新增備註失敗')
      }

      // 清空輸入框並重新載入備註列表
      setNewNoteContent('')
      await fetchNotes()
    } catch (err: any) {
      console.error('Failed to create note:', err)
      setError(err.message || '新增備註失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">備註時間軸</h2>
            <p className="text-sm text-foreground-muted mt-1">債務人：{debtorName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 新增備註表單 */}
          <form onSubmit={handleSubmit} className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              新增備註
            </label>
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="輸入備註內容..."
              rows={3}
              maxLength={1000}
              className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-foreground-muted">
                {newNoteContent.length} / 1000 字元
              </span>
              <button
                type="submit"
                disabled={submitting || !newNoteContent.trim()}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
              >
                {submitting ? '新增中...' : '新增備註'}
              </button>
            </div>
          </form>

          {/* 備註列表 */}
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-foreground-muted mt-2">載入中...</p>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-foreground-muted">尚無備註記錄</p>
              <p className="text-foreground-muted text-sm mt-1">新增第一筆備註吧！</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground mb-3">
                歷史記錄（{notes.length} 筆）
              </h3>
              {notes.map((note, index) => (
                <div
                  key={note.id}
                  className="relative pl-6 pb-4 border-l-2 border-dark-200 last:border-l-0 last:pb-0"
                >
                  {/* 時間軸圓點 */}
                  <div className="absolute left-0 top-0 -translate-x-[9px] w-4 h-4 rounded-full bg-primary border-2 border-dark-300"></div>
                  
                  {/* 備註內容 */}
                  <div className="bg-dark-400 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-foreground-muted">
                        {formatDateTime(note.created_at)}
                      </span>
                      {note.created_at !== note.updated_at && (
                        <span className="text-xs text-foreground-muted">
                          已編輯
                        </span>
                      )}
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-dark-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-dark-200 hover:bg-dark-100 text-foreground rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

