# 債務查詢系統重新規劃任務清單

## 🚨 **重要說明**
此任務清單已重新規劃，解決了原有的架構問題和開發流程問題。
新的開發流程將確保：
1. 統一的認證和權限系統
2. 正確的資料表依賴關係
3. 漸進式功能開發
4. 充分的測試驗證

---

## 變更補充任務（已確認，2025-10）

### A. 帳號登入改造
- [x] A1 建立 members.account 欄位與唯一性（大小寫不敏感）
  - 方案：`CREATE UNIQUE INDEX uq_members_account_lower ON members ((lower(account)));`
  - _完成日期: 2025-10-14_
- [x] A2 註冊/登入改為帳號 + 密碼；後端以 `${account}@auth.local` 映射與 Supabase Auth 互動
  - _完成日期: 2025-10-14_
  - _實作於: /api/auth/register, /api/auth/login, src/lib/auth/utils.ts_
- [x] A3 關閉 Supabase 新用戶信箱驗證；註冊節流與人機驗證
  - _完成日期: 2025-10-14_
  - _實作: 註冊 API 包含 IP 節流（每小時 3 次）和 reCAPTCHA 驗證_
- [x] A4 註冊錯誤訊息：帳號已存在 → 明確提示
  - _完成日期: 2025-10-14_
  - _實作: 註冊 API 回傳詳細錯誤訊息，包含密碼強度驗證錯誤_

### B. 查詢條件調整（身分證首字母 + 後5碼）
- [ ] B1 DB：於 debt_records 新增 `debtor_id_first_letter` 產生欄位與複合索引 `(debtor_id_last5, debtor_id_first_letter)`
- [ ] B2 API：/api/search/debt 調整為 `idFirstLetter` + `idLast5` 參數；加入參數驗證
- [ ] B3 前端：查詢表單改為「首字母 + 後5碼」，更新提示文案

### C. 債務資料欄位與表單
- [ ] C1 DB：新增 `debt_date DATE`、`face_value DECIMAL(15,2)`、`payment_frequency TEXT CHECK (payment_frequency IN ('daily','weekly','monthly'))`
- [ ] C2 DB：為 `debt_date` 建索引以利範圍查詢
- [ ] C3 前端：上傳表單改版（基本資料區/債務資料區），結果顯示新增 `payment_frequency`

### D. 展示數據（灌水）配置
- [ ] D1 DB：在 `system_config` 新增 key `display_overrides`（JSON，含 6 小區鍵）
- [ ] D2 後端：統計 API 回傳「實際」與「展示」（實際 + 增量）；管理員端可更新該 JSON
- [ ] D3 前端（管理員）：提供每小區增量調整 UI，變更即時生效

### E. 審計日誌保留與排程
- [ ] E1 `system_config.audit_retention_days` 預設 30
- [ ] E2 建立每日清理排程，清除超過保留天數之審計/查詢日誌

### F. 會員儀表板統計
- [ ] F1 API：我的債務總額 `/api/my-debtors/summary` 或合併至列表 API 回傳 `totalFaceValue`

### G. 歡迎首頁優化（階段 A+.6）
- [x] A+.5 優化根目錄首頁自動重定向
  - ✅ 未登入使用者顯示歡迎首頁
  - ✅ 已登入使用者智能重定向（根據角色和狀態）
  - ✅ 包含網站介紹、功能說明、免責聲明、行動按鈕
  - _完成日期: 2025-10-14_
  - _測試報告: TEST_REPORT_WELCOME_PAGE.md_

- [x] A+.6 歡迎首頁進階優化
  - ✅ G1 動畫效果優化（頁面淡入、卡片 Hover、按鈕互動）
  - ✅ G2 更多資訊內容（擴充免責聲明 9 條、FAQ 常見問題 8 個）
  - ✅ G3 聯絡資訊（電子郵件、LINE 官方帳號（後續提供）、客服時間）
  - _完成日期: 2025-10-14_
  - _實際時間: ~0.7 天_
  - _測試報告: TEST_REPORT_A+.6_COMPLETE.md_



## 第一階段：核心基礎架構

### 1. 專案初始化與環境設定
- [x] 1.1 建立全新 Next.js 專案
  - ✅ 初始化 Next.js 15.5.4 專案結構
  - ✅ 配置 TypeScript 和 ESLint
  - ✅ 設定 Tailwind CSS 黑色調主題
  - ✅ 建立基礎 UI 組件庫
  - _完成日期: 2025-10-14_
  - _需求: 1.1_

