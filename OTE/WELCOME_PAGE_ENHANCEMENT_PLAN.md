# 歡迎首頁優化計畫

## 計畫概覽

### 目的
優化根目錄首頁（`src/app/page.tsx`），提升使用者體驗、增加資訊完整性、改善 SEO 表現。

### 優先級
- **階段**：階段 A+.6（在階段 B 之前執行）
- **預估時間**：1-1.5 天
- **依賴**：階段 A+.5（歡迎首頁基礎功能）已完成

---

## 📋 改進項目清單

### 1. 動畫效果優化
**優先級**：🟢 High
**預估時間**：0.3 天（約 2-3 小時）

#### 1.1 頁面載入動畫
- **淡入效果**：整個頁面載入時的淡入動畫
- **實作方式**：使用 Tailwind CSS 的 `animate-fade-in` 或自定義動畫
- **技術細節**：
  ```typescript
  // 使用 Framer Motion 或 CSS 動畫
  <main className="animate-fade-in">
    {/* 內容 */}
  </main>
  ```

#### 1.2 功能卡片 Hover 動畫
- **效果**：滑鼠移到功能卡片時的放大、陰影效果
- **實作方式**：
  ```css
  .feature-card {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  }
  ```

#### 1.3 按鈕互動動畫
- **點擊回饋**：按鈕點擊時的縮放效果
- **Hover 效果**：滑鼠移到按鈕時的顏色漸變
- **實作方式**：
  ```css
  .button {
    transition: all 0.2s ease;
  }
  .button:hover {
    transform: scale(1.05);
  }
  .button:active {
    transform: scale(0.98);
  }
  ```

#### 1.4 滾動動畫
- **效果**：滾動時元素逐漸出現
- **實作方式**：使用 Intersection Observer API
- **適用元素**：功能卡片、免責聲明區塊

---

### 2. 更多資訊內容
**優先級**：🟢 High
**預估時間**：0.4 天（約 3-4 小時）

#### 2.1 擴充免責聲明
**當前狀態**：5 條基本聲明  
**改進內容**：

1. **資料來源聲明**：
   - 本系統資料由會員自行上傳，系統不保證資料的真實性
   - 使用者應自行判斷資料的可信度

2. **隱私權保護**：
   - 系統如何保護使用者隱私
   - 資料遮罩機制說明
   - 個人資料使用範圍

3. **智慧財產權**：
   - 系統內容的著作權歸屬
   - 禁止未經授權的資料爬取

4. **爭議處理**：
   - 如何處理資料爭議
   - 申訴管道和流程

5. **服務條款連結**：
   - 連結到完整的服務條款頁面
   - 連結到隱私權政策頁面

#### 2.2 常見問題 (FAQ)
**新增區塊**：在免責聲明之前加入 FAQ 區塊

**問題清單**：
1. **Q: 誰可以使用本系統？**
   - A: 金融業務從業人員，需經過管理員審核

2. **Q: 如何註冊帳號？**
   - A: 點擊「立即註冊」，填寫必要資訊，等待管理員審核

3. **Q: 審核需要多久時間？**
   - A: 通常在 1-3 個工作天內完成審核

4. **Q: 可以查詢哪些資訊？**
   - A: 可查詢債務人的借款記錄、還款狀況等資訊

5. **Q: 資料如何保護？**
   - A: 系統使用資料遮罩技術，保護敏感資訊

6. **Q: 每日可以查詢幾次？**
   - A: 一般會員每日可查詢 30 次，上傳 20 筆資料

7. **Q: 忘記密碼怎麼辦？**
   - A: 請聯絡系統管理員協助重置密碼

8. **Q: 可以在多個裝置登入嗎？**
   - A: 系統限制單一裝置登入，確保帳號安全

**實作方式**：
```tsx
<div className="mt-12 bg-dark-300 rounded-lg p-6 border border-dark-100">
  <h3 className="text-lg font-semibold text-foreground mb-4">❓ 常見問題</h3>
  <div className="space-y-4">
    {faqs.map((faq, index) => (
      <details key={index} className="group">
        <summary className="cursor-pointer text-sm font-medium text-foreground hover:text-primary">
          {faq.question}
        </summary>
        <p className="mt-2 text-xs text-foreground-muted pl-4">
          {faq.answer}
        </p>
      </details>
    ))}
  </div>
</div>
```

#### 2.3 系統特色介紹
**新增區塊**：在功能介紹之後加入系統特色

**特色清單**：
1. **🔒 安全可靠**：
   - 完善的權限控制機制
   - 資料加密傳輸
   - 定期備份保護

2. **⚡ 快速查詢**：
   - 優化的資料庫索引
   - 即時查詢結果
   - 高效能系統架構

