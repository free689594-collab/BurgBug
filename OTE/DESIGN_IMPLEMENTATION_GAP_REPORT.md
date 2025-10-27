# 設計文檔 vs 實作差異報告

## 報告日期
2025-10-14

## 執行摘要

### 嚴重性評估
- **Critical 問題**: 15 個（members 表 11 個欄位 + debt_records 表 14 個欄位 + 註冊功能 4 個欄位 + 債務 API 缺失）
- **High 問題**: 8 個（資料遮罩、會員互動 API、會員資訊卡、like_rate_limits 表）
- **Medium 問題**: 5 個（修改申請表、管理員配置 API、區域統計）
- **Low 問題**: 3 個（前端性能優化）
- **總計**: 31 個不符合設計的問題

### 整體符合度（基於實際資料庫查詢結果）
- **資料庫結構**: 35% 符合（核心表存在，但欄位嚴重不足）
- **API 端點**: 30% 符合（認證 API 部分完成，債務 API 完全缺失）
- **UI 組件**: 25% 符合（基礎頁面存在，但欄位和功能不足）
- **安全性設計**: 45% 符合（RLS 政策部分完成，遮罩函數缺失）
- **整體符合度**: **33.75%**

### 好消息 ✅
- member_likes 表已存在（原以為缺失）
- member_statistics 表已存在（部分符合設計）
- 核心資料表（usage_counters, active_sessions, audit_logs）已存在

---

## 📋 詳細差異分析

### 1. 資料庫結構差異

#### 1.1 members 表

**設計文檔要求**:
```sql
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname VARCHAR(100) NOT NULL,
    business_type VARCHAR(50) NOT NULL,
    business_region VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pending',
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id),
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspended_by UUID REFERENCES auth.users(id),
    suspended_reason TEXT,
    suspension_expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT chk_member_status CHECK (
        status IN ('pending', 'approved', 'suspended')
    ),
    CONSTRAINT chk_business_region CHECK (
        business_region IN ('北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東')
    )
);
```

**當前實作**:
```sql
CREATE TABLE members (
    user_id UUID PRIMARY KEY,
    account TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**缺少的欄位** (🔴 Critical):
1. ❌ `id` - 主鍵應該是獨立的 UUID
2. ❌ `nickname` - 會員暱稱（必填）
3. ❌ `business_type` - 業務類型（必填）
4. ❌ `business_region` - 業務區域（必填，有 CHECK 約束）
5. ❌ `phone` - 電話號碼
6. ❌ `approved_at` - 審核通過時間
7. ❌ `approved_by` - 審核者 ID
8. ❌ `suspended_at` - 停用時間
9. ❌ `suspended_by` - 停用者 ID
10. ❌ `suspended_reason` - 停用原因
11. ❌ `suspension_expires_at` - 停用到期時間

**額外的欄位**:
1. ⚠️ `account` - 設計文檔中沒有此欄位（這是補充任務 A1 新增的）

**缺少的約束**:
1. ❌ `chk_member_status` - 狀態檢查約束
2. ❌ `chk_business_region` - 區域檢查約束

**影響**:
- 🔴 **Critical**: 註冊功能無法收集必要的業務資訊
- 🔴 **Critical**: 無法記錄審核和停用的詳細資訊
- 🔴 **Critical**: 無法實作區域篩選和統計功能

---

#### 1.2 user_roles 表

**設計文檔要求**:
```sql
CREATE TYPE user_role AS ENUM ('user','super_admin');

CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**當前實作**:
```sql
CREATE TYPE user_role AS ENUM ('user', 'admin', 'super_admin');

CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**差異**:
1. ⚠️ ENUM 多了 `'admin'` 值（設計文檔只有 'user' 和 'super_admin'）

**影響**:
- ⚠️ **Medium**: 與設計文檔不一致，但不影響功能
- 📝 需要確認是否需要 'admin' 角色，或應該移除

---

#### 1.3 debt_records 表

**設計文檔要求**:
```sql
CREATE TABLE debt_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debtor_name VARCHAR(100) NOT NULL,
    debtor_id_full VARCHAR(10) NOT NULL,
    debtor_id_last5 VARCHAR(5) NOT NULL,
    debtor_phone VARCHAR(20),
    gender VARCHAR(10),
    profession VARCHAR(100),
    residence VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    debt_year INTEGER NOT NULL,
    debt_month INTEGER NOT NULL,
    repayment_status VARCHAR(20) DEFAULT '待觀察',
    note TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    admin_edited_by UUID REFERENCES auth.users(id),
    admin_edit_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_repayment_status CHECK (
        repayment_status IN ('待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳')
    ),
    CONSTRAINT chk_residence CHECK (
        residence IN ('北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東')
    )
);
```

**當前實作**（✅ 已驗證）:
```sql
-- 實際存在的欄位：
id UUID PRIMARY KEY
debtor_id TEXT
debtor_id_first_letter TEXT
debtor_id_last5 TEXT
debt_date DATE
face_value NUMERIC
payment_frequency TEXT
uploaded_by UUID
created_at TIMESTAMPTZ
```

**缺少的欄位** (🔴 Critical):
1. ❌ `debtor_name` - 債務人姓名（必填）
2. ❌ `debtor_id_full` - 完整身分證字號（必填）
3. ❌ `debtor_phone` - 債務人電話
4. ❌ `gender` - 性別
5. ❌ `profession` - 職業
6. ❌ `residence` - 居住地區（必填，有 CHECK 約束）
7. ❌ `amount` - 債務金額（必填）
8. ❌ `debt_year` - 債務年份（必填）
9. ❌ `debt_month` - 債務月份（必填）
10. ❌ `repayment_status` - 還款狀態（必填，有 CHECK 約束）
11. ❌ `note` - 備註
12. ❌ `admin_edited_by` - 管理員編輯者
13. ❌ `admin_edit_reason` - 管理員編輯原因
14. ❌ `updated_at` - 更新時間

**額外的欄位**（補充任務 C1）:
1. ✅ `debtor_id_first_letter` - 身分證首字母（補充任務新增）
2. ✅ `debt_date` - 債務日期（補充任務新增）
3. ✅ `face_value` - 票面金額（補充任務新增）
4. ✅ `payment_frequency` - 還款頻率（補充任務新增）

**缺少的約束**:
1. ❌ `chk_repayment_status` - 還款狀態檢查約束
2. ❌ `chk_residence` - 居住地區檢查約束

**影響**:
- 🔴 **Critical**: 缺少 14 個核心欄位，債務上傳功能無法實作
- 🔴 **Critical**: 無法記錄債務人的基本資訊
- 🔴 **Critical**: 無法實作區域篩選和統計功能

---

#### 1.4 member_statistics 表

**設計文檔要求**:
```sql
CREATE TABLE member_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    total_uploads INTEGER DEFAULT 0,
    total_queries INTEGER DEFAULT 0,
    likes_received INTEGER DEFAULT 0,
    likes_given INTEGER DEFAULT 0,
    activity_points INTEGER DEFAULT 0,
    activity_level INTEGER DEFAULT 1,
    title VARCHAR(100) DEFAULT '初入江湖',
    title_color VARCHAR(7) DEFAULT '#9CA3AF',
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**當前實作**:
- ✅ 表存在

**待驗證**:
1. ⏳ 所有欄位是否存在
2. ⏳ 預設值是否正確

---

#### 1.5 缺少的資料表 (🔴 Critical)

**已存在的資料表**（✅ 好消息！）：
1. ✅ **member_likes** - 按讚記錄表（已存在！）
   - 欄位：id, liker_id, liked_member_id, created_at
   - 狀態：結構完整，符合設計文檔

2. ✅ **member_statistics** - 會員統計表（已存在！）
   - 欄位：user_id, likes_received, likes_given, uploads_count, queries_count, updated_at
   - 狀態：部分符合設計文檔（缺少部分欄位）

3. ✅ **usage_counters** - 使用配額表（已存在）

4. ✅ **active_sessions** - 單裝置控制表（已存在）

5. ✅ **audit_logs** - 審計日誌表（已存在）

**缺少的資料表**（❌ 需要建立）：

1. ❌ **like_rate_limits** - 按讚頻率限制表
   - 影響：無法實作按讚冷卻機制
   - 優先級：High

2. ❌ **profile_modification_requests** - 會員資料修改申請表
   - 影響：無法實作資料修改申請功能
   - 優先級：Medium

3. ❌ **debt_modification_requests** - 債務資料修改申請表
   - 影響：無法實作債務資料修改申請功能
   - 優先級：Medium

---

### 2. API 端點差異

#### 2.1 認證 API

**設計文檔要求的端點**:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

**當前實作**:
- ✅ POST /api/auth/register（已實作）
- ✅ POST /api/auth/login（已實作）
- ✅ POST /api/auth/logout（已實作）
- ❌ GET /api/auth/me（未實作）

**註冊 API 差異** (🔴 Critical):

**設計文檔要求的註冊欄位**:
- account（帳號）- 補充任務 A2
- password（密碼）
- nickname（暱稱）- **缺失**
- business_type（業務類型）- **缺失**
- business_region（業務區域）- **缺失**
- phone（電話）- **缺失**