- [x] 1.2 設定 Supabase 環境
  - ✅ 建立新的 Supabase 專案（GoGoMay）
  - ✅ 配置環境變數和連接設定
  - ✅ 建立基礎的 Supabase 客戶端（src/lib/supabase/server.ts, client.ts）
  - ✅ 測試資料庫連接
  - _完成日期: 2025-10-14_
  - _需求: 1.1_

- [x] 1.3 建立統一的錯誤處理系統
  - ✅ 設計統一的 API 響應格式（src/lib/api/response.ts）
  - ✅ 建立錯誤處理中間件（src/middleware.ts）
  - ✅ 實作前端錯誤邊界組件
  - ✅ 建立日誌記錄機制（console.log + 審計日誌）
  - _完成日期: 2025-10-14_
  - _需求: 7.1_

### 2. 核心資料庫架構設計
- [x] 2.1 設計並創建核心資料表
  - ✅ 建立 user_role ENUM 與 user_roles 表（取代 admin_users；先建 ENUM 再建表；建立初始種子資料）
  - ✅ 創建會員資料表 (members)（含審核狀態欄位），並新增 A1：account 欄位與唯一性（大小寫不敏感，functional index：lower(account)）
  - ✅ 創建債務記錄表 (debt_records)（含遮罩欄位）
  - ✅ 創建會員統計表 (member_statistics)（含活躍度數據與觸發器基礎）
  - ✅ 創建系統配置表 (system_config)（含功能開關）
  - ✅ 新增使用配額表 (usage_counters)（每日 uploads/queries/likes，Asia/Taipei 口徑）
  - ✅ 新增單裝置控制表 (active_sessions)（登入時 UPSERT 覆寫舊會話）
  - ✅ 新增審計日誌表 (audit_logs)（配合後續 retention 清理排程）
  - ⚠️ 部分欄位待補充：C1（debt_date, face_value, payment_frequency）、D1（display_overrides）、E1（audit_retention_days）
  - _完成日期: 2025-10-14_
  - _需求: 2.1, 4.1_

- [/] 2.2 建立資料表索引/產生欄位與約束
  - ⚠️ B1 產生欄位：debt_records.debtor_id_first_letter（待實作）
  - ⚠️ C2 索引：debt_records.debt_date（待實作）
  - ✅ 設定外鍵關係和級聯刪除規則（依 2.1 建表）
  - ✅ 建立唯一性與檢查約束（members.lower(account) 唯一）
  - ⚠️ 創建統計數據更新觸發器（update_member_statistics）（待實作）
  - _部分完成日期: 2025-10-14_
  - _需求: 2.1, 7.1_

- [x] 2.3 設定 RLS 安全政策和資料遮罩
  - ✅ 啟用 RLS：members、debt_records、usage_counters、active_sessions、audit_logs
  - ✅ 管理員策略：基於 user_roles（role='super_admin'）對 members/debt_records/usage/active_sessions/audit_logs 賦予 FOR ALL 權限
  - ✅ 債務記錄策略：已審核會員可 SELECT/INSERT；上傳者可 FOR UPDATE（還款狀態）；FOR DELETE 僅管理員
  - ⚠️ 建立資料遮罩函數（姓名、電話等）與安全查詢視圖（待實作）
  - _完成日期: 2025-10-14_
  - _需求: 5.1, 5.2, 5.3_

### 第一階段驗收清單（資料庫遷移）
- 遷移順序已依序執行：ENUM → 表 → 索引/產生欄位 → ENABLE RLS → policies
- user_roles 初始種子資料已建立；members.account 的 lower(account) 唯一索引生效
- debt_records 新欄位（C1）與對應索引（C2）建立完成
- B1 複合索引（debtor_id_last5, debtor_id_first_letter）建立完成；產線以 CONCURRENTLY 並非交易遷移
- 以測試帳號驗證 RLS：一般會員/管理員在 members、debt_records、usage/active_sessions/audit_logs 的讀寫邊界正確


## 第二階段：統一認證與權限系統

