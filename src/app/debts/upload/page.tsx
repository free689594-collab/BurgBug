'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MemberLayout from '@/components/layouts/MemberLayout'
import { useNotification } from '@/contexts/NotificationContext'

export default function DebtUploadPage() {
  const router = useRouter()
  const { showLevelUp, showBadgeUnlock } = useNotification()

  // 債務人基本資料
  const [debtorName, setDebtorName] = useState('')
  const [debtorIdFull, setDebtorIdFull] = useState('')
  const [gender, setGender] = useState('')
  const [debtorPhone, setDebtorPhone] = useState('')
  const [profession, setProfession] = useState('')
  const [residence, setResidence] = useState('')
  
  // 債務資料
  const [debtDate, setDebtDate] = useState('')
  const [faceValue, setFaceValue] = useState('')
  const [paymentFrequency, setPaymentFrequency] = useState('')
  const [repaymentStatus, setRepaymentStatus] = useState('待觀察')
  const [note, setNote] = useState('')
  
  // UI 狀態
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [remainingUploads, setRemainingUploads] = useState<number | null>(null)
  const [userStatus, setUserStatus] = useState<string | null>(null)

  // 選項列表
  const genderOptions = ['男', '女', '其他']
  const residenceOptions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
  const paymentFrequencyOptions = [
    { label: '日結', value: 'daily' },
    { label: '周結', value: 'weekly' },
    { label: '月結', value: 'monthly' }
  ]
  const repaymentStatusOptions = ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳']

  // 檢查使用者登入狀態和審核狀態
  useEffect(() => {
    checkUserStatus()
  }, [])

  const checkUserStatus = async () => {
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
  }

  // 驗證身分證格式
  const validateIdFormat = (id: string): boolean => {
    return /^[A-Z][0-9]{9}$/i.test(id)
  }

  // 驗證電話格式
  const validatePhoneFormat = (phone: string): boolean => {
    return /^09\d{8}$/.test(phone)
  }

  // 驗證備註內容
  const validateNote = (text: string): boolean => {
    // 檢查長度
    if (text.length > 200) return false

    // 檢查不當內容（簡單版本，可以擴展）
    const inappropriateWords = ['幹', '操', '靠北', '他媽']
    return !inappropriateWords.some(word => text.includes(word))
  }

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // 前端驗證
    if (!debtorName || !debtorIdFull || !gender || !residence || 
        !debtDate || !faceValue || !paymentFrequency || !repaymentStatus) {
      setError('請填寫所有必填欄位')
      return
    }

    // 驗證身分證格式
    if (!validateIdFormat(debtorIdFull)) {
      setError('身分證格式錯誤，應為 1 個英文字母 + 9 個數字（例如：A123456789）')
      return
    }

    // 驗證電話格式（選填）
    if (debtorPhone && !validatePhoneFormat(debtorPhone)) {
      setError('電話格式錯誤，請輸入正確的手機號碼（例如：0912345678）')
      return
    }

    // 驗證票面金額
    const faceValueNum = parseFloat(faceValue)
    if (isNaN(faceValueNum) || faceValueNum <= 0) {
      setError('票面金額必須為大於 0 的數字')
      return
    }

    // 驗證備註
    if (note && !validateNote(note)) {
      setError('備註長度不可超過 100 字元，且不可包含不當內容')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/debts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          debtor_name: debtorName.trim(),
          debtor_id_full: debtorIdFull.toUpperCase(),
          debtor_phone: debtorPhone || undefined,
          gender,
          profession: profession || undefined,
          residence,
          debt_date: debtDate,
          face_value: faceValueNum,
          payment_frequency: paymentFrequency,
          repayment_status: repaymentStatus,
          note: note || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message || '上傳失敗，請稍後再試')
        return
      }

      // 上傳成功
      setSuccess(true)
      setRemainingUploads(data.data.remaining_uploads)

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

      // 觸發使用者資料更新事件（更新導航欄和儀表板）
      window.dispatchEvent(new Event('userDataUpdated'))

      // 清空表單
      setDebtorName('')
      setDebtorIdFull('')
      setGender('')
      setDebtorPhone('')
      setProfession('')
      setResidence('')
      setDebtDate('')
      setFaceValue('')
      setPaymentFrequency('')
      setRepaymentStatus('待觀察')
      setNote('')

      // 3 秒後清除成功訊息
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Upload error:', err)
      setError('系統錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
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
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">債務人資料上傳</h1>
          <p className="text-foreground-muted">
            請填寫完整的債務人資訊，所有標示 <span className="text-red-400">*</span> 的欄位為必填
          </p>
        </div>

        {/* 成功訊息 */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
            <p className="text-green-400">✅ 債務記錄上傳成功！</p>
          </div>
        )}

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* 上傳表單 */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 第一區：債務人基本資料 */}
          <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6 border-b border-dark-200 pb-3">
              第一區：債務人基本資料
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 姓名 */}
              <div>
                <label htmlFor="debtorName" className="block text-sm font-medium text-gray-300 mb-2">
                  姓名 <span className="text-red-400">*</span>
                </label>
                <input
                  id="debtorName"
                  type="text"
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入債務人姓名"
                  disabled={loading}
                  required
                />
              </div>

              {/* 身分證 */}
              <div>
                <label htmlFor="debtorIdFull" className="block text-sm font-medium text-gray-300 mb-2">
                  身分證 <span className="text-red-400">*</span>
                </label>
                <input
                  id="debtorIdFull"
                  type="text"
                  value={debtorIdFull}
                  onChange={(e) => setDebtorIdFull(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：A123456789"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  1 個英文字母 + 9 個數字
                </p>
              </div>

              {/* 性別 */}
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-300 mb-2">
                  性別 <span className="text-red-400">*</span>
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                >
                  <option value="">請選擇性別</option>
                  {genderOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* 手機 */}
              <div>
                <label htmlFor="debtorPhone" className="block text-sm font-medium text-gray-300 mb-2">
                  手機（選填）
                </label>
                <input
                  id="debtorPhone"
                  type="tel"
                  value={debtorPhone}
                  onChange={(e) => setDebtorPhone(e.target.value)}
                  maxLength={10}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="例如：0912345678"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-400">
                  09 開頭，共 10 碼
                </p>
              </div>

              {/* 職業 */}
              <div>
                <label htmlFor="profession" className="block text-sm font-medium text-gray-300 mb-2">
                  職業（選填）
                </label>
                <input
                  id="profession"
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入職業"
                  disabled={loading}
                />
              </div>

              {/* 居住地 */}
              <div>
                <label htmlFor="residence" className="block text-sm font-medium text-gray-300 mb-2">
                  居住地 <span className="text-red-400">*</span>
                </label>
                <select
                  id="residence"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                >
                  <option value="">請選擇居住地</option>
                  {residenceOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 第二區：債務資料 */}
          <div className="bg-dark-300 border border-dark-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-6 border-b border-dark-200 pb-3">
              第二區：債務資料
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 債務日期 */}
              <div>
                <label htmlFor="debtDate" className="block text-sm font-medium text-gray-300 mb-2">
                  債務日期 <span className="text-red-400">*</span>
                </label>
                <input
                  id="debtDate"
                  type="date"
                  value={debtDate}
                  onChange={(e) => setDebtDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  格式：YYYY-MM-DD
                </p>
              </div>

              {/* 票面金額 */}
              <div>
                <label htmlFor="faceValue" className="block text-sm font-medium text-gray-300 mb-2">
                  票面金額 <span className="text-red-400">*</span>
                </label>
                <input
                  id="faceValue"
                  type="number"
                  value={faceValue}
                  onChange={(e) => setFaceValue(e.target.value)}
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入金額"
                  disabled={loading}
                  required
                />
                <p className="mt-1 text-xs text-gray-400">
                  必須為大於 0 的數字
                </p>
              </div>

              {/* 還款配合 */}
              <div>
                <label htmlFor="paymentFrequency" className="block text-sm font-medium text-gray-300 mb-2">
                  還款配合 <span className="text-red-400">*</span>
                </label>
                <select
                  id="paymentFrequency"
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                >
                  <option value="">請選擇還款配合</option>
                  {paymentFrequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 目前還款狀況 */}
              <div>
                <label htmlFor="repaymentStatus" className="block text-sm font-medium text-gray-300 mb-2">
                  目前還款狀況 <span className="text-red-400">*</span>
                </label>
                <select
                  id="repaymentStatus"
                  value={repaymentStatus}
                  onChange={(e) => setRepaymentStatus(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                  required
                >
                  {repaymentStatusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* 客戶評鑑備註 */}
              <div className="md:col-span-2">
                <label htmlFor="note" className="block text-sm font-medium text-gray-300 mb-2">
                  客戶評鑑備註（選填）
                </label>
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  rows={4}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="請輸入客戶評鑑備註（最多 200 字元）"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {note.length}/200 字元，不可包含不當內容
                </p>
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {loading ? '上傳中...' : '上傳債務資料'}
            </button>
          </div>
        </form>

        {/* 使用說明 */}
        <div className="mt-8 p-4 bg-dark-300 border border-dark-200 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-2">📋 使用說明</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• 每日上傳次數限制為 10 次</li>
            <li>• 所有債務人資訊將自動進行遮罩處理，保護隱私</li>
            <li>• 身分證首字母和後5碼將自動提取，用於查詢索引</li>
            <li>• 上傳後的資料可在「我的債務人」頁面中管理</li>
            <li>• 只有還款狀況可以更新，其他資訊上傳後無法修改</li>
          </ul>
        </div>
      </div>
    </MemberLayout>
  )
}

