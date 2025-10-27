# React Hooks 依賴項警告修復計畫

## 需要修復的文件列表

### 1. 管理員頁面（7 個）
- [x] src/app/admin/activity-rules/page.tsx - fetchRules
- [ ] src/app/admin/audit-logs/page.tsx - fetchLogs
- [ ] src/app/admin/debts/page.tsx - fetchRecords
- [ ] src/app/admin/debts/[id]/page.tsx - fetchDebtDetail
- [ ] src/app/admin/level-config/page.tsx - fetchLevels
- [ ] src/app/admin/members/page.tsx - fetchMembers
- [ ] src/app/admin/members/[id]/page.tsx - fetchMemberDetail

### 2. 管理員訊息頁面（1 個）
- [ ] src/app/admin/messages/inbox/page.tsx - fetchMessages

### 3. 用戶頁面（8 個）
- [ ] src/app/dashboard/page.tsx - fetchData
- [ ] src/app/debts/my-debtors/page.tsx - checkUserStatus, fetchRecords
- [ ] src/app/debts/search/page.tsx - checkUserStatus
- [ ] src/app/debts/upload/page.tsx - checkUserStatus
- [ ] src/app/messages/inbox/page.tsx - fetchMessages
- [ ] src/app/messages/page.tsx - fetchMessages
- [ ] src/app/messages/[id]/page.tsx - fetchMessage
- [ ] src/app/profile/page.tsx - fetchProfile

### 4. 組件（2 個）
- [ ] src/components/badges/BadgeDetailModal.tsx - fetchBadges
- [ ] src/contexts/NotificationContext.tsx - closeNotification

## 修復方法

使用 `useCallback` 包裝異步函數，並將其添加到 useEffect 的依賴數組中。

### 模式：
```typescript
// 之前
useEffect(() => {
  fetchData()
}, [])

const fetchData = async () => { ... }

// 之後
const fetchData = useCallback(async () => { ... }, [dependencies])

useEffect(() => {
  fetchData()
}, [fetchData])
```

## 進度
- 已完成：1/20
- 待完成：19/20

