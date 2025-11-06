# 債務查詢功能升級總結

## 📅 更新資訊

- **更新日期**：2025-01-17
- **Git Commit**：1800385
- **功能名稱**：債務查詢 - 備註摘要和行為統計
- **部署狀態**：✅ 已推送到 GitHub，等待 Vercel 自動部署

---

## ✨ 新增功能

### 1. 💬 備註紀錄摘要

**功能說明**：
- 在查詢結果中顯示該債務人的最新備註更新（最多 5 筆）
- 備註來源：從「我的債務人管理」頁面新增的備註時間軸
- 顯示位置：在原本的「備註」欄位下方

**顯示內容**：
- 備註內容（最多顯示 2 行，超過會截斷）
- 備註時間（格式：YYYY/MM/DD HH:MM）
- 提示訊息：「此債務人最近有更新紀錄，請參考上方備註時間軸」

**範例顯示**：
```
💬 備註紀錄摘要（最新 3 筆更新）

2025/01/17 14:30
債務人同意分期還款，每週 5,000 元

2025/01/15 10:20
首次聯繫債務人，表示願意還款

2025/01/10 16:45
收到第一筆還款 10,000 元

ℹ️ 此債務人最近有更新紀錄，請參考上方備註時間軸
```

---

### 2. 📊 簡易行為統計

**功能說明**：
- 當多個會員都上傳同一債務人時，顯示該債務人的整體風險指標
- 統計範圍：所有上傳該債務人的記錄（根據身分證首字母 + 後5碼）
- 顯示位置：查詢結果標題下方

**統計指標**：

#### 已登錄債務會員數
- **說明**：有多少位不同的會員上傳過這個債務人
- **顯示格式**：「已登錄債務會員數：X 筆」
- **顏色**：藍色（`text-blue-400`）

#### 曾標記「疲勞」的比例
- **說明**：所有記錄中，標記為「疲勞」狀態的比例
- **顯示格式**：「曾標記『疲勞』的比例：X%」
- **顏色規則**：
  - ≥ 50%：紅色（`text-red-400`）- 高風險
  - 30% ~ 49%：黃色（`text-yellow-400`）- 中風險
  - < 30%：綠色（`text-green-400`）- 低風險

#### 最近更新時間
- **說明**：所有記錄中最近一次更新的時間
- **顯示格式**：「最近更新時間：YYYY/MM/DD」
- **顏色**：白色（`text-foreground`）

**範例顯示**：
```
┌─────────────────────────────────────────────────────────────┐
│ 已登錄債務會員數：3 筆                                        │
│ 曾標記「疲勞」的比例：67%                                     │
│ 最近更新時間：2025/01/17                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 技術實作

### 1. API 端點修改

**檔案**：`src/app/api/debts/search/route.ts`

#### 新增查詢：備註摘要
```typescript
// 查詢備註摘要（最新 5 筆）
const { data: recentNotes } = await supabaseAdmin
  .from('debt_record_notes')
  .select('debt_record_id, content, created_at')
  .in('debt_record_id', debtRecordIds)
  .order('created_at', { ascending: false })
  .limit(debtRecordIds.length * 5)

// 將備註按 debt_record_id 分組，每組最多 5 筆
const notesMap = recentNotes?.reduce((acc, note) => {
  if (!acc[note.debt_record_id]) {
    acc[note.debt_record_id] = []
  }
  if (acc[note.debt_record_id].length < 5) {
    acc[note.debt_record_id].push({
      content: note.content,
      created_at: note.created_at
    })
  }
  return acc
}, {} as Record<string, Array<{ content: string; created_at: string }>>) || {}
```

#### 新增查詢：行為統計
```typescript
// 查詢同一債務人的所有記錄
const { data: allDebtorRecords } = await supabaseAdmin
  .from('debt_records')
  .select('id, repayment_status, updated_at, uploaded_by')
  .eq('debtor_id_first_letter', firstLetter)
  .eq('debtor_id_last5', last5)

// 計算統計資料
const totalRecords = allDebtorRecords?.length || 0
const uniqueUploaders = new Set(allDebtorRecords?.map(r => r.uploaded_by) || []).size
const fatigueCount = allDebtorRecords?.filter(r => r.repayment_status === 'fatigued').length || 0
const fatiguePercentage = totalRecords > 0 ? Math.round((fatigueCount / totalRecords) * 100) : 0
const latestUpdate = allDebtorRecords?.reduce((latest, record) => {
  const recordDate = new Date(record.updated_at)
  return recordDate > latest ? recordDate : latest
}, new Date(0))

const debtorStats = {
  total_records: totalRecords,
  unique_uploaders: uniqueUploaders,
  fatigue_percentage: fatiguePercentage,
  latest_update: latestUpdate?.toISOString() || null
}
```

#### 返回結果修改
```typescript
return NextResponse.json(
  successResponse(
    {
      results: resultsWithUploaders || [],
      total_count: resultsWithUploaders?.length || 0,
      debtor_stats: debtorStats, // 新增：債務人行為統計
      // ... 其他欄位
    },
    '查詢成功'
  ),
  { status: 200 }
)
```

---

### 2. TypeScript 類型定義

**檔案**：`src/types/debt.ts`

```typescript
/**
 * 備註摘要
 */
export interface DebtNotesSummary {
  content: string
  created_at: string
}

/**
 * 債務人行為統計
 */
export interface DebtorStatistics {
  total_records: number // 總記錄數
  unique_uploaders: number // 登錄債務會員數
  fatigue_percentage: number // 疲勞比例（%）
  latest_update: string | null // 最近更新時間
}

/**
 * 債務查詢結果（遮罩版）
 */
