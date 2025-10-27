"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'

function SessionConflictContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState<'takeover' | 'cancel' | null>(null)
  const from = searchParams.get('from') || '/'

  const handle = async (action: 'takeover' | 'cancel') => {
    try {
      setLoading(action)
      const res = await fetch('/api/auth/resolve-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) throw new Error('請求失敗')
      const data = await res.json()
      if (action === 'takeover') {
        // 取得建議導向：優先回到觸發路徑，其次 /admin/dashboard
        const target = from || data?.data?.redirectTo || '/admin/dashboard'
        router.replace(target)
      } else {
        router.replace('/login')
      }
    } catch (e) {
      alert('操作失敗，請重試')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg rounded-lg border border-dark-200 bg-dark-300 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">偵測到裝置衝突</h1>
        <p className="mt-3 text-foreground-muted">
          我們發現你的帳號似乎在另一個裝置或瀏覽器已登入，造成目前裝置的會話（session）失效。
          你可以選擇以下其中一個操作：
        </p>

        <ul className="mt-4 list-disc pl-5 text-foreground-muted space-y-2">
          <li>
            <span className="text-foreground">繼續目前裝置</span>：系統會登出其他裝置，讓你在此裝置繼續使用。
          </li>
          <li>
            <span className="text-foreground">取消本次登入</span>：保持其他裝置登入狀態，返回登入頁。
          </li>
        </ul>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handle('takeover')}
            disabled={loading !== null}
            className="w-full rounded-md bg-primary px-4 py-2 text-white font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {loading === 'takeover' ? '處理中...' : '登出其他裝置並繼續'}
          </button>
          <button
            onClick={() => handle('cancel')}
            disabled={loading !== null}
            className="w-full rounded-md bg-dark-100 border border-dark-200 px-4 py-2 text-foreground hover:bg-dark-200 disabled:opacity-50"
          >
            {loading === 'cancel' ? '處理中...' : '取消本次登入'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SessionConflictPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">載入中...</div>
      </div>
    }>
      <SessionConflictContent />
    </Suspense>
  )
}

