'use client'

import MemberLayout from '@/components/layouts/MemberLayout'

/**
 * 測試頁面：驗證 MemberLayout 組件
 * 
 * 測試項目：
 * 1. MemberNav 導航欄是否正常顯示
 * 2. 頁面內容區域是否正確渲染
 * 3. 響應式設計是否正常運作
 * 4. 黑色調主題是否一致
 */
export default function TestLayoutPage() {
  return (
    <MemberLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="bg-dark-200 rounded-lg p-6 border border-dark-100">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            MemberLayout 組件測試頁面
          </h1>
          <p className="text-foreground-muted">
            這是一個測試頁面，用於驗證 MemberLayout 組件的顯示效果。
          </p>
        </div>

        {/* 測試檢查清單 */}
        <div className="bg-dark-200 rounded-lg p-6 border border-dark-100">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            測試檢查清單
          </h2>
          <ul className="space-y-3 text-foreground-muted">
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>MemberNav 導航欄是否正常顯示在頂部？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>Logo 和標題「臻好尋」是否正確顯示？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>4 個導航連結是否正確顯示？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>會員資訊（暱稱、業務類型、業務區域、狀態）是否正確顯示？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>配額顯示（剩餘上傳次數、剩餘查詢次數）是否正確顯示？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>登出按鈕是否正常運作？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>手機版選單是否正常運作？（請調整瀏覽器寬度測試）</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>頁面內容區域是否正確渲染在導航欄下方？</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">✓</span>
              <span>黑色調主題是否一致？</span>
            </li>
          </ul>
        </div>

        {/* 範例內容卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-100">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              範例卡片 1
            </h3>
            <p className="text-foreground-muted text-sm">
              這是一個範例內容卡片，用於測試佈局的響應式設計。
            </p>
          </div>
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-100">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              範例卡片 2
            </h3>
            <p className="text-foreground-muted text-sm">
              請調整瀏覽器寬度，觀察卡片的排列方式是否正確。
            </p>
          </div>
          <div className="bg-dark-200 rounded-lg p-4 border border-dark-100">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              範例卡片 3
            </h3>
            <p className="text-foreground-muted text-sm">
              桌面版應該顯示 3 欄，平板版顯示 2 欄，手機版顯示 1 欄。
            </p>
          </div>
        </div>

        {/* 測試說明 */}
        <div className="bg-dark-200 rounded-lg p-6 border border-dark-100">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            測試說明
          </h2>
          <div className="space-y-2 text-foreground-muted text-sm">
            <p>
              <strong className="text-foreground">桌面版測試：</strong>
              在寬度 ≥ 768px 的螢幕上，導航欄應該顯示完整的橫向佈局，包含 Logo、導航連結、配額、會員資訊和登出按鈕。
            </p>
            <p>
              <strong className="text-foreground">手機版測試：</strong>
              在寬度 &lt; 768px 的螢幕上，導航欄應該顯示 Logo 和選單按鈕，點擊選單按鈕後展開完整的導航選單。
            </p>
            <p>
              <strong className="text-foreground">內容區域測試：</strong>
              頁面內容應該正確顯示在導航欄下方，並且有適當的內邊距（padding）。
            </p>
          </div>
        </div>
      </div>
    </MemberLayout>
  )
}

