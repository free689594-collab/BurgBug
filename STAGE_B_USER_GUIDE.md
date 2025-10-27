# 階段 B：統計數據系統 - 使用指南

## 快速開始

### 1. 執行 SQL 設定（重要！）

在開始使用前，請先在 Supabase Dashboard 執行 SQL：

1. 登入 Supabase Dashboard
2. 選擇專案：GoGoMay
3. 點擊「SQL Editor」
4. 複製 `STAGE_B_SQL_SETUP.md` 中的 SQL 並執行

**不執行的影響**：會員 Dashboard 的排名功能會顯示 null

---

### 2. 啟動開發伺服器

```bash
npm run dev
```

---

## 功能說明

### 會員功能

#### 1. 會員 Dashboard (`/dashboard`)

**系統統計區塊**：
- 總債務人數（去重後的債務人數量）
- 總債務筆數
- 本週新增債務筆數
- 本月新增債務筆數

**個人統計區塊**：
- 上傳次數（含排名資訊）
- 查詢次數（含排名資訊）
- 收到的讚
- 給出的讚

**查詢配額區塊**：
- 今日已使用次數
- 今日剩餘次數
- 使用百分比（視覺化進度條）
- 顏色警示：
  - 綠色：使用率 < 50%
  - 黃色：使用率 50-80%
  - 紅色：使用率 > 80%

**個人貢獻度區塊**：
- 我的上傳數
- 系統總數
- 貢獻佔比（百分比）

---

### 管理員功能

#### 1. 管理員 Dashboard (`/admin/dashboard`)

**統計卡片**（第一排）：
- 總會員數（含今日新增）
- 待審核會員（可點擊前往審核）
- 總債務記錄（含今日新增）
- 24小時活動（可點擊查看詳情）

**擴充統計卡片**（第二排）：
- 總債務人數（去重）
- 本週新增會員
- 本週新增債務
- 本月新增債務

**趨勢圖表**：
- 債務上傳趨勢（最近 30 天折線圖）
- 債務查詢趨勢（最近 30 天折線圖）

**地區分佈圓餅圖**：
- 顯示各地區的債務記錄分佈
- 自動計算百分比
- 互動式 Tooltip

**會員狀態分佈**：
- 已審核會員數
- 待審核會員數
- 已停權會員數

**最近活動**：
- 最近 10 筆審計日誌
- 顯示操作類型和時間

---

#### 2. 管理員報表頁面 (`/admin/reports`)

**查詢條件**：
- 開始日期（可選）
- 結束日期（可選）
- 地區篩選（可選）
- 還款狀況篩選（可選）
- 分組方式（按地區/按還款狀況/按日期）

**操作按鈕**：
- 查詢報表：顯示統計結果
- 匯出 CSV：下載 CSV 檔案

**報表摘要**：
- 總記錄數
- 總債務金額
- 債務人數（去重）
- 日期範圍

**分組數據圓餅圖**：
- 根據分組方式顯示分佈
- 自動計算百分比

**詳細數據表格**：
- 顯示每個分組的記錄數和總金額
- 可排序

---

## API 使用說明

### 1. 會員統計 API

```bash
GET /api/stats/member
Authorization: Bearer <token>
```

**回傳資料**：
- 個人統計（上傳、查詢、讚數）
- 查詢配額（今日剩餘次數）
- 個人排名（上傳排名、查詢排名）
- 個人貢獻度（佔總數的百分比）

---

### 2. 系統統計 API

```bash
GET /api/stats/system
Authorization: Bearer <token>
```

**回傳資料**：
- 總債務人數（去重）
- 總債務筆數
- 今日/本週/本月新增
- 地區分佈
- 還款狀況分佈

---

### 3. 趨勢統計 API

```bash
GET /api/stats/trends?days=30&type=all
Authorization: Bearer <token>
```

**參數**：
- `days`：天數（7, 30, 90，預設 7）
- `type`：類型（uploads, queries, all，預設 all）