export interface DebtSearchResult {
  // ... 原有欄位
  recent_notes?: DebtNotesSummary[] // 新增：備註摘要（最新 5 筆）
  // ... 其他欄位
}
```

---

### 3. 前端頁面修改

**檔案**：`src/app/debts/search/page.tsx`

#### 新增狀態
```typescript
const [debtorStats, setDebtorStats] = useState<DebtorStatistics | null>(null)
```

#### 儲存統計資料
```typescript
// 查詢成功
setSearchResults(data.data.results || [])
setDebtorStats(data.data.debtor_stats || null) // 新增
setRemainingSearches(data.data.remaining_searches)
setHasSearched(true)
```

#### 顯示行為統計
```tsx
{/* 債務人行為統計 */}
{debtorStats && debtorStats.total_records > 0 && (
  <div className="bg-dark-300 border border-dark-200 rounded-lg p-4">
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">已登錄債務會員數：</span>
        <span className="text-lg font-semibold text-blue-400">
          {debtorStats.unique_uploaders} 筆
        </span>
      </div>
      
      {debtorStats.fatigue_percentage > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">曾標記「疲勞」的比例：</span>
          <span className={`text-lg font-semibold ${
            debtorStats.fatigue_percentage >= 50 
              ? 'text-red-400' 
              : debtorStats.fatigue_percentage >= 30 
              ? 'text-yellow-400' 
              : 'text-green-400'
          }`}>
            {debtorStats.fatigue_percentage}%
          </span>
        </div>
      )}
      
      {debtorStats.latest_update && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">最近更新時間：</span>
          <span className="text-sm text-foreground">
            {formatDate(debtorStats.latest_update)}
          </span>
        </div>
      )}
    </div>
  </div>
)}
```

#### 顯示備註摘要
```tsx
{/* 備註紀錄摘要 */}
{result.recent_notes && result.recent_notes.length > 0 && (
  <div className="mt-4 pt-4 border-t border-dark-200">
    <div className="flex items-center gap-2 mb-2">
      <p className="text-xs text-gray-400">💬 備註紀錄摘要</p>
      <span className="text-xs text-blue-400">
        （最新 {result.recent_notes.length} 筆更新）
      </span>
    </div>
    <div className="space-y-2">
      {result.recent_notes.map((note, index) => (
        <div 
          key={index}
          className="bg-dark-400 border border-dark-200 rounded p-2"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {new Date(note.created_at).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <p className="text-xs text-foreground-muted line-clamp-2">
            {note.content}
          </p>
        </div>
      ))}
    </div>
    <p className="text-xs text-gray-500 mt-2 italic">
      ℹ️ 此債務人最近有更新紀錄，請參考上方備註時間軸
    </p>
  </div>
)}
```

---

## 📋 測試計劃

### 測試環境
- **URL**：https://www.zhenhaoxun.com/debts/search
- **測試帳號**：a689594 / Qq123456

### 測試步驟

#### 1. 測試備註摘要顯示
1. 登入測試帳號
2. 查詢有備註的債務人（例如：羅來把 - M***56789）
3. 確認查詢結果中顯示「💬 備註紀錄摘要」區塊
4. 確認顯示最新 3 筆備註（之前測試時新增的）
5. 確認備註內容和時間正確顯示
6. 確認提示訊息正確顯示

#### 2. 測試行為統計顯示
1. 查詢有多筆記錄的債務人
2. 確認查詢結果標題下方顯示統計資訊
3. 確認「已登錄債務會員數」正確顯示
4. 確認「曾標記『疲勞』的比例」正確顯示
5. 確認「最近更新時間」正確顯示
6. 確認疲勞比例的顏色正確（紅/黃/綠）

#### 3. 測試無備註的情況
1. 查詢沒有備註的債務人
2. 確認不顯示「💬 備註紀錄摘要」區塊
3. 確認其他資訊正常顯示

#### 4. 測試單一記錄的情況
1. 查詢只有一筆記錄的債務人
2. 確認統計資訊正確顯示
3. 確認「已登錄債務會員數：1 筆」

---

## 🎯 預期效果

### 使用者體驗提升
1. **更完整的資訊**：查詢結果不只顯示靜態資料，還包含動態更新的備註
2. **風險評估**：一眼就能看出該債務人的整體風險（疲勞比例）
3. **決策輔助**：透過統計資訊幫助會員做出更好的業務決策

### 資料價值提升
1. **備註共享**：會員新增的備註可以讓其他會員看到（摘要形式）
2. **集體智慧**：多個會員的經驗匯集成統計資訊
3. **即時更新**：最近更新時間讓會員知道資訊的新鮮度

---

## 📝 注意事項

### 隱私保護
- ✅ 備註摘要只顯示內容和時間，不顯示備註者身份
- ✅ 統計資訊是匯總數據，不洩漏個別會員資訊
- ✅ 私密欄位（結清金額、已收回金額等）不會出現在查詢結果中

### 效能考量
- ✅ 備註查詢使用索引（`debt_record_id`）
- ✅ 統計查詢使用索引（`debtor_id_first_letter`, `debtor_id_last5`）
- ✅ 查詢結果有限制（最多 5 筆備註）

### 未來改進方向
1. **備註搜尋**：在備註摘要中新增搜尋功能
2. **統計圖表**：將統計資訊視覺化（圓餅圖、折線圖）
3. **趨勢分析**：顯示債務人還款狀況的變化趨勢
4. **風險評分**：根據統計資訊計算風險評分（0-100 分）

---

**部署完成時間**：等待 Vercel 自動部署
**Git Commit**：1800385
**狀態**：✅ 已推送到 GitHub