### 3. 統一認證與權限系統
- [x] 3.1 實作核心認證 API（整合 A2/A3/A4）
  - ✅ A2 登入改為「帳號 + 密碼」：後端以 `${account}@auth.local` 與 Supabase Auth 互動；登入時以 lower(account) 正規化
  - ✅ 註冊 API (/api/auth/register)：建立 members 與 user_roles；若帳號已存在回傳清楚錯誤（A4）
  - ✅ 登入 API (/api/auth/login)：檢查會員狀態（pending/approved/suspended），回傳基本權限資訊
  - ✅ 登出 API (/api/auth/logout)：清理會話（搭配 3.3 單裝置控制）
  - ⚠️ 認證狀態 API (/api/auth/me)：待實作
  - ✅ A3 註冊節流與人機驗證：對 /register 加入速率限制（每 IP 每小時 3 次）與 reCAPTCHA 驗證
  - _完成日期: 2025-10-14_
  - _實作檔案: /api/auth/register, /api/auth/login, /api/auth/logout_
  - _需求: 1.1, 1.2, A2, A3, A4_

- [x] 3.2 建立權限檢查中間件
  - ✅ 統一認證檢查：從 Cookie 和 Authorization Bearer 取得 user
  - ✅ 會員狀態驗證：pending/approved/suspended（未通過則禁止存取非管理路徑）
  - ✅ 管理員權限檢查：基於 user_roles（role='super_admin' 或 'admin'）
  - ✅ API 路由保護機制：以前綴白名單（/admin, /api/admin）判定管理路徑
  - ✅ 修復 RLS 問題：使用 service role key 查詢 members 和 user_roles
  - _完成日期: 2025-10-14_
  - _實作檔案: src/middleware.ts_
  - _需求: 4.1, 4.2, 5.1_

- [x] 3.3 實作密碼安全和會話管理（單裝置控制）
  - ✅ 建立密碼強度驗證規則（validatePasswordStrength）
  - ✅ Supabase Auth 處理密碼雜湊/驗證
  - ✅ JWT 令牌由 Supabase Auth 管理（access_token, refresh_token）
  - ✅ 單裝置控制：登入成功後 UPSERT active_sessions（以 user_id 為 PK 覆寫舊會話），登出時清理
  - ⚠️ 開發模式暫時停用單裝置控制（避免測試困難）
  - _完成日期: 2025-10-14_
  - _實作檔案: src/lib/auth/utils.ts, /api/auth/login_
  - _需求: 5.1, 5.2_

### 第二階段驗收清單（認證與權限）
- 註冊：重複帳號回傳明確錯誤（A4）；設有人機驗證與節流（A3）
- 登入：使用「帳號 + 密碼」，`${account}@auth.local` 映射；lower(account) 正規化
- 單裝置：登入後 UPSERT active_sessions；舊會話被正確踢除；登出釋放
- 權限：中間件可正確判斷會員狀態與管理員；/admin 與 /api/admin 路由受保護


### 4. 管理員系統基礎
- [x] 4.1 建立管理員帳號管理
  - 創建初始超級管理員帳號
  - 實作管理員帳號創建 API (/api/admin/users/create)
  - 建立管理員權限驗證邏輯（requireAdmin, requireSuperAdmin）
  - 實作管理員操作日誌記錄 (/api/admin/audit-logs)
  - 實作分層管理員權限（super_admin > admin > user）
  - _完成日期: 2025-10-14_
  - _測試報告: TEST_REPORT_4.1.md, TEST_REPORT_4.1_PERMISSION_UPDATE.md_
  - _需求: 4.1, 4.2_

- [x] 4.2 實作管理員後台核心功能
  - ✅ 建立管理員儀表板頁面 (/admin/dashboard)
  - ✅ 實作系統統計 API (/api/admin/stats)
  - ✅ 建立審計日誌 API (/api/admin/audit-logs)
  - ✅ 建立會員管理 API (/api/admin/members, /api/admin/members/[id])
  - ✅ 建立管理後台導航元件 (AdminNav)
  - ✅ 顯示即時統計資料（會員數、待審核數、債務記錄數、24小時活動數）
  - ✅ 顯示會員狀態分佈和快速操作區塊
  - ✅ 顯示最近活動列表（審計日誌）
  - ✅ 黑色調主題樣式與響應式設計
  - ✅ 修復 middleware 的 RLS 問題（使用 service role key）
  - ✅ 修復登入後導向問題（role 查詢失敗導致重導向）
  - ✅ 加強除錯日誌和開發模式容錯機制
  - ✅ 建立會員管理頁面 (/admin/members) - 列表、篩選、搜尋、分頁、審核功能
  - ✅ 建立審計日誌頁面 (/admin/audit-logs) - 列表、篩選、展開詳細資訊、分頁
  - _完成日期: 2025-10-14_
  - _測試報告: TEST_REPORT_4.2_FINAL.md, STEP2_UI_COMPLETION_REPORT.md_
  - _需求: 4.1, 13.1, 13.2_