**回傳資料**：
- 每日上傳量
- 每日查詢量
- 總計和平均值

---

### 4. 管理員統計 API

```bash
GET /api/admin/stats
Authorization: Bearer <token>
```

**回傳資料**：
- 會員統計（總數、各狀態、今日/本週/本月新增）
- 債務統計（總數、今日/本週/本月新增、去重債務人數）
- 系統活動（24小時活動數）
- 地區分佈

---

### 5. 報表查詢 API

```bash
GET /api/reports/query?start_date=2024-01-01&end_date=2024-12-31&group_by=region
Authorization: Bearer <token>
```

**參數**：
- `start_date`：開始日期（可選）
- `end_date`：結束日期（可選）
- `group_by`：分組方式（region, status, date，可選）
- `region`：地區篩選（可選）
- `status`：還款狀況篩選（可選）

**回傳資料**：
- 報表摘要
- 分組數據

---

### 6. 報表匯出 API

```bash
GET /api/reports/export?format=csv&start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer <token>
```

**參數**：
- `format`：匯出格式（csv，預設 csv）
- `start_date`：開始日期（可選）
- `end_date`：結束日期（可選）
- `region`：地區篩選（可選）
- `status`：還款狀況篩選（可選）

**回傳**：CSV 檔案下載

---

## 元件使用說明

### 1. StatCard 元件

```tsx
import StatCard from '@/components/stats/StatCard'

<StatCard
  title="總會員數"
  value={100}
  icon="👥"
  trend={{
    value: 5,
    label: '今日新增',
    isPositive: true,
  }}
  subtitle="點擊查看詳情"
  onClick={() => router.push('/admin/members')}
/>
```

---

### 2. TrendChart 元件

```tsx
import TrendChart from '@/components/stats/TrendChart'

<TrendChart
  title="債務上傳趨勢"
  data={[
    { date: '2024-01-01', count: 10 },
    { date: '2024-01-02', count: 15 },
  ]}
  lines={[
    { dataKey: 'count', name: '上傳數量', color: '#3B82F6' },
  ]}
  height={300}
/>
```

---

### 3. PieChart 元件

```tsx
import PieChart from '@/components/stats/PieChart'

<PieChart
  title="地區分佈"
  data={[
    { name: '北北基宜', value: 100 },
    { name: '桃竹苗', value: 80 },
  ]}
  height={350}
/>
```

---

## 常見問題

### Q1: 排名顯示 null？
**A**: 請確認已在 Supabase Dashboard 執行 SQL 函數（參考 `STAGE_B_SQL_SETUP.md`）

### Q2: 圖表不顯示？
**A**: 請確認：
1. recharts 已安裝（`npm install recharts`）
2. 資料格式正確
3. 瀏覽器 Console 沒有錯誤

### Q3: CSV 匯出中文亂碼？
**A**: 已加入 BOM，使用 Excel 開啟應該正常顯示。如果還是亂碼，請使用 Google Sheets 或 LibreOffice 開啟。

### Q4: 統計數據不準確？
**A**: 統計數據是即時計算的，如果發現不準確，請檢查：
1. 資料庫資料是否正確
2. API 回傳的資料是否正確
3. 前端顯示邏輯是否正確

---

## 效能建議

### 1. 快取策略
目前沒有實作快取，如果統計數據查詢較慢，可以考慮：
- 使用 Next.js 的 `revalidate` 選項
- 使用 Redis 快取統計結果
- 建立資料庫 Materialized View

### 2. 查詢優化
- 已使用並行查詢（Promise.all）
- 已避免 N+1 查詢
- 可以考慮建立更多索引

---

## 下一步

1. ✅ 執行 SQL 函數設定
2. ✅ 測試所有功能
3. ⏭️ 進行效能優化（如需要）
4. ⏭️ 開始階段 C（其他功能）

---

**文件版本**：1.0  
**最後更新**：2025-01-14  
**撰寫者**：Augment Agent

