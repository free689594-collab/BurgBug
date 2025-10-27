'use client'

import MemberNav from '@/components/member/MemberNav'

export default function TestNavPage() {
  return (
    <div className="min-h-screen bg-background">
      <MemberNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          MemberNav 組件測試頁面
        </h1>
        <div className="bg-dark-300 p-6 rounded-lg">
          <p className="text-foreground-muted">
            這是一個測試頁面，用於檢視 MemberNav 組件的顯示效果。
          </p>
          <p className="text-foreground-muted mt-2">
            請檢查以下項目：
          </p>
          <ul className="list-disc list-inside text-foreground-muted mt-2 space-y-1">
            <li>Logo 和標題是否正確顯示</li>
            <li>4 個導航連結是否正確顯示</li>
            <li>會員資訊是否正確顯示（暱稱、業務類型、業務區域、狀態）</li>
            <li>配額顯示是否正確（剩餘上傳次數、剩餘查詢次數）</li>
            <li>登出按鈕是否正常運作</li>
            <li>手機版選單是否正常運作</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