## 第三階段：用戶界面與基礎功能

### 5. 用戶認證界面
- [x] 5.1 建立登入註冊界面
  - ✅ 設計統一的黑色調認證界面
  - ✅ 實作登入表單和驗證（/login）
  - ✅ 實作註冊表單和業務資料收集（/register）
  - ✅ 建立表單驗證和錯誤處理（即時密碼強度驗證、帳號格式驗證）
  - ✅ 加上註冊連結和登入連結
  - _完成日期: 2025-10-14_
  - _實作檔案: /app/login/page.tsx, /app/register/page.tsx_
  - _測試報告: STEP1_REGISTER_COMPLETION_REPORT.md_
  - _需求: 1.1, 1.2_

- [x] 5.2 建立會員狀態管理
  - ✅ 實作會員審核狀態顯示
  - ✅ 建立等待審核頁面（/waiting-approval）
  - ✅ 加上註冊成功提示（registered=true 查詢參數）
  - ⚠️ 實作帳號暫停和申訴界面（待實作）
  - ⚠️ 建立會員資料完善流程（待實作）
  - _部分完成日期: 2025-10-14_
  - _實作檔案: /app/waiting-approval/page.tsx_
  - _需求: 1.2, 1.3_

### 6. 會員管理界面
- [x] 6.1 建立管理員會員管理界面
  - ✅ 設計會員列表頁面 (/admin/members)
  - ✅ 實作會員篩選和搜尋功能 (狀態、角色、帳號搜尋)
  - ✅ 建立會員審核操作界面 (核准/停用/啟用)
  - ✅ 響應式設計（桌面版表格、手機版卡片）
  - ✅ 分頁功能（每頁 20 筆）
  - ⚠️ 實作批量操作功能 (批量審核、批量暫停)（待實作）
  - _完成日期: 2025-10-14_
  - _實作檔案: /app/admin/members/page.tsx, /api/admin/members/[id]/route.ts_
  - _測試報告: STEP2_UI_COMPLETION_REPORT.md_
  - _需求: 4.1, 4.2, 13.2_

- [ ] 6.2 完善會員管理功能
  - ⚠️ 建立會員詳細資料檢視頁面（待實作）
  - ⚠️ 實作會員活動歷史查看（待實作）
  - ⚠️ 建立會員資料編輯功能（待實作）
  - ⚠️ 實作會員狀態變更記錄（待實作，已有審計日誌）
  - _需求: 4.1, 4.2, 13.2, 13.3_

## 第四階段：債務管理核心功能

### 7. 債務資料核心功能
- [ ] 7.1 實作債務資料 API
  - 建立債務資料新增 API (/api/debt-records) 包含雙重確認
  - 實作債務資料查詢 API (/api/search/debt) 包含遮罩處理；整合 B2：參數改為 idFirstLetter + idLast5，加入參數驗證（A-Z 首字母 + 5 位數）
  - 建立我的債務人列表 API (/api/my-debtors) 包含統計
  - 實作債務狀態更新 API (/api/debt-records/[id]) 包含歷史記錄
  - 依賴：需先完成 B1（debtor_id_first_letter 複合索引）與 2.3（RLS）
  - _需求: 2.1, 2.2, 3.1_

- [ ] 7.2 建立債務查詢界面
  - 設計債務查詢頁面 (/search-debt) 輸入「身分證首字母 + 後5碼」
  - 實作查詢結果顯示 包含遮罩和會員資訊卡
  - 建立查詢歷史記錄功能
  - 實作查詢統計和使用限制顯示
  - 依賴：需先完成 7.1（查詢 API）
  - _需求: 3.1, 3.2, 3.3_

