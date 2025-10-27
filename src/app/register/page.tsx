'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [businessRegion, setBusinessRegion] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [showPassword, setShowPassword] = useState(false)

  // 業務類型選項
  const businessTypes = [
    '當鋪',
    '小額',
    '融資',
    '代書',
    '代辦'
  ]

  // 業務區域選項
  const businessRegions = [
    '北北基宜',
    '桃竹苗',
    '中彰投',
    '雲嘉南',
    '高屏澎',
    '花東'
  ]

  // 即時密碼強度驗證
  const validatePasswordStrength = (pwd: string): string[] => {
    const errors: string[] = []
    if (pwd.length > 0 && pwd.length < 8) {
      errors.push('至少需要 8 個字元')
    }
    if (pwd.length > 0 && !/[A-Z]/.test(pwd)) {
      errors.push('需要包含至少一個大寫字母')
    }
    if (pwd.length > 0 && !/[a-z]/.test(pwd)) {
      errors.push('需要包含至少一個小寫字母')
    }
    if (pwd.length > 0 && !/[0-9]/.test(pwd)) {
      errors.push('需要包含至少一個數字')
    }
    return errors
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value
    setPassword(newPassword)
    setPasswordErrors(validatePasswordStrength(newPassword))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 前端驗證
    if (!account || !password || !confirmPassword || !nickname || !businessType || !businessRegion) {
      setError('請填寫所有必填欄位')
      return
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致')
      return
    }

    const errors = validatePasswordStrength(password)
    if (errors.length > 0) {
      setError('密碼強度不足：' + errors.join('、'))
      return
    }

    // 驗證電話格式（選填，但如果有提供則需驗證）
    if (phone && !/^09\d{8}$/.test(phone)) {
      setError('電話格式錯誤，請輸入正確的手機號碼（例如：0912345678）')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          password,
          nickname,
          businessType,
          businessRegion,
          phone: phone || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        // 處理錯誤訊息
        if (data.error?.details?.errors) {
          setError(data.error.details.errors.join('、'))
        } else {
          setError(data.error?.message || '註冊失敗')
        }
        return
      }

      // 註冊成功，將使用者資訊存入 localStorage
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user))
      }

      // 導向等待審核頁面
      router.push('/waiting-approval?registered=true')
    } catch (err) {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="w-full max-w-md">
        {/* Logo 和標題 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">臻好尋</h1>
          <p className="text-gray-400">債務查詢系統 - 註冊新帳號</p>
        </div>

        {/* 註冊表單 */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          {/* 返回首頁按鈕 */}
          <div className="flex justify-start mb-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>返回首頁</span>
            </button>
          </div>

          <h2 className="text-2xl font-semibold text-white mb-6">建立新帳號</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 帳號輸入 */}
            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-300 mb-2">
                帳號 <span className="text-red-400">*</span>
              </label>
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5-15 字元，僅允許英文字母和數字"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                帳號僅允許英文字母和數字，長度 5-15 字元
              </p>
            </div>

            {/* 暱稱輸入 */}
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-2">
                暱稱 <span className="text-red-400">*</span>
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={10}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="請輸入您的暱稱"
                disabled={loading}
                required
              />
              <p className="mt-1 text-xs text-gray-400">
                最多 10 字元 {nickname.length > 0 && `(已輸入 ${nickname.length}/10)`}
              </p>
            </div>

            {/* 業務類型選擇 */}
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-300 mb-2">
                業務類型 <span className="text-red-400">*</span>
              </label>
              <select
                id="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              >
                <option value="">請選擇業務類型</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* 業務區域選擇 */}
            <div>
              <label htmlFor="businessRegion" className="block text-sm font-medium text-gray-300 mb-2">
                業務區域 <span className="text-red-400">*</span>
              </label>
              <select
                id="businessRegion"
                value={businessRegion}
                onChange={(e) => setBusinessRegion(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
                required
              >
                <option value="">請選擇業務區域</option>
                {businessRegions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            {/* 電話輸入 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                電話（選填）
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如：0912345678"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-400">
                請輸入手機號碼（09 開頭，共 10 碼）
              </p>
            </div>

            {/* 密碼輸入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                密碼 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="至少 8 字元，包含大小寫字母和數字"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? '隱藏' : '顯示'}
                </button>
              </div>
              
              {/* 密碼強度提示 */}
              {password && (
                <div className="mt-2 space-y-1">
                  {passwordErrors.length > 0 ? (
                    passwordErrors.map((err, index) => (
                      <p key={index} className="text-xs text-red-400">
                        ✗ {err}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-green-400">✓ 密碼強度符合要求</p>
                  )}
                </div>
              )}
            </div>

            {/* 確認密碼輸入 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                確認密碼 <span className="text-red-400">*</span>
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="再次輸入密碼"
                disabled={loading}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  ✗ 兩次輸入的密碼不一致
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-xs text-green-400">
                  ✓ 密碼一致
                </p>
              )}
            </div>

            {/* 註冊按鈕 */}
            <button
              type="submit"
              disabled={
                loading ||
                passwordErrors.length > 0 ||
                password !== confirmPassword ||
                !account ||
                !nickname ||
                !businessType ||
                !businessRegion
              }
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {loading ? '註冊中...' : '註冊'}
            </button>
          </form>

          {/* 登入連結 */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              已有帳號？{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
                立即登入
              </Link>
            </p>
          </div>

          {/* 註冊說明 */}
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
            <h3 className="text-sm font-medium text-gray-300 mb-2">註冊須知</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• 標示 <span className="text-red-400">*</span> 為必填欄位</li>
              <li>• 註冊後需要等待管理員審核</li>
              <li>• 審核通過後即可使用完整功能</li>
              <li>• 請妥善保管您的帳號密碼</li>
              <li>• 業務類型和區域將用於系統統計</li>
            </ul>
          </div>
        </div>

        {/* 版權資訊 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>© 2025 臻好尋債務查詢系統. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

