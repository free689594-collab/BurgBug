'use client'

import { useState, useEffect } from 'react'

interface PrivateFieldsModalProps {
  debtRecordId: string
  debtorName: string
  initialData: {
    settled_amount?: number | null
    recovered_amount?: number | null
    bad_debt_amount?: number | null
    internal_rating?: number | null
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function PrivateFieldsModal({
  debtRecordId,
  debtorName,
  initialData,
  isOpen,
  onClose,
  onSuccess
}: PrivateFieldsModalProps) {
  const [settledAmount, setSettledAmount] = useState<string>('')
  const [recoveredAmount, setRecoveredAmount] = useState<string>('')
  const [badDebtAmount, setBadDebtAmount] = useState<string>('')
  const [internalRating, setInternalRating] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 初始化表單資料
  useEffect(() => {
    if (isOpen) {
      setSettledAmount(initialData.settled_amount?.toString() || '')
      setRecoveredAmount(initialData.recovered_amount?.toString() || '')
      setBadDebtAmount(initialData.bad_debt_amount?.toString() || '')
      setInternalRating(initialData.internal_rating || null)
      setError('')
    }
  }, [isOpen, initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)
      setError('')

      const token = localStorage.getItem('access_token')
      if (!token) {
        setError('請先登入')
        return
      }

      // 準備更新資料
      const updateData: any = {}

      if (settledAmount !== '') {
        const value = parseFloat(settledAmount)
        if (isNaN(value) || value < 0) {
          setError('結清金額必須為有效的正數')
          return
        }
        updateData.settled_amount = value
      } else {
        updateData.settled_amount = null
      }

      if (recoveredAmount !== '') {
        const value = parseFloat(recoveredAmount)
        if (isNaN(value) || value < 0) {
          setError('已收回金額必須為有效的正數')
          return
        }
        updateData.recovered_amount = value
      } else {
        updateData.recovered_amount = null
      }

      if (badDebtAmount !== '') {
        const value = parseFloat(badDebtAmount)
        if (isNaN(value) || value < 0) {
          setError('呆帳金額必須為有效的正數')
          return
        }
        updateData.bad_debt_amount = value
      } else {
        updateData.bad_debt_amount = null
      }

      updateData.internal_rating = internalRating

      const response = await fetch(`/api/debts/${debtRecordId}/private-fields`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '更新失敗')
      }

      // 成功後關閉 Modal 並通知父元件
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Failed to update private fields:', err)
      setError(err.message || '更新失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 標題列 */}
        <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">編輯私密欄位</h2>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* 提示訊息 */}
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500 rounded-lg">
            <p className="text-blue-400 text-sm">
              <strong>🔒 私密資訊</strong>：以下欄位僅供您個人使用，不會顯示在其他會員的查詢結果中。
            </p>
          </div>

          {/* 金額欄位 */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                結清金額
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settledAmount}
                onChange={(e) => setSettledAmount(e.target.value)}
                placeholder="請輸入結清金額"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                已收回金額
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={recoveredAmount}
                onChange={(e) => setRecoveredAmount(e.target.value)}
                placeholder="請輸入已收回金額"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                呆帳金額
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={badDebtAmount}
                onChange={(e) => setBadDebtAmount(e.target.value)}
                placeholder="請輸入呆帳金額"
                className="w-full px-4 py-2 bg-dark-200 border border-dark-100 rounded-lg text-foreground placeholder-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* 內部評價（星級） */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              內部評價（合作體感）
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setInternalRating(internalRating === star ? null : star)}
                  className="text-3xl transition-colors focus:outline-none"
                >
                  {internalRating && star <= internalRating ? (
                    <span className="text-yellow-400">★</span>
                  ) : (
                    <span className="text-gray-600">☆</span>
                  )}
                </button>
              ))}
              {internalRating && (
                <button
                  type="button"
                  onClick={() => setInternalRating(null)}
                  className="ml-2 text-sm text-foreground-muted hover:text-foreground"
                >
                  清除
                </button>
              )}
            </div>
            <p className="text-xs text-foreground-muted mt-2">
              點擊星星進行評分，用於記錄與債務人的合作體驗
            </p>
          </div>
        </form>

        {/* 底部按鈕 */}
        <div className="px-6 py-4 border-t border-dark-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2 bg-dark-200 hover:bg-dark-100 disabled:bg-gray-700 disabled:cursor-not-allowed text-foreground rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-primary hover:bg-primary-dark disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {submitting ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  )
}