- [ ] 7.3 建立債務人管理界面
  - 設計債務人上傳頁面 (/upload-debt) 包含表單驗證，並整合 C3：顯示新欄位 debt_date/face_value/payment_frequency
  - 建立我的債務人列表頁面 (/my-debtors) 包含篩選排序
  - 實作債務狀態快速更新功能
  - 建立債務資料匯出和統計功能
  - 依賴：需先完成 C1/C2（資料庫欄位與索引）、7.1（API）
  - _需求: 2.1, 2.3, 9.2_

### 第四階段驗收清單（債務功能）
- 查詢：前端需輸入「身分證首字母 + 後5碼」；API 驗證（A-Z + 5 位數）正確；RLS 不洩漏非授權資料
- 遮罩：查詢結果姓名/電話等以安全視圖或函數遮罩
- 上傳：表單含 C3 新欄位；寫入成功且受 RLS 限制；上傳者可更新還款狀態
- 列表/統計：我的債務人列表與統計正確；複合索引命中，查詢效能穩定


### 8. 會員儀表板與統計
- [ ] 8.1 實作統計數據 API
  - 建立個人統計 API (/api/member/dashboard-stats) 包含上傳查詢統計與總額 totalFaceValue（整合 F1）
  - 實作區域統計 API (/api/region/stats) 包含雙軌制數據（實際 vs 展示，整合 D2；以 system_config.display_overrides 增量）
  - 建立使用限制檢查 API (/api/member/usage-limits) 包含每日額度
  - 實作統計數據即時更新觸發器
  - 依賴：需先完成 D1（display_overrides）與 7.1（債務 API）
  - _需求: 12.1, 12.2_

- [ ] 8.2 建立會員儀表板界面
  - 設計會員儀表板頁面 (/dashboard) 包含統計卡片
  - 實作個人統計顯示（今日/總計上傳查詢數、總額 totalFaceValue、雙軌數據）
  - 建立區域統計圖表（各區域實際/展示數據）
  - 實作使用限制進度條和剩餘額度顯示
  - 依賴：需先完成 8.1（統計 API）
  - _需求: 12.1, 12.2_

## 第五階段：進階功能與系統優化

### 9. 活躍度與互動系統 (可選)
- [ ]* 9.1 建立活躍度系統資料表和API
  - 創建活躍度配置表 (activity_system_config)
  - 創建會員按讚記錄表 (member_likes) 包含冷卻機制
  - 實作按讚功能 API (/api/member/like/[memberId]) 包含頻率限制
  - 建立活躍度計算和等級更新函數
  - _需求: 12.3, 12.4, 14.1_

- [ ]* 9.2 實作會員互動界面
  - 設計會員資訊卡組件 包含等級稱號和勳章顯示
  - 實作按讚功能界面 包含冷卻時間顯示
  - 整合會員資訊卡到查詢結果頁面
  - 建立活躍度等級視覺效果和動畫
  - _需求: 14.1, 14.2, 14.3_

- [ ]* 9.3 建立訊息系統 (可選)
  - 創建會員信箱表 (member_mailbox) 和對話串表
  - 實作訊息發送 API (/api/messages/send) 包含頻率限制
  - 建立訊息列表 API (/api/messages/inbox) 包含分類篩選
  - 設計會員信箱界面 包含對話功能
  - _需求: 10.1, 10.2, 10.3_

### 10. 資料修改與申訴系統
- [ ] 10.1 建立修改申請系統
  - 創建個人資料修改申請表 (profile_modification_requests)
  - 創建債務資料修改申請表 (debt_modification_requests)
  - 實作修改申請提交 API (/api/modification-requests)
  - 建立管理員審核修改申請 API 和界面
  - _需求: 8.1, 8.2, 9.3, 9.4_

- [ ] 10.2 建立申訴處理系統
  - 實作多設備登入檢測邏輯
  - 建立違規記錄和等級管理系統
  - 實作自動暫停和申訴機制
  - 建立申訴提交和處理界面
  - _需求: 11.1, 11.2, 11.3, 11.4_

## 第六階段：系統優化與部署

### 11. 系統性能優化
- [ ] 11.1 資料庫查詢優化
  - 建立查詢優化索引 (身分證（首字母 + 後5碼）、上傳者、日期組合索引)
  - 實作統計數據快取機制
  - 優化複雜查詢的執行計畫
  - 建立資料庫性能監控指標
  - _需求: 7.1_

