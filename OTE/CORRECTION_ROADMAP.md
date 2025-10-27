# 修正路線圖

## 路線圖概覽

### 總體目標
將專案從當前的 **39.9% 符合度**提升至 **100% 符合設計文檔**

### 分階段計劃
- **階段 1（Critical）**: 修復核心功能缺失（4.5 天）
- **階段 2（High）**: 補充重要功能（3.5 天）
- **階段 3（Medium）**: 實作次要功能（3 天）
- **階段 4（Low）**: 性能優化（1-2 天）

### 預估總時間
- **最小可用版本**: 8 天（階段 1 + 階段 2）
- **完整功能版本**: 11 天（階段 1 + 階段 2 + 階段 3）
- **優化版本**: 12-13 天（全部階段）

---

## 🔴 階段 1：Critical 修正（必須立即執行）

### 目標
修復所有 Critical 問題，讓核心業務功能可以運作

### 預估時間
4.5 天

### 里程碑
- ✅ 註冊功能完整（收集所有必要資訊）
- ✅ 債務上傳功能可用
- ✅ 債務查詢功能可用
- ✅ 核心業務流程打通

---

### 任務 1.1：修正 members 表結構

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 無

**執行步驟**:

1. **備份當前資料**:
   ```sql
   -- 匯出當前 members 表資料
   SELECT * FROM members;
   ```

2. **新增缺少的欄位**:
   ```sql
   -- 新增 id 欄位（新主鍵候選）
   ALTER TABLE members ADD COLUMN id UUID DEFAULT gen_random_uuid();
   
   -- 新增業務資訊欄位
   ALTER TABLE members ADD COLUMN nickname VARCHAR(100);
   ALTER TABLE members ADD COLUMN business_type VARCHAR(50);
   ALTER TABLE members ADD COLUMN business_region VARCHAR(20);
   ALTER TABLE members ADD COLUMN phone VARCHAR(20);
   
   -- 新增審核相關欄位
   ALTER TABLE members ADD COLUMN approved_at TIMESTAMPTZ;
   ALTER TABLE members ADD COLUMN approved_by UUID REFERENCES auth.users(id);
   
   -- 新增停用相關欄位
   ALTER TABLE members ADD COLUMN suspended_at TIMESTAMPTZ;
   ALTER TABLE members ADD COLUMN suspended_by UUID REFERENCES auth.users(id);
   ALTER TABLE members ADD COLUMN suspended_reason TEXT;
   ALTER TABLE members ADD COLUMN suspension_expires_at TIMESTAMPTZ;
   ```

3. **新增 CHECK 約束**:
   ```sql
   ALTER TABLE members ADD CONSTRAINT chk_member_status 
   CHECK (status IN ('pending', 'approved', 'suspended'));
   
   ALTER TABLE members ADD CONSTRAINT chk_business_region 
   CHECK (business_region IN ('北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'));
   ```

4. **為現有會員設定預設值**:
   ```sql
   -- 為現有會員設定預設暱稱和區域
   UPDATE members 
   SET nickname = '會員' || LEFT(user_id::TEXT, 4),
       business_region = '未設定'
   WHERE nickname IS NULL;
   ```

**測試**:
- [ ] 驗證所有欄位已新增
- [ ] 驗證 CHECK 約束正常運作
- [ ] 驗證現有資料未受影響

**影響的檔案**:
- 資料庫 schema（Supabase）

---

### 任務 1.2：修正 debt_records 表結構

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 無

**執行步驟**:

