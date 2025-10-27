# 🛠️ 系統設置功能實現指南

## 第一步：新增系統設置管理頁面

### 1.1 區域灌水配置頁面

**文件**: `src/app/admin/system-settings/display-overrides/page.tsx`

**功能**:
```typescript
// 主要功能
1. 顯示所有 6 個區域的當前灌水量
2. 使用滑塊或輸入框調整灌水量（0-50）
3. 實時預覽效果
4. 保存和重置按鈕
5. 修改歷史記錄

// 狀態管理
const [overrides, setOverrides] = useState<Record<string, number>>({})
const [loading, setLoading] = useState(false)
const [saving, setSaving] = useState(false)
const [history, setHistory] = useState<HistoryItem[]>([])

// 主要函數
- fetchCurrentConfig() - 獲取當前配置
- handleSliderChange(region, value) - 調整滑塊
- handleSave() - 保存配置
- handleReset() - 重置為默認值
- fetchHistory() - 獲取修改歷史
```

**UI 結構**:
```
┌─────────────────────────────────────────┐
│ 區域灌水配置管理                         │
├─────────────────────────────────────────┤
│ 說明：調整各區域的展示數據增量           │
├─────────────────────────────────────────┤
│ 北北基宜: [====●====] 5                 │
│ 桃竹苗:   [===●=====] 3                 │
│ 中彰投:   [●========] 0                 │
│ 雲嘉南:   [=====●===] 7                 │
│ 高屏澎:   [========●] 10                │
│ 花東:     [====●====] 4                 │
├─────────────────────────────────────────┤
│ [保存] [重置] [查看歷史]                 │
├─────────────────────────────────────────┤
│ 修改歷史                                 │
│ 2025-10-27 14:30 - 北北基宜: 3→5       │
│ 2025-10-27 14:25 - 雲嘉南: 5→7         │
└─────────────────────────────────────────┘
```

---

### 1.2 審計日誌配置頁面

**文件**: `src/app/admin/system-settings/audit-config/page.tsx`

**功能**:
```typescript
// 主要功能
1. 設置日誌保留天數（1-365）
2. 日誌清理計劃
3. 日誌導出功能
4. 日誌統計信息

// 狀態管理
const [retentionDays, setRetentionDays] = useState(30)
const [autoCleanup, setAutoCleanup] = useState(true)
const [cleanupSchedule, setCleanupSchedule] = useState('daily')
const [stats, setStats] = useState<AuditStats>({})

// 主要函數
- fetchConfig() - 獲取當前配置
- handleSave() - 保存配置
- handleExport() - 導出日誌
- fetchStats() - 獲取統計信息
```

**UI 結構**:
```
┌─────────────────────────────────────────┐
│ 審計日誌配置                             │
├─────────────────────────────────────────┤
│ 日誌保留天數: [30] 天                    │
│ 自動清理: [✓] 啟用                      │
│ 清理計劃: [每天] ▼                      │
│ 清理時間: [02:00] ▼                     │
├─────────────────────────────────────────┤
│ 日誌統計                                 │
│ 總日誌數: 1,234 條                      │
│ 今日新增: 45 條                         │
│ 本週新增: 312 條                        │
│ 本月新增: 1,234 條                      │
├─────────────────────────────────────────┤
│ [保存] [導出日誌] [立即清理]             │
└─────────────────────────────────────────┘
```

---

### 1.3 系統參數配置頁面

**文件**: `src/app/admin/system-settings/parameters/page.tsx`

**功能**:
```typescript
// 主要功能
1. 顯示所有系統參數
2. 參數分類（基礎、性能、安全等）
3. 參數編輯和驗證
4. 參數版本控制

// 參數分類
基礎參數:
- 系統名稱
- 系統描述
- 系統 Logo

性能參數:
- 快取過期時間
- 連接池大小
- 查詢超時時間

安全參數:
- 密碼最小長度
- 密碼過期天數
- 登入失敗次數限制
```

---

## 第二步：新增功能開關管理

### 2.1 功能開關頁面

**文件**: `src/app/admin/feature-flags/page.tsx`