- [ ] 11.2 前端性能優化
  - 實作債務人列表虛擬化渲染 (處理大量數據)
  - 建立組件懶加載和代碼分割
  - 實作圖片和資源預載入策略
  - 建立前端性能監控和錯誤追蹤
  - _需求: 7.1_

### 12. 系統監控與維護
- [ ] 12.1 建立系統健康監控
  - 實作 API 健康檢查端點 (/api/health) 包含資料庫連接測試；對齊設計修正版：select('*', { count: 'exact', head: true })
  - 建立系統性能監控指標 (響應時間、記憶體使用、錯誤率)
  - 實作日誌輪轉和清理機制
  - 建立異常告警和通知系統
  - _需求: 16.2, 16.4_

- [ ] 12.2 建立資料備份機制
  - 設計自動備份排程系統 (每日備份重要資料表)
  - 建立備份檔案管理和版本控制
  - 實作資料恢復測試流程
  - 建立備份狀態監控和告警機制
  - _需求: 16.1_
- [ ] 12.3 建立審計清理排程
  - E2 每日清理超過 system_config.audit_retention_days 的 audit_logs（與查詢日誌，如有）
  - 依賴：需先完成 E1（audit_retention_days）與 2.1（audit_logs）

### 第六階段驗收清單（性能與監控）
- 健康檢查端點可穩定回傳（head: true + count）且響應時間合理
- 審計清理排程按天執行並記錄清理量；不影響線上效能
- 重要查詢（包含 B1/C2 相關）已驗證索引命中；無長尾慢查詢


## 第七階段：部署與上線

### 13. 生產環境部署準備
- [ ] 13.1 配置生產環境
  - 設定 Vercel 部署配置文件 (vercel.json)
  - 配置 Supabase 生產環境和環境變數
  - 建立安全設定 (CORS、CSP、API 限制)
  - 設定 SSL 憑證和自訂域名
  - _需求: 7.1_

- [ ] 13.2 建立部署和維護流程
  - 建立資料庫遷移腳本和版本管理
  - 設定自動化部署管道 (GitHub Actions)
  - 實作部署前自動測試和檢查
  - 建立回滾機制和災難恢復計畫
  - _需求: 7.1_

### 14. 系統上線與維護
- [ ] 14.1 執行正式部署
  - 執行生產環境首次部署
  - 建立即時監控儀表板和告警系統
  - 實作用戶反饋收集機制
  - 建立系統維護和更新標準流程
  - _需求: 7.1_

- [ ]* 14.2 建立測試套件 (可選)
  - 撰寫核心功能單元測試 (認證、查詢、上傳 API)
  - 建立資料庫互動整合測試
  - 實作關鍵用戶流程端對端測試
  - 設定測試自動化和持續整合流程
  - _需求: 7.1_

---

## 🎯 **新任務清單的改進重點**

### ✅ **解決的問題**
1. **統一認證架構**：先建立完整的認證和權限系統
2. **正確的依賴順序**：資料表 → 認證 → 功能 → 界面
3. **漸進式開發**：每個階段都有完整的測試驗證
4. **清晰的責任分離**：用戶功能和管理員功能分開開發

### 📋 **開發原則**
1. **階段式開發**：必須完成一個階段才能進入下一階段
2. **測試優先**：每個功能完成後立即測試
3. **統一設計**：所有界面使用統一的黑色調設計系統
4. **安全第一**：所有 API 都有完整的權限檢查
5. **文檔完整**：每個功能都有清楚的實作說明

### ⏱️ **預估時程**
- **第一階段**: 1 週 (基礎架構)
- **第二階段**: 1-2 週 (認證系統)
- **第三階段**: 1-2 週 (用戶界面)
- **第四階段**: 2-3 週 (債務管理)
- **第五階段**: 1-2 週 (進階功能，可選)
- **第六階段**: 1 週 (系統優化)
- **第七階段**: 1 週 (部署上線)

**總預估**: 8-12 週 (約 2-3 個月)

### 🚀 **立即行動建議**
1. **刪除現有專案**：完全清除當前的 debt-check-system 目錄
2. **按新任務清單重新開始**：從第一階段第一個任務開始
3. **嚴格按順序執行**：不跳過任何階段，確保每個階段完成後再進行下一階段
4. **充分測試**：每個功能完成後都要進行完整測試

這個新的任務清單解決了原有的架構問題，將確保開發過程順利且最終產品穩定可靠。