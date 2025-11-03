'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import { useNotification } from '@/contexts/NotificationContext'
import { LevelBadge } from '@/components/member/LevelBadge'

interface DebtSearchResult {
  id: string
  debtor_name: string
  debtor_id_full: string
  debtor_phone?: string | null
  gender: string
  profession?: string | null
  residence: string
  debt_date: string
  face_value: number
  payment_frequency: string
  repayment_status: string
  note?: string | null
  created_at: string
  debtor_id_first_letter: string
  debtor_id_last5: string
  likes_count: number
  user_has_liked: boolean
  uploader?: {
    user_id: string
    nickname: string
    business_type: string
    business_region: string
    level_info?: {
      current_level: number
      title: string
      title_color: string
      activity_points: number
    } | null
    badge_count?: number
  }
}

export default function DebtSearchPage() {
  const router = useRouter()
  const { showLevelUp, showBadgeUnlock } = useNotification()

  // 查詢參數
  const [firstLetter, setFirstLetter] = useState('')
  const [last5, setLast5] = useState('')
  
  // UI 狀態
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState<DebtSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [remainingSearches, setRemainingSearches] = useState<number | null>(null)
  const [userStatus, setUserStatus] = useState<string | null>(null)
  const [likingDebtId, setLikingDebtId] = useState<string | null>(null)

  // 身分證首字母選項（A-Z）
  const firstLetterOptions = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  // 還款配合對應
  const paymentFrequencyMap: Record<string, string> = {
    'daily': '日結',
    'weekly': '周結',
    'monthly': '月結'
  }

  const checkUserStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        router.push('/login')
        return
      }

      const data = await response.json()
      setUserStatus(data.data.status)

      if (data.data.status !== 'approved') {
        router.push('/waiting-approval')
      }
    } catch (err) {
      console.error('Failed to check user status:', err)
      router.push('/login')
    }
  }, [router])

  // 檢查使用者登入狀態和審核狀態
  useEffect(() => {
    checkUserStatus()
  }, [checkUserStatus])

  // 處理查詢
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSearchResults([])
    setHasSearched(false)

    // 前端驗證
    if (!firstLetter || !last5) {
      setError('請填寫身分證首字母和後5碼')
      return
    }

    // 驗證後5碼格式
    if (!/^\d{5}$/.test(last5)) {
      setError('身分證後5碼必須為 5 位數字')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const params = new URLSearchParams({
        firstLetter,
        last5
      })

      const response = await fetch(`/api/debts/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '查詢失敗，請稍後再試')
        return
      }

      // 查詢成功
      setSearchResults(data.data.results || [])
      setRemainingSearches(data.data.remaining_searches)
      setHasSearched(true)

      // 檢查是否有升級或解鎖勳章
      if (data.data.activity) {
        // 檢查等級升級
        if (data.data.activity.level_up?.leveledUp) {
          showLevelUp(data.data.activity.level_up)
        }

        // 檢查勳章解鎖
        if (data.data.activity.badge_check?.newBadges?.length > 0) {
          showBadgeUnlock(data.data.activity.badge_check)
        }
      }

      // 重新載入頁面以更新導航欄的活躍度和配額
      // 使用 window.dispatchEvent 觸發自訂事件，讓 MemberNav 重新載入資料
      window.dispatchEvent(new Event('userDataUpdated'))
    } catch (err) {
      console.error('Search error:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  // 處理對債務記錄按讚
  const handleLike = async (debtId: string, currentLikesCount: number, userHasLiked: boolean) => {
    if (likingDebtId) return // 防止重複點擊

    setLikingDebtId(debtId)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      // 如果已經按讚，則取消按讚；否則按讚
      const method = userHasLiked ? 'DELETE' : 'POST'
      const response = await fetch(`/api/debts/${debtId}/like`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error?.message || (userHasLiked ? '取消按讚失敗' : '按讚失敗'))
        return
      }

      // 更新查詢結果中的按讚數和按讚狀態
      setSearchResults(prevResults =>
        prevResults.map(result =>
          result.id === debtId
            ? {
                ...result,
                likes_count: data.data.likes_count,
                user_has_liked: !userHasLiked
              }
            : result
        )
      )

      // 觸發使用者資料更新事件（更新導航欄配額）
      window.dispatchEvent(new Event('userDataUpdated'))

      // 顯示成功訊息
      alert(userHasLiked ? '✅ 已取消按讚' : '✅ 按讚成功！')
    } catch (err) {
      console.error('Like error:', err)
      alert('系統錯誤，請稍後再試')
    } finally {
      setLikingDebtId(null)
    }
  }

  // 格式化金額
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  if (userStatus === null) {
    return (
      <MemberLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-foreground">載入中...</div>
        </div>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout>
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">債務查詢</h1>
          <p className="text-foreground-muted">
            輸入身分證首字母和後5碼查詢債務記錄
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 查詢表單 */}
        <div className="bg-dark-300 border border-dark-200 rounded-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 身分證首字母 */}
              <div>
                <label htmlFor="firstLetter" className="block text-sm font-medium text-gray-300 mb-2">
                  身分證首字母 <span className="text-red-400">*</span>
                </label>
                <select
                  id="firstLetter"
                  value={firstLetter}
                  onChange={(e) => setFirstLetter(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                >
                  <option value="">請選擇</option>
                  {firstLetterOptions.map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>

              {/* 身分證後5碼 */}
              <div>
                <label htmlFor="last5" className="block text-sm font-medium text-gray-300 mb-2">
                  身分證後5碼 <span className="text-red-400">*</span>
                </label>
                <input
                  id="last5"
                  type="text"
                  value={last5}
                  onChange={(e) => setLast5(e.target.value.replace(/\D/g, ''))}
                  maxLength={5}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入5位數字"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  5 位數字
                </p>
              </div>

              {/* 查詢按鈕 */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
                >
                  {loading ? '查詢中...' : '🔍 查詢'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 查詢結果 */}
        {hasSearched && (
          <div className="space-y-4">
            {/* 結果標題 */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                查詢結果 {searchResults.length > 0 && `(${searchResults.length} 筆)`}
              </h2>
            </div>

            {/* 無結果提示 */}
            {searchResults.length === 0 && (
              <div className="bg-dark-300 border border-dark-200 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-foreground-muted text-lg">查無債務記錄</p>
                <p className="text-foreground-muted text-sm mt-2">
                  請確認身分證首字母和後5碼是否正確
                </p>
              </div>
            )}

            {/* 結果列表 */}
            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="bg-dark-300 border border-dark-200 rounded-lg p-6 hover:border-blue-500 transition-colors duration-200"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* 左側：債務人資訊（遮罩） */}
                      <div className="lg:col-span-2 space-y-4">
                        <div className="border-b border-dark-200 pb-3 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-foreground">
                            債務人資訊
                          </h3>
                          {/* 按讚功能 */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">
                              {result.likes_count} 人按讚
                            </span>
                            <button
                              onClick={() => handleLike(result.id, result.likes_count, result.user_has_liked)}
                              disabled={likingDebtId === result.id}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                result.user_has_liked
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-dark-200 text-foreground hover:bg-dark-100 border border-dark-100'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {likingDebtId === result.id
                                ? '處理中...'
                                : result.user_has_liked
                                ? '👍 已按讚'
                                : '👍 按讚'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">姓名</p>
                            <p className="text-foreground">{result.debtor_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">身分證</p>
                            <p className="text-foreground">{result.debtor_id_full}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">性別</p>
                            <p className="text-foreground">{result.gender}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">手機</p>
                            <p className="text-foreground">{result.debtor_phone || '未提供'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">職業</p>
                            <p className="text-foreground">{result.profession || '未提供'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">居住地</p>
                            <p className="text-foreground">{result.residence}</p>
                          </div>
                        </div>

                        <div className="border-t border-dark-200 pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-foreground mb-3">債務資料</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">債務日期</p>
                              <p className="text-foreground">{formatDate(result.debt_date)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">票面金額</p>
                              <p className="text-foreground font-semibold text-green-400">
                                {formatCurrency(result.face_value)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">還款配合</p>
                              <p className="text-foreground">
                                {paymentFrequencyMap[result.payment_frequency] || result.payment_frequency}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">還款狀況</p>
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                result.repayment_status === '正常' ? 'bg-green-500/20 text-green-400' :
                                result.repayment_status === '結清' ? 'bg-blue-500/20 text-blue-400' :
                                result.repayment_status === '呆帳' ? 'bg-red-500/20 text-red-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {result.repayment_status}
                              </span>
                            </div>
                          </div>
                          {result.note && (
                            <div className="mt-4">
                              <p className="text-xs text-gray-400 mb-1">備註</p>
                              <p className="text-foreground text-sm">{result.note}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 右側：上傳會員資訊卡 */}
                      <div className="lg:col-span-1">
                        <div className="bg-dark-400 border border-dark-200 rounded-lg p-4 h-full">
                          <h4 className="text-sm font-semibold text-foreground mb-4 border-b border-dark-200 pb-2">
                            📇 上傳會員資訊
                          </h4>
                          {result.uploader ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">暱稱</p>
                                <p className="text-foreground font-medium">{result.uploader.nickname}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">業務類型</p>
                                <p className="text-foreground">{result.uploader.business_type}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 mb-1">業務區域</p>
                                <p className="text-foreground">{result.uploader.business_region}</p>
                              </div>

                              {/* 等級資訊 */}
                              {result.uploader.level_info && (
                                <div className="pt-3 border-t border-dark-200">
                                  <p className="text-xs text-gray-400 mb-2">等級</p>
                                  <div className="flex justify-center">
                                    <LevelBadge
                                      level={result.uploader.level_info.current_level}
                                      title={result.uploader.level_info.title}
                                      titleColor={result.uploader.level_info.title_color}
                                      size="large"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-foreground-muted text-sm">無上傳會員資訊</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 使用說明 */}
        <div className="mt-8 p-4 bg-dark-300 border border-dark-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">📋 使用說明</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 每日查詢次數限制為 20 次</li>
            <li>• 查詢結果中的債務人資訊已自動遮罩，保護隱私</li>
            <li>• 可查看上傳者的業務資訊和等級，方便聯繫合作</li>
            <li>• 點擊「給予按讚」可以為上傳者按讚（功能即將推出）</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}