3. **👥 會員互動**：
   - 按讚功能
   - 會員資訊卡
   - 社群互動機制

4. **📊 數據統計**：
   - 個人使用統計
   - 系統整體數據
   - 視覺化圖表

---

### 3. 聯絡資訊
**優先級**：🟢 High
**預估時間**：0.2 天（約 1-2 小時）

#### 3.1 聯絡方式區塊
**新增位置**：頁尾資訊之前

**內容**：
```tsx
<div className="mt-12 bg-dark-300 rounded-lg p-6 border border-dark-100">
  <h3 className="text-lg font-semibold text-foreground mb-4">📞 聯絡我們</h3>
  <div className="grid md:grid-cols-2 gap-4 text-sm">
    {/* 電子郵件 */}
    <div className="flex items-center gap-3">
      <div className="text-2xl">📧</div>
      <div>
        <p className="font-medium text-foreground">電子郵件</p>
        <a 
          href="mailto:support@example.com" 
          className="text-primary hover:text-primary-dark"
        >
          support@example.com
        </a>
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
    <div className="flex items-center gap-3">
      <div className="text-2xl">🕐</div>
      <div>
        <p className="font-medium text-foreground">客服時間</p>
        <p className="text-foreground-muted">週一至週五 09:00-18:00</p>
      </div>
    </div>
  </div>
</div>
```

#### 3.2 備註說明
- **LINE 官方帳號**：目前顯示「（後續提供）」，待取得正式帳號後更新
- **其他聯絡方式**：可根據實際需求新增（如 Facebook、Telegram 等）

---

## 🗓️ 實作時程規劃

### 階段 A+.6：歡迎首頁優化
**總預估時間**：0.9-1 天

| 任務 | 優先級 | 預估時間 | 依賴 |
|------|--------|---------|------|
| 1. 動畫效果優化 | 🟢 High | 0.3 天 | A+.5 |
| 2. 更多資訊內容 | 🟢 High | 0.4 天 | A+.5 |
| 3. 聯絡資訊 | 🟢 High | 0.2 天 | A+.5 |
| **測試與調整** | - | 0.1 天 | 1-3 |

### 建議執行順序
1. **上午（2-3 小時）**：動畫效果優化（淡入、Hover、按鈕動畫）
2. **下午（3-4 小時）**：更多資訊內容（FAQ、擴充免責聲明、系統特色）
3. **隔天上午（1-2 小時）**：聯絡資訊 + 測試與調整

---

## 📝 驗收標準

### 1. 動畫效果
- [ ] 頁面載入時有流暢的淡入效果
- [ ] 功能卡片 Hover 時有明顯的視覺回饋
- [ ] 按鈕點擊時有適當的動畫效果
- [ ] 滾動時元素逐漸出現（可選）
- [ ] 動畫流暢，無卡頓現象

### 2. 資訊內容
- [ ] FAQ 區塊包含至少 8 個常見問題
- [ ] 免責聲明擴充至至少 8 條
- [ ] 系統特色介紹清晰明瞭（4 個特色）
- [ ] 所有文字內容經過校對
- [ ] FAQ 使用 `<details>` 元素，可展開/收合

### 3. 聯絡資訊
- [ ] 電子郵件連結正確
- [ ] LINE 官方帳號顯示「（後續提供）」
- [ ] 客服時間資訊清楚
- [ ] 聯絡資訊區塊排版美觀
- [ ] 響應式設計正常（手機/桌面）

---

## 🎯 成功指標

### 使用者體驗
- 頁面載入時間 < 2 秒
- 動畫流暢，無卡頓
- 資訊完整，易於理解
- 互動效果明顯且專業

### 視覺效果
- 動畫效果提升專業感
- 卡片 Hover 效果吸引人
- 按鈕互動回饋清楚

### 資訊完整性
- FAQ 解答常見問題
- 免責聲明完整清楚
- 聯絡管道明確可用

---

## 📚 相關文件

- **基礎實作**：TEST_REPORT_WELCOME_PAGE.md
- **專案規劃**：OTE/tasks.md
- **設計文檔**：OTE/design.md
- **需求文檔**：OTE/requirements.md

---

## 🔄 後續維護

### 定期更新
- **FAQ 內容**：根據使用者反饋定期更新
- **聯絡資訊**：確保聯絡方式保持最新
- **免責聲明**：根據法規變更及時更新

### 效能監控
- 定期檢查頁面載入速度
- 監控 SEO 表現
- 收集使用者回饋

---

**計畫建立日期**：2025-10-14  
**計畫撰寫者**：Augment Agent  
**預計執行時間**：階段 B 之前（1-1.5 天）