1. **新增缺少的欄位**:
   ```sql
   -- 新增債務人基本資訊欄位
   ALTER TABLE debt_records ADD COLUMN debtor_name VARCHAR(100);
   ALTER TABLE debt_records ADD COLUMN debtor_id_full VARCHAR(10);
   ALTER TABLE debt_records ADD COLUMN debtor_phone VARCHAR(20);
   ALTER TABLE debt_records ADD COLUMN gender VARCHAR(10);
   ALTER TABLE debt_records ADD COLUMN profession VARCHAR(100);
   ALTER TABLE debt_records ADD COLUMN residence VARCHAR(20);
   
   -- 新增債務資訊欄位
   ALTER TABLE debt_records ADD COLUMN amount DECIMAL(15,2);
   ALTER TABLE debt_records ADD COLUMN debt_year INTEGER;
   ALTER TABLE debt_records ADD COLUMN debt_month INTEGER;
   ALTER TABLE debt_records ADD COLUMN repayment_status VARCHAR(20) DEFAULT '待觀察';
   ALTER TABLE debt_records ADD COLUMN note TEXT;
   
   -- 新增管理員編輯欄位
   ALTER TABLE debt_records ADD COLUMN admin_edited_by UUID REFERENCES auth.users(id);
   ALTER TABLE debt_records ADD COLUMN admin_edit_reason TEXT;
   ALTER TABLE debt_records ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
   ```

2. **新增 CHECK 約束**:
   ```sql
   ALTER TABLE debt_records ADD CONSTRAINT chk_repayment_status 
   CHECK (repayment_status IN ('待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳'));
   
   ALTER TABLE debt_records ADD CONSTRAINT chk_residence 
   CHECK (residence IN ('北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'));
   ```

3. **新增索引**（根據設計文檔）:
   ```sql
   CREATE INDEX CONCURRENTLY idx_debt_records_id_last5_status
   ON debt_records(debtor_id_last5, repayment_status, created_at DESC);
   
   CREATE INDEX CONCURRENTLY idx_debt_records_uploaded_by_date
   ON debt_records(uploaded_by, DATE(created_at));
   ```

**測試**:
- [ ] 驗證所有欄位已新增
- [ ] 驗證 CHECK 約束正常運作
- [ ] 驗證索引已建立

**影響的檔案**:
- 資料庫 schema（Supabase）

---

### 任務 1.3：修正註冊 API

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 任務 1.1 完成

**執行步驟**:

1. **修改 API 輸入驗證**:
   ```typescript
   // src/app/api/auth/register/route.ts
   
   const { account, password, nickname, business_type, business_region, phone } = await req.json();
   
   // 驗證必填欄位
   if (!nickname || !business_type || !business_region) {
     return NextResponse.json(
       errorResponse(ErrorCodes.VALIDATION_ERROR, '請填寫所有必填欄位'),
       { status: 400 }
     );
   }
   
   // 驗證 business_region 是否在允許的選項中
   const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'];
   if (!validRegions.includes(business_region)) {
     return NextResponse.json(
       errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的業務區域'),
       { status: 400 }
     );
   }
   ```

2. **修改資料庫插入邏輯**:
   ```typescript
   const { error: memberError } = await supabaseAdmin
     .from('members')
     .insert({
       user_id: authUser.id,
       account,
       nickname,
       business_type,
       business_region,
       phone: phone || null,
       status: 'pending',
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
     });
   ```

**測試**:
- [ ] 測試必填欄位驗證
- [ ] 測試 business_region 驗證
- [ ] 測試資料正確插入資料庫
- [ ] 測試註冊後資料完整性

**影響的檔案**:
- `src/app/api/auth/register/route.ts`

---

### 任務 1.4：修正註冊頁面 UI

**優先級**: 🔴 Critical  
**預估時間**: 1 天  
**依賴**: 任務 1.3 完成

**執行步驟**:

1. **新增表單狀態**:
   ```typescript
   const [formData, setFormData] = useState({
     account: '',
     password: '',
     confirmPassword: '',
     nickname: '',           // 新增
     business_type: '',      // 新增
     business_region: '',    // 新增
     phone: ''               // 新增
   });
   ```

2. **新增業務區域選項**:
   ```typescript
   const businessRegions = [
     '北北基宜',
     '桃竹苗',
     '中彰投',
     '雲嘉南',
     '高屏澎',
     '花東'
   ];
   ```

