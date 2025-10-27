# 設計文檔符合性修正計劃

## 計劃概覽

### 修正範圍
- **Critical 問題**: 5 個（必須立即修正）
- **High 問題**: 4 個（建議盡快修正）
- **Medium 問題**: 3 個（可以之後修正）
- **Low 問題**: 1 個（優化項目）

### 預估總時間
- **Critical 修正**: 3-4 天
- **High 修正**: 2-3 天
- **Medium 修正**: 2-3 天
- **Low 修正**: 1-2 天
- **總計**: 8-12 天

---

## 🔴 階段 1：Critical 問題修正（必須立即執行）

### 1.1 修正 members 表結構

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 無

**問題描述**:
- members 表缺少 11 個必要欄位
- 缺少 CHECK 約束
- 主鍵結構不符合設計

**修正步驟**:

1. **備份當前資料**:
   ```sql
   -- 匯出當前 members 表資料
   SELECT * FROM members;
   ```

2. **新增缺少的欄位**:
   ```sql
   -- 新增 id 欄位（新主鍵）
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

4. **調整主鍵**（可選，需要謹慎操作）:
   ```sql
   -- 如果需要將主鍵從 user_id 改為 id，需要：
   -- 1. 移除舊主鍵約束
   -- 2. 新增 id 為主鍵
   -- 3. 新增 user_id 的 UNIQUE 約束
   -- 注意：這會影響外鍵關聯，需要謹慎評估
   ```

**影響的檔案**:
- 資料庫 schema（Supabase）
- 無需修改程式碼（向後相容）

**測試**:
- 驗證所有欄位已新增
- 驗證 CHECK 約束正常運作
- 驗證現有資料未受影響

---

### 1.2 修正註冊 API

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 1.1 完成

**問題描述**:
- 註冊 API 缺少 nickname, business_type, business_region, phone 欄位
- 無法收集必要的業務資訊

**修正步驟**:

1. **修改 API 輸入驗證**:
   ```typescript
   // src/app/api/auth/register/route.ts
   
   // 新增欄位驗證
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
   // 插入 members 表時包含新欄位
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

**影響的檔案**:
- `src/app/api/auth/register/route.ts`

**測試**:
- 測試必填欄位驗證
- 測試 business_region 驗證
- 測試資料正確插入資料庫

---

### 1.3 修正註冊頁面 UI

**優先級**: 🔴 Critical  
**預估時間**: 1 天  
**依賴**: 1.2 完成

**問題描述**:
- 註冊頁面缺少 nickname, business_type, business_region, phone 欄位
- 使用者無法提供完整資訊

**修正步驟**:

1. **新增表單欄位**:
   ```typescript
   // src/app/register/page.tsx
   
   const [formData, setFormData] = useState({
     account: '',
     password: '',
     confirmPassword: '',
     nickname: '',           // 新增
     business_type: '',      // 新增
     business_region: '',    // 新增
     phone: ''               // 新增
   });
   
   const businessRegions = [
     '北北基宜',
     '桃竹苗',
     '中彰投',
     '雲嘉南',
     '高屏澎',
     '花東'
   ];
   ```

2. **新增 UI 元件**:
   ```tsx
   {/* 暱稱欄位 */}
   <div>
     <label className="block text-sm font-medium text-gray-300 mb-2">
       暱稱 <span className="text-red-500">*</span>
     </label>
     <input
       type="text"
       value={formData.nickname}
       onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
       className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg..."
       placeholder="請輸入暱稱"
       required
     />
   </div>
   
   {/* 業務類型欄位 */}
   <div>
     <label className="block text-sm font-medium text-gray-300 mb-2">
       業務類型 <span className="text-red-500">*</span>
     </label>
     <input
       type="text"
       value={formData.business_type}
       onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
       className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg..."
       placeholder="例如：討債、法律諮詢、金融服務"
       required
     />
   </div>
   
   {/* 業務區域下拉選單 */}
   <div>
     <label className="block text-sm font-medium text-gray-300 mb-2">
       業務區域 <span className="text-red-500">*</span>
     </label>
     <select
       value={formData.business_region}
       onChange={(e) => setFormData({ ...formData, business_region: e.target.value })}
       className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg..."
       required
     >
       <option value="">請選擇業務區域</option>
       {businessRegions.map(region => (
         <option key={region} value={region}>{region}</option>
       ))}
     </select>
   </div>
   
   {/* 電話欄位（選填） */}
   <div>
     <label className="block text-sm font-medium text-gray-300 mb-2">
       聯絡電話
     </label>
     <input
       type="tel"
       value={formData.phone}
       onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
       className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg..."
       placeholder="例如：0912-345-678"
     />
   </div>
   ```