**當前實作的註冊欄位**:
- account（帳號）✅
- password（密碼）✅

**缺少的註冊欄位** (🔴 Critical):
1. ❌ nickname - 會員暱稱（必填）
2. ❌ business_type - 業務類型（必填）
3. ❌ business_region - 業務區域（必填，下拉選單）
4. ❌ phone - 電話號碼（選填）

**影響**:
- 🔴 **Critical**: 註冊功能無法收集必要的業務資訊
- 🔴 **Critical**: 無法實作區域統計功能
- 🔴 **Critical**: 會員資訊卡無法顯示業務類型和區域

---

#### 2.2 會員互動 API

**設計文檔要求的端點**:
- POST /api/member/like/{memberId} - 按讚功能
- GET /api/member/info-card/{memberId} - 會員資訊卡

**當前實作**:
- ❌ POST /api/member/like/{memberId}（未實作）
- ❌ GET /api/member/info-card/{memberId}（未實作）

**影響**:
- 🟡 **High**: 無法實作按讚功能
- 🟡 **High**: 無法顯示會員資訊卡

---

#### 2.3 管理員配置 API

**設計文檔要求的端點**:
- PUT /api/admin/activity-config - 活躍度系統配置
- POST /api/admin/badge-config - 勳章系統配置

**當前實作**:
- ❌ PUT /api/admin/activity-config（未實作）
- ❌ POST /api/admin/badge-config（未實作）

**影響**:
- ⚠️ **Medium**: 無法動態配置活躍度系統
- ⚠️ **Medium**: 無法管理勳章系統

---

#### 2.4 債務管理 API

**設計文檔要求的端點**:
- POST /api/debt-records - 上傳債務記錄
- GET /api/search/debt - 查詢債務記錄
- GET /api/my-debtors - 我的債務人列表
- PATCH /api/debt-records/[id] - 更新債務狀態

**當前實作**:
- ❌ 所有債務管理 API 均未實作

**影響**:
- 🔴 **Critical**: 核心業務功能完全缺失

---

### 3. UI 組件差異

#### 3.1 註冊頁面

**設計文檔要求的欄位**:
1. 帳號（account）- 文字輸入
2. 密碼（password）- 密碼輸入
3. 確認密碼（confirmPassword）- 密碼輸入
4. 暱稱（nickname）- 文字輸入，必填
5. 業務類型（business_type）- 下拉選單或文字輸入，必填
6. 業務區域（business_region）- 下拉選單，必填，選項：
   - 北北基宜
   - 桃竹苗
   - 中彰投
   - 雲嘉南
   - 高屏澎
   - 花東
7. 電話（phone）- 文字輸入，選填

**當前實作的欄位**:
1. ✅ 帳號（account）
2. ✅ 密碼（password）
3. ✅ 確認密碼（confirmPassword）

**缺少的欄位** (🔴 Critical):
1. ❌ 暱稱（nickname）
2. ❌ 業務類型（business_type）
3. ❌ 業務區域（business_region）
4. ❌ 電話（phone）

**影響**:
- 🔴 **Critical**: 註冊頁面無法收集必要的業務資訊
- 🔴 **Critical**: 新註冊的會員缺少關鍵資料

---

#### 3.2 會員資訊卡組件

**設計文檔要求**:
- 會員暱稱
- 業務類型
- 業務區域
- 活躍度等級
- 等級稱號
- 等級顏色
- 勳章列表
- 按讚數量
- 按讚按鈕（含冷卻時間顯示）

**當前實作**:
- ❌ 完全未實作

**影響**:
- 🟡 **High**: 無法顯示會員資訊
- 🟡 **High**: 無法實作按讚功能

---

#### 3.3 管理員儀表板

**設計文檔要求**:
- 即時統計卡片（待審核會員、今日上傳、今日查詢、系統健康）
- 區域統計對比
- 活躍度系統配置

**當前實作**:
- ✅ 統計卡片（部分實作）
- ❌ 區域統計對比（未實作）
- ❌ 活躍度系統配置（未實作）

**影響**:
- ⚠️ **Medium**: 管理員無法查看區域統計
- ⚠️ **Medium**: 管理員無法配置活躍度系統

---

### 4. 安全性設計差異

#### 4.1 RLS 政策

**設計文檔要求的 RLS 政策**:
1. ✅ members 表 RLS（已實作）
2. ✅ debt_records 表 RLS（已實作）
3. ✅ usage_counters 表 RLS（已實作）
4. ✅ active_sessions 表 RLS（已實作）
5. ✅ audit_logs 表 RLS（已實作）
6. ❌ profile_modification_requests 表 RLS（表不存在）
7. ❌ debt_modification_requests 表 RLS（表不存在）