3. **新增表單欄位 UI**（詳細程式碼見 CORRECTION_PLAN.md）

4. **修改提交邏輯**:
   ```typescript
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     
     // 驗證必填欄位
     if (!formData.nickname || !formData.business_type || !formData.business_region) {
       setError('請填寫所有必填欄位');
       return;
     }
     
     // 提交表單
     const response = await fetch('/api/auth/register', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(formData)
     });
   };
   ```

**測試**:
- [ ] 測試所有欄位顯示正常
- [ ] 測試必填欄位驗證
- [ ] 測試下拉選單選項正確
- [ ] 測試表單提交成功
- [ ] 測試響應式設計

**影響的檔案**:
- `src/app/register/page.tsx`

---

### 任務 1.5：實作債務管理 API

**優先級**: 🔴 Critical  
**預估時間**: 1.5 天  
**依賴**: 任務 1.2 完成

**執行步驟**:

1. **建立債務上傳 API**:
   ```typescript
   // src/app/api/debt-records/route.ts
   
   export async function POST(req: NextRequest) {
     // 1. 驗證使用者身份和權限
     // 2. 驗證輸入資料
     // 3. 檢查每日上傳配額
     // 4. 插入債務記錄
     // 5. 更新統計資料
     // 6. 記錄審計日誌
     // 7. 返回成功回應
   }
   ```

2. **建立債務查詢 API**:
   ```typescript
   // src/app/api/search/debt/route.ts
   
   export async function GET(req: NextRequest) {
     // 1. 驗證使用者身份和權限
     // 2. 解析查詢參數（debtor_id_first_letter, debtor_id_last5）
     // 3. 檢查每日查詢配額
     // 4. 查詢債務記錄（使用遮罩函數）
     // 5. 更新統計資料
     // 6. 記錄審計日誌
     // 7. 返回查詢結果
   }
   ```

3. **建立我的債務人列表 API**:
   ```typescript
   // src/app/api/my-debtors/route.ts
   
   export async function GET(req: NextRequest) {
     // 1. 驗證使用者身份
     // 2. 查詢使用者上傳的債務記錄
     // 3. 返回列表（不遮罩，因為是自己上傳的）
   }
   ```

4. **建立債務狀態更新 API**:
   ```typescript
   // src/app/api/debt-records/[id]/route.ts
   
   export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
     // 1. 驗證使用者身份
     // 2. 驗證是否為上傳者或管理員
     // 3. 更新還款狀態
     // 4. 記錄審計日誌
     // 5. 返回成功回應
   }
   ```

**測試**:
- [ ] 測試債務上傳功能
- [ ] 測試債務查詢功能
- [ ] 測試配額限制
- [ ] 測試權限檢查
- [ ] 測試遮罩處理

**影響的檔案**:
- `src/app/api/debt-records/route.ts`（新建）
- `src/app/api/search/debt/route.ts`（新建）
- `src/app/api/my-debtors/route.ts`（新建）
- `src/app/api/debt-records/[id]/route.ts`（新建）

---

### 任務 1.6：實作債務查詢界面

**優先級**: 🔴 Critical  
**預估時間**: 1 天  
**依賴**: 任務 1.5 完成

**執行步驟**:

1. **建立債務查詢頁面**:
   ```typescript
   // src/app/search-debt/page.tsx
   
   export default function SearchDebtPage() {
     // 1. 查詢表單（身分證首字母 + 後5碼）
     // 2. 查詢結果顯示（包含遮罩）
     // 3. 會員資訊卡顯示
     // 4. 查詢歷史記錄
   }
   ```

2. **建立查詢結果組件**:
   ```typescript
   // src/components/debt/DebtSearchResults.tsx
   
   export function DebtSearchResults({ results }: DebtSearchResultsProps) {
     // 顯示查詢結果列表
     // 包含遮罩的債務人資訊
     // 上傳者的會員資訊卡
   }
   ```

