# 階段 G.3：等級升級觸發（前端整合）- 實作計畫

**版本**：v1.0  
**日期**：2025-10-14  
**預估時間**：1 天（8 小時）

---

## 📋 任務概覽

### 主要目標
建立前端升級通知系統，讓使用者在升級時能看到精美的動畫和提示。

### 已完成的工作（階段 G.2）
- ✅ 後端等級計算邏輯（calculate_member_level 函數）
- ✅ 自動升級觸發（在 add-points API 中）
- ✅ 升級資訊返回（level_up 物件）

### 待完成的工作（階段 G.3）
- ⏳ 建立升級通知組件（LevelUpNotification）
- ⏳ 建立勳章解鎖通知組件（BadgeUnlockNotification）
- ⏳ 整合到前端頁面
- ⏳ 實作動畫效果
- ⏳ 測試通知顯示

---

## 🎯 詳細任務

### 任務 1：建立升級通知組件（2 小時）

#### 1.1 建立 LevelUpNotification 組件
- **檔案**：`src/components/notifications/LevelUpNotification.tsx`
- **功能**：
  - 顯示升級動畫
  - 顯示新等級和稱號
  - 顯示配額獎勵
  - 自動關閉（5 秒後）
  - 支援手動關閉

#### 1.2 設計規格
- **視覺效果**：
  - 從螢幕中央彈出
  - 漸變背景（根據新等級顏色）
  - 光暈效果
  - 星星動畫
  - 平滑的進入/退出動畫

- **內容**：
  ```
  🎉 恭喜升級！
  
  LV1 初入江湖 → LV2 嶄露頭角
  
  獲得獎勵：
  • 每日上傳配額 +1
  • 每日查詢配額 +2
  
  [關閉]
  ```

#### 1.3 技術實作
- 使用 Tailwind CSS 動畫
- 使用 Framer Motion（如果需要更複雜的動畫）
- 使用 React Portal 渲染到 body
- 使用 Context API 管理通知狀態

---

### 任務 2：建立勳章解鎖通知組件（2 小時）

#### 2.1 建立 BadgeUnlockNotification 組件
- **檔案**：`src/components/notifications/BadgeUnlockNotification.tsx`
- **功能**：
  - 顯示解鎖動畫
  - 顯示勳章圖示和名稱
  - 顯示勳章描述
  - 支援多個勳章同時解鎖
  - 自動關閉（5 秒後）
  - 支援手動關閉

#### 2.2 設計規格
- **視覺效果**：
  - 從螢幕右上角滑入
  - 勳章圖示旋轉進入
  - 光暈效果
  - 根據勳章難度顯示不同顏色

- **內容**：
  ```
  🏅 解鎖新勳章！
  
  [勳章圖示] 首次上傳
  
  上傳第一筆債務資料
  
  [關閉]
  ```

---

### 任務 3：建立通知管理系統（1.5 小時）

#### 3.1 建立 NotificationContext
- **檔案**：`src/contexts/NotificationContext.tsx`
- **功能**：
  - 管理所有通知的狀態
  - 提供顯示通知的方法
  - 提供關閉通知的方法
  - 支援通知佇列

#### 3.2 建立 NotificationProvider
- **檔案**：`src/providers/NotificationProvider.tsx`
- **功能**：
  - 包裝整個應用
  - 渲染通知組件
  - 管理通知生命週期

---

### 任務 4：整合到現有頁面（1.5 小時）

#### 4.1 整合到上傳頁面
- **檔案**：`src/app/(member)/upload/page.tsx`
- **修改**：
  - 上傳成功後檢查 API 回應中的 level_up 和 new_badges
  - 如果有升級，顯示升級通知
  - 如果有新勳章，顯示勳章通知

#### 4.2 整合到查詢頁面
- **檔案**：`src/app/(member)/search/page.tsx`
- **修改**：
  - 查詢成功後檢查 API 回應中的 level_up 和 new_badges
  - 如果有升級，顯示升級通知
  - 如果有新勳章，顯示勳章通知

#### 4.3 整合到登入頁面
- **檔案**：`src/app/login/page.tsx`
- **修改**：
  - 登入成功後檢查是否有升級或新勳章
  - 顯示相應的通知

---

### 任務 5：實作動畫效果（1.5 小時）

#### 5.1 升級動畫
- 彈出動畫（scale + opacity）
- 星星飛散動畫
- 文字漸變動畫
- 退出動畫

#### 5.2 勳章解鎖動畫
- 滑入動畫（translateX + opacity）
- 勳章旋轉動畫
- 光暈脈動動畫
- 退出動畫

