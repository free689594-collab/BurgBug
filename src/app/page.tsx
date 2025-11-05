'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/**
 * 根目錄首頁
 * - 如果使用者已登入，自動跳轉到 dashboard
 * - 如果使用者未登入，顯示歡迎首頁
 */
export default function Home() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // 檢查使用者是否已登入，並根據角色跳轉
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/test-cookie')
        const data = await response.json()

        // 如果有 access_token，表示已登入
        if (data.hasAccessToken) {
          // 取得使用者資料以確認角色
          const token = document.cookie
            .split('; ')
            .find(row => row.startsWith('access_token='))
            ?.split('=')[1]

          if (token) {
            const userRes = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` },
            })

            if (userRes.ok) {
              const userData = await userRes.json()
              const userRole = userData.data?.role

              // 根據角色跳轉到對應的 dashboard
              if (userRole === 'admin') {
                router.replace('/admin/dashboard')
              } else {
                router.replace('/dashboard')
              }
              return
            }
          }

          // 如果無法取得使用者資料，預設跳轉到會員 dashboard
          router.replace('/dashboard')
          return
        }
      } catch (error) {
        console.error('檢查登入狀態失敗:', error)
      } finally {
        setIsChecking(false)
        setIsReady(true)
      }
    }

    checkAuth()
  }, [router])

  // 載入中狀態（檢查登入狀態或避免 hydration 錯誤）
  if (!isReady || isChecking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-foreground-muted">載入中...</p>
        </div>
      </main>
    )
  }

  // 所有使用者都顯示歡迎首頁
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 animate-fade-in">
      <div className="w-full max-w-4xl space-y-12">
        {/* 主標題區域 */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            臻好尋
          </h1>
          <p className="text-xl md:text-2xl text-foreground-muted">
            債務查詢系統
          </p>
          <p className="text-lg text-foreground-muted max-w-2xl mx-auto mt-6">
            專業的債務資訊查詢與管理平台
          </p>
        </div>

        {/* 功能介紹區域 */}
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="bg-dark-300 rounded-lg p-6 text-center space-y-3 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-default">
            <div className="text-4xl">📤</div>
            <h3 className="text-lg font-semibold text-foreground">債務上傳</h3>
            <p className="text-sm text-foreground-muted">
              快速上傳債務人資訊，建立完整的債務資料庫
            </p>
          </div>
          <div className="bg-dark-300 rounded-lg p-6 text-center space-y-3 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-default">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-semibold text-foreground">債務查詢</h3>
            <p className="text-sm text-foreground-muted">
              即時查詢債務人資訊，掌握最新債務狀況
            </p>
          </div>
          <div className="bg-dark-300 rounded-lg p-6 text-center space-y-3 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/20 cursor-default">
            <div className="text-4xl">📊</div>
            <h3 className="text-lg font-semibold text-foreground">數據管理</h3>
            <p className="text-sm text-foreground-muted">
              完善的數據統計與管理功能，提升工作效率
            </p>
          </div>
        </div>

        {/* 行動按鈕區域 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3 rounded-md bg-primary text-white font-medium hover:bg-primary-dark hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 text-center"
          >
            立即註冊
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3 rounded-md bg-dark-300 text-foreground font-medium hover:bg-dark-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-dark-100 focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 text-center border border-dark-100"
          >
            會員登入
          </Link>
        </div>

        {/* FAQ 常見問題區域 */}
        <div className="mt-12 bg-dark-300 rounded-lg p-6 border border-dark-100">
          <h3 className="text-lg font-semibold text-foreground mb-4">❓ 常見問題</h3>
          <div className="space-y-3">
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 誰可以使用本系統？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 本系統專為金融業務從業人員設計，包括當鋪、融資公司、代書等相關行業人員。註冊後需經過管理員審核才能使用完整功能。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 如何註冊帳號？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 點擊「立即註冊」按鈕，填寫帳號、密碼、暱稱、業務類型和業務區域等必要資訊。提交後請等待管理員審核，審核通過後即可登入使用。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 審核需要多久時間？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 通常在 1-3 個工作天內完成審核。審核期間請耐心等待，我們會盡快處理您的申請。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 可以查詢哪些資訊？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 可查詢債務人的借款記錄、還款狀況、債務總額等資訊。查詢時需提供債務人身分證首字母和後5碼，系統會顯示所有符合條件的債務記錄。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 資料如何保護？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 系統使用資料遮罩技術保護敏感資訊，並採用 RLS（Row Level Security）政策確保使用者只能存取授權的資料。所有資料傳輸均經過加密處理。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 每日可以查詢幾次？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 一般會員每日可查詢 30 次、上傳 20 筆債務資料。如需更高配額，請聯絡系統管理員。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 忘記密碼怎麼辦？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 目前請聯絡系統管理員協助重置密碼。未來將提供自助式密碼重置功能。
              </p>
            </details>

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary transition-colors list-none flex items-center gap-2">
                <span className="text-primary group-open:rotate-90 transition-transform">▶</span>
                Q: 可以在多個裝置登入嗎？
              </summary>
              <p className="mt-2 text-xs text-foreground-muted pl-6 leading-relaxed">
                A: 系統限制單一裝置登入，確保帳號安全。如在新裝置登入，舊裝置的登入狀態將自動登出。
              </p>
            </details>
          </div>
        </div>

        {/* 免責聲明區域 */}
        <div className="mt-12 bg-dark-300 rounded-lg p-6 border border-dark-100">
          <h3 className="text-sm font-semibold text-foreground mb-3">⚠️ 免責聲明</h3>
          <div className="text-xs text-foreground-muted space-y-2 leading-relaxed">
            <p>
              1. 本系統提供的債務資訊僅供參考，使用者應自行查證資訊的正確性與完整性。
            </p>
            <p>
              2. 本系統不對資訊的準確性、即時性或完整性做任何明示或暗示的保證。
            </p>
            <p>
              3. 使用者因使用本系統資訊所產生的任何直接或間接損失，本系統概不負責。
            </p>
            <p>
              4. 使用者應遵守相關法律法規，不得將本系統用於非法用途。
            </p>
            <p>
              5. 本系統保留隨時修改或終止服務的權利，恕不另行通知。
            </p>
            <p>
              6. 本系統資料由會員自行上傳，系統不保證資料的真實性。使用者應自行判斷資料的可信度，並承擔使用風險。
            </p>
            <p>
              7. 本系統尊重使用者隱私權，所有個人資料均依照相關法規進行保護。系統不會將使用者資料提供給第三方，除非經過使用者同意或法律要求。
            </p>
            <p>
              8. 本系統內容受智慧財產權法保護，未經授權不得複製、轉載或用於商業用途。禁止使用爬蟲程式或其他自動化工具擷取系統資料。
            </p>
            <p>
              9. 如對系統資料有爭議，請透過系統提供的申訴管道提出。我們將在收到申訴後 5 個工作天內進行調查並回覆處理結果。
            </p>
            <p className="mt-4 pt-2 border-t border-dark-100">
              使用本系統即表示您已閱讀並同意以上條款。如有疑問，請聯絡系統管理員。
            </p>
          </div>
        </div>

        {/* 聯絡資訊區域 */}
        <div className="mt-12 bg-dark-300 rounded-lg p-6 border border-dark-100">
          <h3 className="text-lg font-semibold text-foreground mb-4">📞 聯絡我們</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            {/* 電子郵件 */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">📧</div>
              <div>
                <p className="font-medium text-foreground">電子郵件</p>
                <p className="text-foreground-muted text-xs">（後續提供）</p>
              </div>
            </div>

            {/* LINE 官方帳號 */}
            <div className="flex items-center gap-3">
              <div className="text-2xl">💬</div>
              <div>
                <p className="font-medium text-foreground">LINE 官方帳號</p>
                <p className="text-foreground-muted text-xs">（後續提供）</p>
              </div>
            </div>

            {/* 客服時間 */}
            <div className="flex items-center gap-3 md:col-span-2">
              <div className="text-2xl">🕐</div>
              <div>
                <p className="font-medium text-foreground">客服時間</p>
                <p className="text-foreground-muted text-xs">週一至週五 09:00-18:00</p>
              </div>
            </div>
          </div>
        </div>

        {/* 頁尾資訊 */}
        <div className="text-center text-xs text-foreground-muted mt-8">
          <p>© 2025 臻好尋債務查詢系統. All rights reserved.</p>
        </div>
      </div>
    </main>
  )
}