**功能**:
```typescript
// 主要功能
1. 顯示所有功能開關狀態
2. 按分類顯示
3. 快速開關按鈕
4. 開關歷史記錄

// 功能開關分類
會員功能:
- 會員註冊
- 會員登入
- 會員資料修改

債務功能:
- 債務上傳
- 債務查詢
- 債務按讚

訊息功能:
- 站內信
- 系統通知
- 郵件通知
```

**UI 結構**:
```
┌─────────────────────────────────────────┐
│ 功能開關管理                             │
├─────────────────────────────────────────┤
│ 會員功能                                 │
│ ├─ 會員註冊        [開] 2025-10-27     │
│ ├─ 會員登入        [開] 2025-10-27     │
│ └─ 資料修改        [關] 2025-10-26     │
│                                         │
│ 債務功能                                 │
│ ├─ 債務上傳        [開] 2025-10-27     │
│ ├─ 債務查詢        [開] 2025-10-27     │
│ └─ 債務按讚        [開] 2025-10-27     │
│                                         │
│ 訊息功能                                 │
│ ├─ 站內信          [開] 2025-10-27     │
│ ├─ 系統通知        [開] 2025-10-27     │
│ └─ 郵件通知        [關] 2025-10-26     │
└─────────────────────────────────────────┘
```

---

## 第三步：API 實現

### 3.1 系統設置 API

**文件**: `src/app/api/admin/system-settings/route.ts`

```typescript
// GET - 獲取系統設置
export async function GET(req: NextRequest) {
  // 1. 驗證管理員權限
  // 2. 查詢系統設置
  // 3. 返回設置信息
}

// PATCH - 更新系統設置
export async function PATCH(req: NextRequest) {
  // 1. 驗證管理員權限
  // 2. 驗證輸入數據
  // 3. 更新系統設置
  // 4. 記錄審計日誌
  // 5. 返回更新結果
}
```

### 3.2 功能開關 API

**文件**: `src/app/api/admin/feature-flags/route.ts`

```typescript
// GET - 獲取所有功能開關
export async function GET(req: NextRequest) {
  // 1. 驗證管理員權限
  // 2. 查詢功能開關
  // 3. 返回開關列表
}

// PATCH - 更新功能開關
export async function PATCH(req: NextRequest) {
  // 1. 驗證管理員權限
  // 2. 驗證開關名稱
  // 3. 更新開關狀態
  // 4. 記錄審計日誌
  // 5. 返回更新結果
}
```

---

## 第四步：資料庫表設計

### 4.1 功能開關表

```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  enabled_percentage INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feature_flag_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES feature_flags(id),
  old_value BOOLEAN,
  new_value BOOLEAN,
  changed_by UUID,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 第五步：導航菜單更新

**文件**: `src/components/admin/AdminNav.tsx`

```typescript
// 在 systemItems 中添加新項目
const systemItems = [
  { name: '審計日誌', path: '/admin/audit-logs', icon: '📝' },
  { name: '等級配置', path: '/admin/level-config', icon: '🏆' },
  { name: '活躍度規則', path: '/admin/activity-rules', icon: '⚡' },
  { name: '系統設置', path: '/admin/system-settings', icon: '⚙️' },  // 新增
  { name: '功能開關', path: '/admin/feature-flags', icon: '🔌' },    // 新增
]
```

---

## 實現時間表

| 任務 | 時間 | 優先級 |
|------|------|--------|
| 區域灌水配置頁面 | 2-3 小時 | 🔴 高 |
| 審計日誌配置頁面 | 1-2 小時 | 🔴 高 |
| 系統參數配置頁面 | 2-3 小時 | 🟡 中 |
| 功能開關管理頁面 | 3-4 小時 | 🟡 中 |
| API 實現 | 2-3 小時 | 🔴 高 |
| 資料庫表設計 | 1 小時 | 🔴 高 |
| 測試和調試 | 2-3 小時 | 🔴 高 |
| **總計** | **13-19 小時** | |

---

## 測試清單

- [ ] 區域灌水配置能否正確保存
- [ ] 審計日誌配置能否正確更新
- [ ] 功能開關能否正確切換
- [ ] 修改歷史能否正確記錄
- [ ] 權限檢查是否正確
- [ ] 錯誤處理是否完善
- [ ] UI 是否響應式
- [ ] 性能是否滿足要求

---

**建議開始時間**: 立即開始  
**預期完成時間**: 2025-11-03（1 週內）