#### 5.3 CSS 動畫定義
- **檔案**：`src/styles/animations.css`
- **內容**：
  - @keyframes 定義
  - 動畫類別
  - 過渡效果

---

### 任務 6：測試與優化（1.5 小時）

#### 6.1 功能測試
- ✅ 升級通知正確顯示
- ✅ 勳章通知正確顯示
- ✅ 多個通知同時顯示
- ✅ 自動關閉功能
- ✅ 手動關閉功能
- ✅ 動畫流暢

#### 6.2 視覺測試
- ✅ 在不同螢幕尺寸下顯示正常
- ✅ 在不同瀏覽器下顯示正常
- ✅ 動畫效果符合設計
- ✅ 顏色和字體正確

#### 6.3 效能測試
- ✅ 動畫不卡頓
- ✅ 記憶體使用正常
- ✅ 不影響其他功能

---

## 📁 檔案結構

```
src/
├── components/
│   └── notifications/
│       ├── LevelUpNotification.tsx          # 升級通知組件
│       ├── BadgeUnlockNotification.tsx      # 勳章解鎖通知組件
│       └── NotificationContainer.tsx        # 通知容器組件
├── contexts/
│   └── NotificationContext.tsx              # 通知 Context
├── providers/
│   └── NotificationProvider.tsx             # 通知 Provider
├── hooks/
│   └── useNotification.ts                   # 通知 Hook
├── styles/
│   └── animations.css                       # 動畫樣式
└── types/
    └── notification.ts                      # 通知類型定義
```

---

## 🎨 設計規格

### 升級通知設計

```tsx
// 視覺效果
┌─────────────────────────────────────┐
│                                     │
│         🎉 恭喜升級！               │
│                                     │
│   LV1 初入江湖 → LV2 嶄露頭角      │
│                                     │
│         獲得獎勵：                  │
│   • 每日上傳配額 +1                │
│   • 每日查詢配額 +2                │
│                                     │
│              [關閉]                 │
│                                     │
└─────────────────────────────────────┘
```

### 勳章解鎖通知設計

```tsx
// 視覺效果（右上角）
┌─────────────────────────┐
│ 🏅 解鎖新勳章！         │
│                         │
│  [圖示] 首次上傳        │
│                         │
│  上傳第一筆債務資料     │
│                         │
│              [關閉]     │
└─────────────────────────┘
```

---

## 🔄 實作順序

### 第 1 步：建立基礎組件（2 小時）
1. 建立 NotificationContext
2. 建立 NotificationProvider
3. 建立 useNotification Hook
4. 建立 NotificationContainer

### 第 2 步：建立通知組件（2 小時）
1. 建立 LevelUpNotification
2. 建立 BadgeUnlockNotification
3. 實作基本樣式

### 第 3 步：實作動畫（1.5 小時）
1. 建立 animations.css
2. 實作升級動畫
3. 實作勳章動畫

### 第 4 步：整合到頁面（1.5 小時）
1. 整合到 _app.tsx（包裝 NotificationProvider）
2. 整合到上傳頁面
3. 整合到查詢頁面
4. 整合到登入頁面

### 第 5 步：測試與優化（1.5 小時）
1. 功能測試
2. 視覺測試
3. 效能測試
4. Bug 修正

---

## 📝 技術細節

### 通知狀態管理

```typescript
interface Notification {
  id: string
  type: 'level_up' | 'badge_unlock'
  data: LevelUpData | BadgeUnlockData
  duration?: number
  onClose?: () => void
}

interface NotificationContextValue {
  notifications: Notification[]
  showLevelUp: (data: LevelUpData) => void
  showBadgeUnlock: (data: BadgeUnlockData) => void
  closeNotification: (id: string) => void
}
```

### 動畫配置

```typescript
const levelUpAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
}

const badgeUnlockAnimation = {
  initial: { x: 400, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 400, opacity: 0 },
  transition: { duration: 0.3, ease: 'easeOut' }
}
```

---

## ⏱️ 時間分配

| 任務 | 預估時間 | 優先級 |
|------|---------|--------|
| 建立基礎組件 | 2 小時 | 高 |
| 建立通知組件 | 2 小時 | 高 |
| 實作動畫效果 | 1.5 小時 | 中 |
| 整合到頁面 | 1.5 小時 | 高 |
| 測試與優化 | 1.5 小時 | 高 |
| **總計** | **8.5 小時** | - |

---

## 🚀 準備開始

**確認清單**：
- ✅ 階段 G.2 已完成並通過測試
- ✅ 後端 API 正常運作
- ✅ 前端專案結構了解
- ✅ 設計規格確認

**下一步**：開始實作！

---

**文件結束**