3. **修改提交邏輯**:
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
     
     // ... 處理回應
   };
   ```

**影響的檔案**:
- `src/app/register/page.tsx`

**測試**:
- 測試所有欄位顯示正常
- 測試必填欄位驗證
- 測試下拉選單選項正確
- 測試表單提交成功

---

### 1.4 驗證 debt_records 表結構

**優先級**: 🔴 Critical  
**預估時間**: 0.5 天  
**依賴**: 無

**問題描述**:
- 需要確認 debt_records 表的所有欄位是否存在
- 需要確認 CHECK 約束是否存在

**修正步驟**:

1. **查詢當前表結構**:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'debt_records'
   ORDER BY ordinal_position;
   ```

2. **查詢 CHECK 約束**:
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_schema = 'public'
   AND constraint_name LIKE '%debt_records%';
   ```

3. **補充缺少的欄位**（如果有）:
   ```sql
   -- 根據查詢結果補充缺少的欄位
   ALTER TABLE debt_records ADD COLUMN [欄位名] [類型];
   ```

4. **補充缺少的約束**（如果有）:
   ```sql
   ALTER TABLE debt_records ADD CONSTRAINT chk_repayment_status 
   CHECK (repayment_status IN ('待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳'));
   
   ALTER TABLE debt_records ADD CONSTRAINT chk_residence 
   CHECK (residence IN ('北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'));
   ```

**影響的檔案**:
- 資料庫 schema（Supabase）

**測試**:
- 驗證所有欄位存在
- 驗證 CHECK 約束正常運作

---

### 1.5 實作債務管理 API（基礎版）

**優先級**: 🔴 Critical  
**預估時間**: 1.5 天  
**依賴**: 1.4 完成

**問題描述**:
- 所有債務管理 API 均未實作
- 核心業務功能無法使用

**修正步驟**:

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
     // 2. 解析查詢參數（debtor_id_last5, residence 等）
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

**影響的檔案**:
- `src/app/api/debt-records/route.ts`（新建）
- `src/app/api/search/debt/route.ts`（新建）
- `src/app/api/my-debtors/route.ts`（新建）
- `src/app/api/debt-records/[id]/route.ts`（新建）

**測試**:
- 測試債務上傳功能
- 測試債務查詢功能
- 測試配額限制
- 測試權限檢查

---

## 🟡 階段 2：High 問題修正（建議盡快執行）

### 2.1 實作資料遮罩函數

**優先級**: 🟡 High  
**預估時間**: 0.5 天  
**依賴**: 無

**問題描述**:
- mask_name() 和 mask_phone() 函數未實作
- 查詢結果可能洩漏完整個人資訊

**修正步驟**:

1. **建立遮罩函數**:
   ```sql
   -- 姓名遮罩函數
   CREATE OR REPLACE FUNCTION mask_name(full_name TEXT)
   RETURNS TEXT AS $$
   BEGIN
       IF full_name IS NULL OR LENGTH(full_name) <= 2 THEN
           RETURN full_name;
       ELSIF LENGTH(full_name) = 3 THEN
           RETURN LEFT(full_name, 1) || 'X' || RIGHT(full_name, 1);
       ELSE
           RETURN LEFT(full_name, 1) ||
                  REPEAT('X', LENGTH(full_name) - 2) ||
                  RIGHT(full_name, 1);
       END IF;
   END;
   $$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;
   
   -- 電話遮罩函數
   CREATE OR REPLACE FUNCTION mask_phone(phone_number TEXT)
   RETURNS TEXT AS $$
   BEGIN
       IF phone_number IS NULL OR LENGTH(phone_number) < 8 THEN
           RETURN 'xxx-xxxx';
       ELSIF LENGTH(phone_number) = 10 THEN
           RETURN LEFT(phone_number, 2) || 'xx' || SUBSTRING(phone_number, 5, 3) || 'xx' || RIGHT(phone_number, 1);
       ELSE
           RETURN LEFT(phone_number, 2) || 'xx' || SUBSTRING(phone_number, 5, 3) || 'xxx';
       END IF;
   END;
   $$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;
   ```

2. **在查詢 API 中使用遮罩函數**:
   ```typescript
   // src/app/api/search/debt/route.ts
   
   const { data: debtRecords } = await supabase
     .from('debt_records')
     .select(`
       id,
       mask_name(debtor_name) as debtor_name,
       debtor_id_last5,
       mask_phone(debtor_phone) as debtor_phone,
       gender,
       profession,
       residence,
       amount,
       debt_year,
       debt_month,
       repayment_status,
       created_at
     `)
     .eq('debtor_id_last5', debtor_id_last5);
   ```

**影響的檔案**:
- 資料庫 schema（Supabase）
- `src/app/api/search/debt/route.ts`

**測試**:
- 測試姓名遮罩正確
- 測試電話遮罩正確
- 測試查詢結果已遮罩

---

### 2.2 建立會員互動 API

**優先級**: 🟡 High  
**預估時間**: 1 天  
**依賴**: 2.3 完成（需要先建立資料表）

**問題描述**:
- 按讚 API 和會員資訊卡 API 未實作
- 社交功能無法使用

**修正步驟**:

1. **建立按讚 API**:
   ```typescript
   // src/app/api/member/like/[memberId]/route.ts
   
   export async function POST(req: NextRequest, { params }: { params: { memberId: string } }) {
     // 1. 驗證使用者身份
     // 2. 檢查是否為自己（不能給自己按讚）
     // 3. 檢查按讚冷卻時間
     // 4. 檢查是否已按讚
     // 5. 插入按讚記錄
     // 6. 更新統計資料
     // 7. 返回成功回應
   }
   ```

2. **建立會員資訊卡 API**:
   ```typescript
   // src/app/api/member/info-card/[memberId]/route.ts
   
   export async function GET(req: NextRequest, { params }: { params: { memberId: string } }) {
     // 1. 驗證使用者身份
     // 2. 查詢會員資訊
     // 3. 查詢統計資料
     // 4. 檢查是否已按讚
     // 5. 返回會員資訊卡資料
   }
   ```

**影響的檔案**:
- `src/app/api/member/like/[memberId]/route.ts`（新建）
- `src/app/api/member/info-card/[memberId]/route.ts`（新建）

**測試**:
- 測試按讚功能
- 測試冷卻機制
- 測試會員資訊卡顯示

---

### 2.3 建立按讚相關資料表

**優先級**: 🟡 High  
**預估時間**: 0.5 天  
**依賴**: 無

**問題描述**:
- member_likes 和 like_rate_limits 表缺失
- 按讚功能無法實作

**修正步驟**:

1. **建立 member_likes 表**:
   ```sql
   CREATE TABLE member_likes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       liker_id UUID REFERENCES auth.users(id),
       liked_member_id UUID REFERENCES auth.users(id),
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       
       UNIQUE(liker_id, liked_member_id),
       CONSTRAINT no_self_like CHECK (liker_id != liked_member_id)
   );
   
   CREATE INDEX idx_member_likes_liker ON member_likes(liker_id);
   CREATE INDEX idx_member_likes_liked ON member_likes(liked_member_id);
   ```

2. **建立 like_rate_limits 表**:
   ```sql
   CREATE TABLE like_rate_limits (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES auth.users(id),
       like_count INTEGER DEFAULT 0,
       window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       last_like_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
       
       UNIQUE(user_id)
   );
   ```

3. **建立統計更新觸發器**:
   ```sql
   CREATE TRIGGER trigger_update_statistics_likes
       AFTER INSERT OR DELETE ON member_likes
       FOR EACH ROW EXECUTE FUNCTION update_member_statistics();
   ```

**影響的檔案**:
- 資料庫 schema（Supabase）

**測試**:
- 驗證表建立成功
- 驗證約束正常運作
- 驗證觸發器正常運作

---

### 2.4 建立會員資訊卡組件

**優先級**: 🟡 High  
**預估時間**: 1 天  
**依賴**: 2.2 完成

**問題描述**:
- 會員資訊卡組件未實作
- 無法顯示會員詳細資訊

**修正步驟**:

1. **建立會員資訊卡組件**:
   ```typescript
   // src/components/member/MemberInfoCard.tsx
   
   export function MemberInfoCard({ memberInfo, onLike, showLikeButton }: MemberInfoCardProps) {
     // 實作會員資訊卡 UI
     // 包含：暱稱、業務類型、區域、等級、稱號、勳章、按讚按鈕
   }
   ```

2. **整合到查詢結果頁面**:
   ```typescript
   // 在債務查詢結果中顯示上傳者的會員資訊卡
   ```

**影響的檔案**:
- `src/components/member/MemberInfoCard.tsx`（新建）

**測試**:
- 測試會員資訊卡顯示
- 測試按讚按鈕功能
- 測試冷卻時間顯示

---

## ⚠️ 階段 3：Medium 問題修正（可以之後執行）

### 3.1 建立修改申請資料表

**優先級**: ⚠️ Medium  
**預估時間**: 1 天  
**依賴**: 無

**修正步驟**:
1. 建立 profile_modification_requests 表
2. 建立 debt_modification_requests 表
3. 建立 RLS 政策
4. 建立審核 API

---

### 3.2 實作管理員配置 API

**優先級**: ⚠️ Medium  
**預估時間**: 1 天  
**依賴**: 無

**修正步驟**:
1. 建立活躍度系統配置 API
2. 建立勳章系統配置 API
3. 建立配置管理 UI

---

### 3.3 實作區域統計功能

**優先級**: ⚠️ Medium  
**預估時間**: 1 天  
**依賴**: 1.1 完成（需要 business_region 欄位）

**修正步驟**:
1. 建立區域統計 API
2. 建立區域統計對比 UI
3. 整合到管理員儀表板

---

## 📝 階段 4：Low 問題修正（優化項目）

### 4.1 前端性能優化

**優先級**: 📝 Low  
**預估時間**: 1-2 天  
**依賴**: 核心功能完成

**修正步驟**:
1. 實作虛擬化長列表（react-window）
2. 實作圖片懶加載
3. 優化查詢效能

---

## 📊 執行時間表

### 第 1 週（Critical 修正）
- Day 1: 1.1 + 1.2（members 表 + 註冊 API）
- Day 2: 1.3（註冊頁面 UI）
- Day 3: 1.4 + 1.5 開始（debt_records 驗證 + 債務 API）
- Day 4: 1.5 完成（債務 API）

### 第 2 週（High 修正）
- Day 5: 2.1 + 2.3（遮罩函數 + 按讚表）
- Day 6: 2.2（會員互動 API）
- Day 7: 2.4（會員資訊卡組件）

### 第 3 週（Medium 修正，可選）
- Day 8-10: 3.1 + 3.2 + 3.3（修改申請、配置 API、區域統計）

### 第 4 週（Low 修正，可選）
- Day 11-12: 4.1（性能優化）

---

## 🎯 優先級建議

### 立即執行（本週內）
1. ✅ 1.1 - 修正 members 表結構
2. ✅ 1.2 - 修正註冊 API
3. ✅ 1.3 - 修正註冊頁面 UI

### 盡快執行（下週內）
4. ✅ 1.4 - 驗證 debt_records 表
5. ✅ 1.5 - 實作債務管理 API
6. ✅ 2.1 - 實作資料遮罩函數

### 可延後執行（2-3 週內）
7. ⏳ 2.2 - 建立會員互動 API
8. ⏳ 2.3 - 建立按讚資料表
9. ⏳ 2.4 - 建立會員資訊卡組件

### 視情況執行（1 個月內）
10. ⏳ 3.1 - 建立修改申請表
11. ⏳ 3.2 - 實作管理員配置 API
12. ⏳ 3.3 - 實作區域統計功能
13. ⏳ 4.1 - 前端性能優化

---

## 📋 檢查清單

### Critical 修正完成檢查
- [ ] members 表包含所有必要欄位
- [ ] 註冊 API 收集所有必要資訊
- [ ] 註冊頁面顯示所有必要欄位
- [ ] debt_records 表結構完整
- [ ] 債務管理 API 基礎功能可用

### High 修正完成檢查
- [ ] 資料遮罩函數正常運作
- [ ] 按讚功能可用
- [ ] 會員資訊卡顯示正常

### Medium 修正完成檢查
- [ ] 修改申請功能可用
- [ ] 管理員可配置系統
- [ ] 區域統計顯示正常

### Low 修正完成檢查
- [ ] 長列表效能良好
- [ ] 圖片載入優化

---

## 🚨 風險評估

### 高風險項目
1. **修改 members 表主鍵**：可能影響外鍵關聯，需要謹慎評估
2. **資料遷移**：現有會員資料需要補充 nickname 等欄位

### 中風險項目
1. **API 向後相容性**：新增欄位可能影響現有前端
2. **效能影響**：新增欄位和約束可能影響查詢效能

### 低風險項目
1. **UI 修改**：主要是新增欄位，不影響現有功能
2. **新功能實作**：獨立模組，不影響現有功能

---

## 📞 需要確認的問題

1. **members 表主鍵**：是否需要將主鍵從 `user_id` 改為 `id`？
2. **user_roles ENUM**：是否需要保留 `'admin'` 角色？
3. **現有會員資料**：如何處理已註冊但缺少 nickname 等欄位的會員？
4. **business_type 欄位**：是否需要預設選項，還是自由輸入？
5. **修改申請功能**：是否需要在第一階段實作，還是可以延後？

---

## 📝 總結

### 關鍵修正項目
1. 🔴 **members 表結構**：新增 11 個欄位
2. 🔴 **註冊功能**：新增 4 個必要欄位
3. 🔴 **債務管理**：實作核心 API
4. 🟡 **資料保護**：實作遮罩函數
5. 🟡 **社交功能**：實作按讚功能

### 預估總時間
- **Critical**: 3-4 天
- **High**: 2-3 天
- **Medium**: 2-3 天（可選）
- **Low**: 1-2 天（可選）
- **總計**: 8-12 天（核心功能）

### 建議執行順序
1. 先完成 Critical 修正（1.1-1.5）
2. 再完成 High 修正（2.1-2.4）
3. 視情況決定是否執行 Medium 和 Low 修正

詳細的差異分析請參考：`OTE/DESIGN_IMPLEMENTATION_GAP_REPORT.md`