**測試**:
- [ ] 測試查詢表單功能
- [ ] 測試查詢結果顯示
- [ ] 測試遮罩顯示正確
- [ ] 測試會員資訊卡顯示
- [ ] 測試響應式設計

**影響的檔案**:
- `src/app/search-debt/page.tsx`（新建）
- `src/components/debt/DebtSearchResults.tsx`（新建）

---

### 任務 1.7：實作債務人管理界面

**優先級**: 🔴 Critical  
**預估時間**: 1.5 天  
**依賴**: 任務 1.5 完成

**執行步驟**:

1. **建立債務人上傳頁面**:
   ```typescript
   // src/app/upload-debt/page.tsx
   
   export default function UploadDebtPage() {
     // 1. 上傳表單（包含所有必要欄位）
     // 2. 雙重確認機制
     // 3. 上傳成功提示
   }
   ```

2. **建立我的債務人列表頁面**:
   ```typescript
   // src/app/my-debtors/page.tsx
   
   export default function MyDebtorsPage() {
     // 1. 債務人列表顯示
     // 2. 債務狀態快速更新
     // 3. 統計資訊顯示
   }
   ```

**測試**:
- [ ] 測試上傳表單功能
- [ ] 測試雙重確認機制
- [ ] 測試債務人列表顯示
- [ ] 測試狀態更新功能
- [ ] 測試響應式設計

**影響的檔案**:
- `src/app/upload-debt/page.tsx`（新建）
- `src/app/my-debtors/page.tsx`（新建）

---

## 🟡 階段 2：High 修正（建議盡快執行）

### 目標
補充重要功能，提升資料保護和使用者體驗

### 預估時間
3.5 天

### 里程碑
- ✅ 資料保護完善（遮罩函數）
- ✅ 會員儀表板可用
- ✅ 社交功能可用（按讚、會員資訊卡）

---

### 任務 2.1：實作資料遮罩函數

**優先級**: 🟡 High  
**預估時間**: 0.5 天  
**依賴**: 無

**執行步驟**:

1. **建立遮罩函數**（SQL 程式碼見 GAP_SUMMARY.md）

2. **在查詢 API 中使用遮罩函數**:
   ```typescript
   const { data: debtRecords } = await supabase
     .from('debt_records')
     .select(`
       id,
       mask_name(debtor_name) as debtor_name,
       debtor_id_last5,
       mask_phone(debtor_phone) as debtor_phone,
       ...
     `)
     .eq('debtor_id_last5', debtor_id_last5);
   ```

**測試**:
- [ ] 測試姓名遮罩正確
- [ ] 測試電話遮罩正確
- [ ] 測試查詢結果已遮罩

**影響的檔案**:
- 資料庫 schema（Supabase）
- `src/app/api/search/debt/route.ts`

---

### 任務 2.2：實作會員儀表板

**優先級**: 🟡 High  
**預估時間**: 1.5 天  
**依賴**: 任務 1.1, 1.2 完成

**執行步驟**:

1. **建立個人統計 API**
2. **建立區域統計 API**
3. **建立統計卡片組件**
4. **建立區域統計圖表**
5. **實作使用限制進度條**

**測試**:
- [ ] 測試統計資料正確
- [ ] 測試圖表顯示正常
- [ ] 測試進度條顯示正確

**影響的檔案**:
- `src/app/api/member/dashboard-stats/route.ts`（新建）
- `src/app/api/region/stats/route.ts`（新建）
- `src/app/dashboard/page.tsx`（修改）
- `src/components/dashboard/StatsCard.tsx`（新建）

---

### 任務 2.3：實作會員互動功能

**優先級**: 🟡 High  
**預估時間**: 1.5 天  
**依賴**: 無

**執行步驟**:

1. **建立 like_rate_limits 表**
2. **實作按讚 API**
3. **實作會員資訊卡 API**
4. **建立會員資訊卡組件**
5. **整合到查詢結果頁面**