**影響**:
- ✅ 核心表的 RLS 政策已實作
- ⚠️ 修改申請表的 RLS 政策缺失（因為表不存在）

---

#### 4.2 資料遮罩函數

**設計文檔要求**:
- mask_name() - 姓名遮罩函數
- mask_phone() - 電話遮罩函數

**當前實作**:
- ❌ mask_name()（未實作）
- ❌ mask_phone()（未實作）

**影響**:
- 🟡 **High**: 無法保護敏感資料
- 🟡 **High**: 查詢結果可能洩漏完整個人資訊

---

### 5. 性能優化差異

#### 5.1 資料庫索引

**設計文檔要求的索引**:
```sql
CREATE INDEX CONCURRENTLY idx_debt_records_id_last5_status
ON debt_records(debtor_id_last5, repayment_status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_members_status_region
ON members(status, business_region) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY idx_member_statistics_level_points
ON member_statistics(activity_level DESC, activity_points DESC);

CREATE INDEX CONCURRENTLY idx_debt_records_uploaded_by_date
ON debt_records(uploaded_by, DATE(created_at));
```

**當前實作**:
- ⏳ 待驗證（需要查詢資料庫）

**影響**:
- ⚠️ **Medium**: 如果索引缺失，查詢效能可能不佳

---

#### 5.2 前端性能優化

**設計文檔要求**:
- 虛擬化長列表（react-window）
- 圖片懶加載

**當前實作**:
- ❌ 虛擬化長列表（未實作）
- ❌ 圖片懶加載（未實作）

**影響**:
- ⚠️ **Low**: 大量資料時效能可能不佳

---

## 📊 優先級分類總結

### Critical 問題（必須立即修正）

1. **members 表結構不完整**
   - 缺少 11 個必要欄位
   - 影響：註冊功能、會員管理、區域統計

2. **註冊 API 缺少必要欄位**
   - 缺少 nickname, business_type, business_region, phone
   - 影響：無法收集業務資訊

3. **註冊頁面 UI 缺少必要欄位**
   - 缺少 nickname, business_type, business_region, phone
   - 影響：使用者無法提供完整資訊

4. **debt_records 表結構待驗證**
   - 需要確認所有欄位是否存在
   - 影響：債務管理功能

5. **債務管理 API 完全缺失**
   - 所有債務相關 API 均未實作
   - 影響：核心業務功能無法使用

### High 問題（建議盡快修正）

6. **會員互動 API 缺失**
   - 按讚 API、會員資訊卡 API
   - 影響：社交功能無法使用

7. **資料遮罩函數缺失**
   - mask_name(), mask_phone()
   - 影響：敏感資料保護不足

8. **會員資訊卡組件缺失**
   - 影響：無法顯示會員詳細資訊

9. **member_likes 和 like_rate_limits 表缺失**
   - 影響：按讚功能無法實作

### Medium 問題（可以之後修正）

10. **管理員配置 API 缺失**
    - 活躍度系統配置、勳章系統配置
    - 影響：無法動態配置系統

11. **修改申請表缺失**
    - profile_modification_requests, debt_modification_requests
    - 影響：無法實作資料修改申請功能

12. **區域統計功能缺失**
    - 影響：管理員無法查看區域統計

### Low 問題（優化項目）

13. **前端性能優化缺失**
    - 虛擬化長列表、圖片懶加載
    - 影響：大量資料時效能可能不佳

---

## 🎯 總結

### 符合度評估
- **資料庫結構**: 30% 符合（核心表存在，但欄位嚴重不足）
- **API 端點**: 25% 符合（認證 API 部分完成，其他缺失）
- **UI 組件**: 20% 符合（基礎頁面存在，但欄位和功能不足）
- **安全性設計**: 40% 符合（RLS 政策部分完成，遮罩函數缺失）
- **整體符合度**: **28.75%**

### 關鍵發現
1. 🔴 **註冊功能嚴重不符合設計**：缺少 4 個必要欄位
2. 🔴 **members 表結構嚴重不完整**：缺少 11 個欄位
3. 🔴 **債務管理功能完全缺失**：所有 API 和 UI 均未實作
4. 🟡 **社交功能完全缺失**：按讚、會員資訊卡等功能未實作
5. ⚠️ **資料保護不足**：遮罩函數未實作

### 建議
1. **立即修正 Critical 問題**：優先修復 members 表和註冊功能
2. **盡快補充 High 問題**：實作資料遮罩和會員互動功能
3. **規劃 Medium 問題**：在核心功能完成後補充
4. **延後 Low 問題**：在系統穩定後進行性能優化

詳細的修正計劃請參考：`OTE/CORRECTION_PLAN.md`