**測試**:
- [ ] 測試按讚功能
- [ ] 測試冷卻機制
- [ ] 測試會員資訊卡顯示

**影響的檔案**:
- 資料庫 schema（Supabase）
- `src/app/api/member/like/[memberId]/route.ts`（新建）
- `src/app/api/member/info-card/[memberId]/route.ts`（新建）
- `src/components/member/MemberInfoCard.tsx`（新建）

---

## ⚠️ 階段 3：Medium 修正（可以之後執行）

### 目標
實作次要功能，提升系統完整性

### 預估時間
3 天

### 里程碑
- ✅ 資料修改申請功能可用
- ✅ 管理員可配置系統
- ✅ 區域統計完整

---

### 任務 3.1：建立修改申請系統

**優先級**: ⚠️ Medium  
**預估時間**: 1 天

**執行步驟**:
1. 建立 profile_modification_requests 表
2. 建立 debt_modification_requests 表
3. 建立審核 API
4. 建立申請 UI

---

### 任務 3.2：實作管理員配置 API

**優先級**: ⚠️ Medium  
**預估時間**: 1 天

**執行步驟**:
1. 建立活躍度系統配置 API
2. 建立勳章系統配置 API
3. 建立配置管理 UI

---

### 任務 3.3：實作區域統計功能

**優先級**: ⚠️ Medium  
**預估時間**: 1 天

**執行步驟**:
1. 建立區域統計 API
2. 建立區域統計對比 UI
3. 整合到管理員儀表板

---

## 📝 階段 4：Low 修正（優化項目）

### 目標
性能優化，提升使用者體驗

### 預估時間
1-2 天

### 任務 4.1：前端性能優化

**優先級**: 📝 Low  
**預估時間**: 1-2 天

**執行步驟**:
1. 實作虛擬化長列表（react-window）
2. 實作圖片懶加載
3. 優化查詢效能

---

## 📊 進度追蹤

### 檢查清單

**階段 1（Critical）**:
- [ ] 任務 1.1：修正 members 表結構
- [ ] 任務 1.2：修正 debt_records 表結構
- [ ] 任務 1.3：修正註冊 API
- [ ] 任務 1.4：修正註冊頁面 UI
- [ ] 任務 1.5：實作債務管理 API
- [ ] 任務 1.6：實作債務查詢界面
- [ ] 任務 1.7：實作債務人管理界面

**階段 2（High）**:
- [ ] 任務 2.1：實作資料遮罩函數
- [ ] 任務 2.2：實作會員儀表板
- [ ] 任務 2.3：實作會員互動功能

**階段 3（Medium）**:
- [ ] 任務 3.1：建立修改申請系統
- [ ] 任務 3.2：實作管理員配置 API
- [ ] 任務 3.3：實作區域統計功能

**階段 4（Low）**:
- [ ] 任務 4.1：前端性能優化

---

## 🎯 成功標準

### 階段 1 完成標準
- ✅ 註冊功能收集所有必要資訊
- ✅ 債務上傳功能可用
- ✅ 債務查詢功能可用
- ✅ 所有 Critical 測試通過

### 階段 2 完成標準
- ✅ 資料遮罩正常運作
- ✅ 會員儀表板顯示完整統計
- ✅ 按讚功能可用
- ✅ 所有 High 測試通過

### 階段 3 完成標準
- ✅ 修改申請功能可用
- ✅ 管理員可配置系統
- ✅ 區域統計完整
- ✅ 所有 Medium 測試通過

### 階段 4 完成標準
- ✅ 長列表效能良好
- ✅ 圖片載入優化
- ✅ 所有 Low 測試通過

---

詳細的差異分析請參考：
- `OTE/COMPREHENSIVE_GAP_ANALYSIS.md` - 完整差異分析
- `OTE/GAP_SUMMARY.md` - 差異總結報告

