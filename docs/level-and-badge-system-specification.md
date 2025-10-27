# 臻好尋債務平台 - 等級與勳章系統詳細規格報告

**版本**：v1.0  
**日期**：2025-01-14  
**專案**：臻好尋債務查詢系統  
**文件類型**：技術規格文件

---

## 目錄

1. [活躍度點數系統](#1-活躍度點數系統)
2. [等級升級系統（LV1-LV30）](#2-等級升級系統lv1-lv30)
3. [勳章系統](#3-勳章系統)
4. [勳章視覺設計規範](#4-勳章視覺設計規範)
5. [資料庫設計](#5-資料庫設計)
6. [管理員後台配置功能](#6-管理員後台配置功能)
7. [實作優先順序](#7-實作優先順序)

---

## 1. 活躍度點數系統

### 1.1 點數獲得方式

| 行為 | 獲得點數 | 每日上限 | 說明 |
|------|---------|---------|------|
| 上傳債務資料 | +2 點 | 20 點（10 次） | 核心貢獻行為，受每日上傳配額限制 |
| 查詢債務資料 | +1 點 | 20 點（20 次） | 基礎使用行為，受每日查詢配額限制 |
| 收到讚 | +3 點 | 無上限 | 社群認可，鼓勵上傳高品質資料 |
| 給出讚 | +1 點 | 5 點（5 次） | 社群互動，防止濫用 |
| 每日登入 | +3 點 | 3 點（1 次） | 活躍度獎勵，每日首次登入觸發 |

### 1.2 點數計算規則

#### 1.2.1 基本規則
- 所有點數即時計算並記錄到 `activity_point_history` 表
- 會員的總活躍度點數存儲在 `member_statistics.activity_points`
- 點數只增不減，即使刪除上傳的資料也不會扣除點數

#### 1.2.2 每日上限規則
- 每日上限在每天 00:00 (UTC+8) 重置
- 達到每日上限後，該行為仍可執行但不再獲得點數
- 系統會顯示提示訊息：「今日該行為已達點數上限」

#### 1.2.3 特殊規則
- **上傳債務資料**：只有成功上傳且通過驗證的資料才計算點數
- **查詢債務資料**：只有成功查詢到結果才計算點數（空結果不計分）
- **收到讚**：同一會員對同一筆資料只能按讚一次
- **給出讚**：不能對自己上傳的資料按讚
- **每日登入**：每日首次呼叫 `/api/auth/me` 時觸發

#### 1.2.4 防濫用機制 取消該功能 沒實際作用
- 短時間內重複相同操作會觸發冷卻時間（例如：1 分鐘內只能查詢 5 次）
- 異常行為（例如：機器人刷點）會被系統標記並暫停點數獲得
- 管理員可以手動調整會員的活躍度點數 (你這設計可以不用我就有上限害怕你刷嗎?)

### 1.3 每日平均點數估算

**保守估算**（一般使用者）：
- 每日登入：+3 點
- 上傳 2 筆資料：+4 點
- 查詢 5 筆資料：+5 點
- 給出 2 個讚：+2 點
- 收到 1 個讚：+5 點
- **每日平均**：約 19 點

**積極估算**（活躍使用者）：
- 每日登入：+3 點
- 上傳 10 筆資料（達上限）：+20 點
- 查詢 20 筆資料（達上限）：+20 點
- 給出 10 個讚（達上限）：+10 點
- 收到 5 個讚：+25 點
- **每日平均**：約 78 點

**混合估算**（一般活躍使用者）：
- 每日登入：+3 點
- 上傳 5 筆資料：+10 點
- 查詢 10 筆資料：+10 點
- 給出 5 個讚：+5 點
- 收到 2 個讚：+10 點
- **每日平均**：約 38 點

---

## 2. 等級升級系統（LV1-LV30）

### 2.1 完整等級升級表（第 1 部分：LV1-LV15）

| 等級 | 所需累計點數 | 本級所需點數 | 統一稱號 | 顏色代碼 | 視覺效果 | 上傳配額獎勵 | 查詢配額獎勵 |
|------|-------------|-------------|---------|---------|---------|-------------|-------------|
| LV1 | 0 | 0 | 初入江湖 | #9CA3AF | 無特效 | - | - |
| LV2 | 150 | 150 | 嶄露頭角 | #10B981 | 無特效 | - | - |
| LV3 | 360 | 210 | 小有名氣 | #3B82F6 | 淡藍光暈 | - | - |
| LV4 | 660 | 300 | 業界新秀 | #8B5CF6 | 淡紫光暈 | - | - |
| LV5 | 1050 | 390 | 經驗老手 | #F59E0B | 金色光暈 | +1 | +2 |
| LV6 | 1560 | 510 | 資深專家 | #EF4444 | 紅色光暈 | - | - |
| LV7 | 2190 | 630 | 業界精英 | #EC4899 | 粉紅光暈 | - | - |
| LV8 | 2940 | 750 | 行業翹楚 | #06B6D4 | 青色光暈 | -| - |
| LV9 | 3840 | 900 | 名震一方 | #FBBF24 | 金色脈動 | - | - |
| LV10 | 4890 | 1050 | 江湖名宿 | #A855F7 | 紫色脈動 | +1 | +2 |
| LV11 | 6150 | 1260 | 業界宗師 | #14B8A6 | 青綠脈動 | - | - |
| LV12 | 7650 | 1500 | 德高望重 | #F97316 | 橙色脈動 | - | - |
| LV13 | 9420 | 1770 | 一代宗師 | #8B5CF6 | 紫色光環 | - | - |
| LV14 | 11490 | 2070 | 行業泰斗 | #10B981 | 綠色光環 | - | - |
| LV15 | 13890 | 2400 | 業界傳奇 | #EF4444 | 紅色光環 | +1 | +2 |

### 2.2 完整等級升級表（第 2 部分：LV16-LV30）

| 等級 | 所需累計點數 | 本級所需點數 | 統一稱號 | 顏色代碼 | 視覺效果 | 上傳配額獎勵 | 查詢配額獎勵 |
|------|-------------|-------------|---------|---------|---------|-------------|-------------|
| LV16 | 16650 | 2760 | 名揚四海 | #3B82F6 | 藍色光環 | - | - |
| LV17 | 19800 | 3150 | 威震八方 | #FBBF24 | 金色光環 | - | - |
| LV18 | 23370 | 3570 | 舉世聞名 | #EC4899 | 粉紅光環 | - | - |
| LV19 | 27390 | 4020 | 無人不曉 | #06B6D4 | 青色光環 | - | - |
| LV20 | 31890 | 4500 | 業界神話 | #A855F7 | 紫色星光 | +2 | +3 |
| LV21 | 36900 | 5010 | 傳奇人物 | #F59E0B | 金色星光 | - | - |
| LV22 | 42450 | 5550 | 不朽傳說 | #EF4444 | 紅色星光 | - | - |
| LV23 | 48570 | 6120 | 曠世奇才 | #10B981 | 綠色星光 | - | - |
| LV24 | 55290 | 6720 | 絕代風華 | #3B82F6 | 藍色星光 | - | - |
| LV25 | 62640 | 7350 | 蓋世無雙 | #8B5CF6 | 紫色彩虹 | +2 | +3 |
| LV26 | 70650 | 8010 | 舉世無雙 | #FBBF24 | 金色彩虹 | - | - |
| LV27 | 79350 | 8700 | 天下無敵 | #EC4899 | 粉紅彩虹 | - | - |
| LV28 | 88770 | 9420 | 登峰造極 | #06B6D4 | 青色彩虹 | +2 | +3 |
| LV29 | 98940 | 10170 | 至尊無上 | #EF4444 | 紅色彩虹 | +2 | +4 |
| LV30 | 109920 | 10980 | 萬古流芳 | #FFD700 | 金色彩虹脈動 | +4 | +8 |

### 2.3 升級獎勵總計

| 項目 | 數值 | 說明 |
|------|------|------|
| **總上傳配額獎勵** | +15 次/日 | 分散在 LV5, 10, 15, 20, 25, 28, 29, 30 |
| **總查詢配額獎勵** | +30 次/日 | 分散在 LV5, 10, 15, 20, 25, 28, 29, 30 |
| **LV30 每日配額** | 上傳 25 次、查詢 50 次 | 基礎配額（上傳 10、查詢 20）+ 獎勵 |

### 2.4 升級時間估算

#### 2.4.1 基於保守估算（每日 19 點）

| 等級 | 所需累計點數 | 所需天數 | 所需時間 |
|------|-------------|---------|---------|
| LV5 | 1,050 | 55 天 | 約 1.8 個月 |
| LV10 | 4,890 | 257 天 | 約 8.6 個月 |
| LV15 | 13,890 | 731 天 | 約 2.0 年 |
| LV20 | 31,890 | 1,678 天 | 約 4.6 年 |
| LV25 | 62,640 | 3,297 天 | 約 9.0 年 |
| LV30 | 109,920 | 5,785 天 | 約 15.8 年 |

#### 2.4.2 基於積極估算（每日 78 點）

| 等級 | 所需累計點數 | 所需天數 | 所需時間 |
|------|-------------|---------|---------|
| LV5 | 1,050 | 13 天 | 約 0.4 個月 |
| LV10 | 4,890 | 63 天 | 約 2.1 個月 |
| LV15 | 13,890 | 178 天 | 約 5.9 個月 |
| LV20 | 31,890 | 409 天 | 約 1.1 年 |
| LV25 | 62,640 | 803 天 | 約 2.2 年 |
| LV30 | 109,920 | 1,409 天 | 約 3.9 年 |

#### 2.4.3 基於混合估算（每日 38 點，介於保守與積極之間）

| 等級 | 所需累計點數 | 所需天數 | 所需時間 |
|------|-------------|---------|---------|
| LV5 | 1,050 | 28 天 | 約 0.9 個月 |
| LV10 | 4,890 | 129 天 | 約 4.3 個月 |
| LV15 | 13,890 | 366 天 | 約 1.0 年 |
| LV20 | 31,890 | 839 天 | 約 2.3 年 |
| LV25 | 62,640 | 1,648 天 | 約 4.5 年 |
| **LV30** | **109,920** | **2,893 天** | **約 7.9 年** |

**結論**：基於混合估算，一般活躍使用者需要約 **7.9 年**才能達到 LV30，符合「長期目標」的設計理念。

---

## 3. 勳章系統

### 3.1 簡單勳章（5 種）

| 勳章名稱 | 圖示 | 描述 | 獲得條件 | 難度 | 隱藏 |
|---------|------|------|---------|------|------|
| 🎯 首次上傳 | Trophy | 完成第一次債務資料上傳 | 上傳債務資料 ≥ 1 筆 | 簡單 | 否 |
| 🔍 首次查詢 | Search | 完成第一次債務資料查詢 | 查詢債務資料 ≥ 1 次 | 簡單 | 否 |
| 👍 首次按讚 | ThumbsUp | 給出第一個讚 | 給出讚 ≥ 1 次 | 簡單 | 否 |
| ⭐ 首次被讚 | Star | 收到第一個讚 | 收到讚 ≥ 1 次 | 簡單 | 否 |
| 📅 連續登入 7 天 | Calendar | 連續登入 7 天 | 連續登入天數 ≥ 7 天 | 簡單 | 否 |

### 3.2 中等勳章（7 種）

| 勳章名稱 | 圖示 | 描述 | 獲得條件 | 難度 | 隱藏 |
|---------|------|------|---------|------|------|
| 📊 資料新手 | BarChart | 累計上傳 10 筆債務資料 | 上傳債務資料 ≥ 10 筆 | 中等 | 否 |
| 🔎 查詢能手 | Binoculars | 累計查詢 50 次債務資料 | 查詢債務資料 ≥ 50 次 | 中等 | 否 |
| 💯 百讚達成 | Award | 累計收到 100 個讚 | 收到讚 ≥ 100 次 | 中等 | 否 |
| 📅 連續登入 30 天 | CalendarCheck | 連續登入 30 天 | 連續登入天數 ≥ 30 天 | 中等 | 否 |
| 🎖️ 活躍會員 | Medal | 累計獲得 1,000 活躍度點數 | 活躍度點數 ≥ 1,000 | 中等 | 否 |
| 🌟 人氣王 | Sparkles | 單筆資料收到 20 個讚 | 單筆資料收到讚 ≥ 20 次 | 中等 | 否 |
| 🏆 等級達人 | Trophy | 達到 LV10 | 會員等級 ≥ 10 | 中等 | 否 |

### 3.3 困難勳章（7 種）

| 勳章名稱 | 圖示 | 描述 | 獲得條件 | 難度 | 隱藏 |
|---------|------|------|---------|------|------|
| 📊 資料達人 | TrendingUp | 累計上傳 100 筆債務資料 | 上傳債務資料 ≥ 100 筆 | 困難 | 否 |
| 🔍 查詢專家 | Target | 累計查詢 500 次債務資料 | 查詢債務資料 ≥ 500 次 | 困難 | 否 |
| 💎 千讚成就 | Gem | 累計收到 1,000 個讚 | 收到讚 ≥ 1,000 次 | 困難 | 否 |
| 📅 連續登入 100 天 | CalendarDays | 連續登入 100 天 | 連續登入天數 ≥ 100 天 | 困難 | 否 |
| 🎯 活躍之星 | Zap | 累計獲得 10,000 活躍度點數 | 活躍度點數 ≥ 10,000 | 困難 | 否 |
| 👑 等級大師 | Crown | 達到 LV20 | 會員等級 ≥ 20 | 困難 | 否 |
| 🌈 全能選手 | Rainbow | 同時擁有 10 個不同勳章 | 擁有勳章數量 ≥ 10 | 困難 | 否 |

### 3.4 極難勳章（7 種）

| 勳章名稱 | 圖示 | 描述 | 獲得條件 | 難度 | 隱藏 |
|---------|------|------|---------|------|------|
| 📊 資料宗師 | Database | 累計上傳 500 筆債務資料 | 上傳債務資料 ≥ 500 筆 | 極難 | 否 |
| 🔍 查詢傳奇 | Crosshair | 累計查詢 2,000 次債務資料 | 查詢債務資料 ≥ 2,000 次 | 極難 | 否 |
| 💫 萬讚榮耀 | Sparkle | 累計收到 10,000 個讚 | 收到讚 ≥ 10,000 次 | 極難 | 否 |
| 📅 連續登入 365 天 | CalendarHeart | 連續登入 365 天（一整年） | 連續登入天數 ≥ 365 天 | 極難 | 否 |
| ⚡ 活躍傳說 | Bolt | 累計獲得 50,000 活躍度點數 | 活躍度點數 ≥ 50,000 | 極難 | 否 |
| 👑 至尊王者 | Crown | 達到 LV30（滿級） | 會員等級 = 30 | 極難 | 否 |
| 🏅 完美收藏家 | Award | 收集所有非隱藏勳章 | 擁有所有非隱藏勳章 | 極難 | 否 |

### 3.5 特殊/隱藏勳章（3 種）

| 勳章名稱 | 圖示 | 描述 | 獲得條件 | 難度 | 隱藏 |
|---------|------|------|---------|------|------|
| 🎂 週年慶 | Cake | 註冊滿一週年 | 註冊天數 ≥ 365 天 | 中等 | 是 |
| 🌙 夜貓子 | Moon | 在凌晨 2-4 點登入 10 次 | 凌晨登入次數 ≥ 10 次 | 中等 | 是 |
| 🎁 幸運兒 | Gift | 在特定活動期間登入 | 活動期間登入 | 簡單 | 是 |

---

## 4. 勳章視覺設計規範

### 4.1 勳章結構

```
┌─────────────────────────────┐
│   外框（邊框 + 光暈）         │
│  ┌─────────────────────┐    │
│  │   背景（漸層色彩）    │    │
│  │  ┌───────────────┐   │    │
│  │  │  SVG 圖示      │   │    │
│  │  │  (Lucide Icons)│   │    │
│  │  └───────────────┘   │    │
│  │   勳章名稱           │    │
│  │   難度標記（星級）    │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

### 4.2 難度等級視覺規範

| 難度 | 外框顏色 | 背景漸層 | 光暈效果 | 動畫效果 | 星級標記 |
|------|---------|---------|---------|---------|---------|
| **簡單** | #9CA3AF（灰色） | linear-gradient(135deg, #E5E7EB, #9CA3AF) | 無光暈 | Hover 縮放 1.05 | ⭐ |
| **中等** | #3B82F6（藍色） | linear-gradient(135deg, #60A5FA, #3B82F6) | 淡藍光暈（blur: 8px） | Hover 縮放 1.1 + 旋轉 5deg | ⭐⭐ |
| **困難** | #A855F7（紫色） | linear-gradient(135deg, #C084FC, #A855F7) | 紫色光暈 + 脈動（blur: 12px） | Hover 縮放 1.15 + 光暈擴散 | ⭐⭐⭐ |
| **極難** | #FFD700（金色） | linear-gradient(135deg, #FDE047, #FFD700, #F59E0B) | 金色光暈 + 彩虹脈動（blur: 16px） | Hover 縮放 1.2 + 旋轉 10deg + 彩虹光暈 | ⭐⭐⭐⭐ |

### 4.3 CSS 樣式範例

#### 4.3.1 簡單勳章
```css
.badge-easy {
  border: 2px solid #9CA3AF;
  background: linear-gradient(135deg, #E5E7EB, #9CA3AF);
  box-shadow: none;
  transition: transform 0.3s ease;
}

.badge-easy:hover {
  transform: scale(1.05);
}
```

#### 4.3.2 中等勳章
```css
.badge-medium {
  border: 2px solid #3B82F6;
  background: linear-gradient(135deg, #60A5FA, #3B82F6);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
  transition: all 0.3s ease;
}

.badge-medium:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.8);
}
```

#### 4.3.3 困難勳章
```css
.badge-hard {
  border: 2px solid #A855F7;
  background: linear-gradient(135deg, #C084FC, #A855F7);
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
  animation: pulse-glow 2s ease-in-out infinite;
  transition: all 0.3s ease;
}

.badge-hard:hover {
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(168, 85, 247, 1);
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 12px rgba(168, 85, 247, 0.6); }
  50% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.9); }
}
```

#### 4.3.4 極難勳章
```css
.badge-extreme {
  border: 2px solid #FFD700;
  background: linear-gradient(135deg, #FDE047, #FFD700, #F59E0B);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.8);
  animation: rainbow-pulse 3s ease-in-out infinite;
  transition: all 0.3s ease;
}

.badge-extreme:hover {
  transform: scale(1.2) rotate(10deg);
  box-shadow: 0 0 30px rgba(255, 215, 0, 1),
              0 0 40px rgba(255, 105, 180, 0.5),
              0 0 50px rgba(138, 43, 226, 0.3);
}

@keyframes rainbow-pulse {
  0%, 100% {
    box-shadow: 0 0 16px rgba(255, 215, 0, 0.8);
  }
  33% {
    box-shadow: 0 0 20px rgba(255, 105, 180, 0.8);
  }
  66% {
    box-shadow: 0 0 20px rgba(138, 43, 226, 0.8);
  }
}
```

### 4.4 圖示庫

使用 **Lucide Icons**（https://lucide.dev/）

常用圖示對應：
- Trophy: 獎盃
- Search: 搜尋
- ThumbsUp: 按讚
- Star: 星星
- Calendar: 日曆
- BarChart: 長條圖
- Award: 獎章
- Crown: 皇冠
- Zap: 閃電
- Sparkles: 星光
- Database: 資料庫
- Target: 目標
- Gem: 寶石
- Rainbow: 彩虹
- Bolt: 閃電
- Cake: 蛋糕
- Moon: 月亮
- Gift: 禮物

---

## 5. 資料庫設計

### 5.1 member_statistics 表（需新增欄位）

```sql
-- 新增等級系統相關欄位
ALTER TABLE member_statistics
ADD COLUMN activity_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN activity_level INTEGER DEFAULT 1 NOT NULL CHECK (activity_level >= 1 AND activity_level <= 30),
ADD COLUMN title VARCHAR(100) DEFAULT '初入江湖' NOT NULL,
ADD COLUMN title_color VARCHAR(7) DEFAULT '#9CA3AF' NOT NULL,
ADD COLUMN total_upload_quota_bonus INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN total_query_quota_bonus INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN consecutive_login_days INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN last_login_date DATE,
ADD COLUMN level_updated_at TIMESTAMPTZ;

-- 新增索引
CREATE INDEX idx_member_statistics_activity_points ON member_statistics(activity_points DESC);
CREATE INDEX idx_member_statistics_activity_level ON member_statistics(activity_level DESC);
```

**欄位說明**：

| 欄位名稱 | 資料型別 | 預設值 | 說明 |
|---------|---------|--------|------|
| activity_points | INTEGER | 0 | 累計活躍度點數 |
| activity_level | INTEGER | 1 | 當前等級（1-30） |
| title | VARCHAR(100) | '初入江湖' | 當前稱號 |
| title_color | VARCHAR(7) | '#9CA3AF' | 稱號顏色（HEX） |
| total_upload_quota_bonus | INTEGER | 0 | 累計上傳配額獎勵 |
| total_query_quota_bonus | INTEGER | 0 | 累計查詢配額獎勵 |
| consecutive_login_days | INTEGER | 0 | 連續登入天數 |
| last_login_date | DATE | NULL | 最後登入日期 |
| level_updated_at | TIMESTAMPTZ | NULL | 等級更新時間 |

---

### 5.2 level_config 表（等級配置表）

```sql
CREATE TABLE level_config (
  level INTEGER PRIMARY KEY CHECK (level >= 1 AND level <= 100),
  required_points INTEGER NOT NULL CHECK (required_points >= 0),
  title VARCHAR(100) NOT NULL,
  title_color VARCHAR(7) NOT NULL,
  visual_effect VARCHAR(100),
  bonus_upload_quota INTEGER DEFAULT 0 CHECK (bonus_upload_quota >= 0),
  bonus_query_quota INTEGER DEFAULT 0 CHECK (bonus_query_quota >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX idx_level_config_required_points ON level_config(required_points);
CREATE INDEX idx_level_config_is_active ON level_config(is_active);

-- 新增註解
COMMENT ON TABLE level_config IS '等級配置表：定義每個等級的升級條件和獎勵';
COMMENT ON COLUMN level_config.level IS '等級（1-100）';
COMMENT ON COLUMN level_config.required_points IS '升級所需累計活躍度點數';
COMMENT ON COLUMN level_config.title IS '等級稱號';
COMMENT ON COLUMN level_config.title_color IS '稱號顏色（HEX 格式）';
COMMENT ON COLUMN level_config.visual_effect IS '視覺效果描述';
COMMENT ON COLUMN level_config.bonus_upload_quota IS '上傳配額獎勵（每日）';
COMMENT ON COLUMN level_config.bonus_query_quota IS '查詢配額獎勵（每日）';
COMMENT ON COLUMN level_config.is_active IS '是否啟用';
```

---

### 5.3 badge_config 表（勳章配置表）

```sql
CREATE TABLE badge_config (
  badge_key VARCHAR(50) PRIMARY KEY,
  badge_name VARCHAR(100) NOT NULL,
  icon_type VARCHAR(20) DEFAULT 'svg' CHECK (icon_type IN ('svg', 'emoji', 'image')),
  icon_name VARCHAR(100),
  icon_color VARCHAR(7),
  background_gradient TEXT,
  border_color VARCHAR(7),
  glow_effect TEXT,
  animation_effect VARCHAR(50),
  description TEXT,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  unlock_condition JSONB NOT NULL,
  is_hidden BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX idx_badge_config_difficulty ON badge_config(difficulty);
CREATE INDEX idx_badge_config_is_hidden ON badge_config(is_hidden);
CREATE INDEX idx_badge_config_is_active ON badge_config(is_active);
CREATE INDEX idx_badge_config_display_order ON badge_config(display_order);

-- 新增註解
COMMENT ON TABLE badge_config IS '勳章配置表：定義所有勳章的屬性和解鎖條件';
COMMENT ON COLUMN badge_config.badge_key IS '勳章唯一識別碼';
COMMENT ON COLUMN badge_config.badge_name IS '勳章名稱';
COMMENT ON COLUMN badge_config.icon_type IS '圖示類型（svg/emoji/image）';
COMMENT ON COLUMN badge_config.icon_name IS '圖示名稱（Lucide Icons 名稱或 emoji）';
COMMENT ON COLUMN badge_config.unlock_condition IS '解鎖條件（JSON 格式）';
COMMENT ON COLUMN badge_config.is_hidden IS '是否為隱藏勳章';
COMMENT ON COLUMN badge_config.display_order IS '顯示順序';
```

**解鎖條件 JSON 格式範例**：

```json
{
  "type": "simple",
  "field": "uploads_count",
  "operator": ">=",
  "value": 1
}
```

```json
{
  "type": "complex",
  "logic": "and",
  "conditions": [
    {
      "type": "badge_count",
      "operator": ">=",
      "value": 24,
      "exclude_hidden": true
    }
  ]
}
```

---

### 5.4 activity_point_rules 表（活躍度點數規則表）

```sql
CREATE TABLE activity_point_rules (
  action VARCHAR(50) PRIMARY KEY,
  points INTEGER NOT NULL CHECK (points >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_daily_count INTEGER,
  cooldown_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX idx_activity_point_rules_is_active ON activity_point_rules(is_active);

-- 新增註解
COMMENT ON TABLE activity_point_rules IS '活躍度點數規則表：定義各種行為的點數獲得規則';
COMMENT ON COLUMN activity_point_rules.action IS '行為類型（upload/query/like_received/like_given/daily_login）';
COMMENT ON COLUMN activity_point_rules.points IS '獲得點數';
COMMENT ON COLUMN activity_point_rules.max_daily_count IS '每日最大次數（NULL 表示無限制）';
COMMENT ON COLUMN activity_point_rules.cooldown_seconds IS '冷卻時間（秒）';

-- 插入預設規則
INSERT INTO activity_point_rules (action, points, description, max_daily_count, cooldown_seconds) VALUES
('upload', 2, '上傳債務資料', 10, 0),
('query', 1, '查詢債務資料', 20, 60),
('like_received', 5, '收到讚', NULL, 0),
('like_given', 1, '給出讚', 10, 0),
('daily_login', 3, '每日登入', 1, 0);
```

---

### 5.5 member_badges 表（會員勳章表）

```sql
CREATE TABLE member_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key VARCHAR(50) NOT NULL REFERENCES badge_config(badge_key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_displayed BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  UNIQUE(user_id, badge_key)
);

-- 新增索引
CREATE INDEX idx_member_badges_user_id ON member_badges(user_id);
CREATE INDEX idx_member_badges_badge_key ON member_badges(badge_key);
CREATE INDEX idx_member_badges_unlocked_at ON member_badges(unlocked_at DESC);
CREATE INDEX idx_member_badges_is_displayed ON member_badges(is_displayed);

-- 新增註解
COMMENT ON TABLE member_badges IS '會員勳章表：記錄會員已解鎖的勳章';
COMMENT ON COLUMN member_badges.user_id IS '會員 ID';
COMMENT ON COLUMN member_badges.badge_key IS '勳章識別碼';
COMMENT ON COLUMN member_badges.unlocked_at IS '解鎖時間';
COMMENT ON COLUMN member_badges.is_displayed IS '是否在個人資料中顯示';
COMMENT ON COLUMN member_badges.display_order IS '顯示順序';
```

---

### 5.6 activity_point_history 表（活躍度點數歷史表）

```sql
CREATE TABLE activity_point_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 新增索引
CREATE INDEX idx_activity_point_history_user_id ON activity_point_history(user_id);
CREATE INDEX idx_activity_point_history_action ON activity_point_history(action);
CREATE INDEX idx_activity_point_history_created_at ON activity_point_history(created_at DESC);
CREATE INDEX idx_activity_point_history_user_created ON activity_point_history(user_id, created_at DESC);

-- 新增註解
COMMENT ON TABLE activity_point_history IS '活躍度點數歷史表：記錄所有點數獲得記錄';
COMMENT ON COLUMN activity_point_history.user_id IS '會員 ID';
COMMENT ON COLUMN activity_point_history.action IS '行為類型';
COMMENT ON COLUMN activity_point_history.points IS '獲得點數';
COMMENT ON COLUMN activity_point_history.description IS '描述';
COMMENT ON COLUMN activity_point_history.metadata IS '額外資訊（JSON 格式）';
```

---

### 5.7 資料庫函數：計算會員等級

```sql
CREATE OR REPLACE FUNCTION calculate_member_level(p_user_id UUID)
RETURNS TABLE(
  new_level INTEGER,
  new_title VARCHAR(100),
  new_title_color VARCHAR(7),
  total_upload_bonus INTEGER,
  total_query_bonus INTEGER
) AS $$
DECLARE
  v_activity_points INTEGER;
BEGIN
  -- 取得會員的活躍度點數
  SELECT activity_points INTO v_activity_points
  FROM member_statistics
  WHERE user_id = p_user_id;

  -- 根據點數計算等級
  RETURN QUERY
  SELECT
    lc.level,
    lc.title,
    lc.title_color,
    SUM(lc.bonus_upload_quota) OVER (ORDER BY lc.level) AS total_upload_bonus,
    SUM(lc.bonus_query_quota) OVER (ORDER BY lc.level) AS total_query_bonus
  FROM level_config lc
  WHERE lc.required_points <= v_activity_points
    AND lc.is_active = TRUE
  ORDER BY lc.level DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_member_level IS '計算會員等級：根據活躍度點數計算會員的等級和獎勵';
```

---

### 5.8 資料庫函數：檢查勳章解鎖

```sql
CREATE OR REPLACE FUNCTION check_badge_unlock(p_user_id UUID, p_badge_key VARCHAR(50))
RETURNS BOOLEAN AS $$
DECLARE
  v_condition JSONB;
  v_unlocked BOOLEAN := FALSE;
BEGIN
  -- 取得勳章的解鎖條件
  SELECT unlock_condition INTO v_condition
  FROM badge_config
  WHERE badge_key = p_badge_key AND is_active = TRUE;

  IF v_condition IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 這裡需要根據 v_condition 的內容動態檢查條件
  -- 實際實作時需要解析 JSON 並執行對應的查詢
  -- 這是一個簡化版本，實際應該在應用層處理

  RETURN v_unlocked;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_badge_unlock IS '檢查勳章解鎖：檢查會員是否符合勳章解鎖條件';
```

---

## 6. 管理員後台配置功能

### 6.1 等級系統配置

#### 6.1.1 等級列表管理
- ✅ 查看所有等級配置
- ✅ 新增等級（支援 LV1-LV100）
- ✅ 編輯等級資訊
  - 所需累計點數
  - 稱號名稱
  - 稱號顏色（顏色選擇器）
  - 視覺效果描述
  - 上傳配額獎勵
  - 查詢配額獎勵
- ✅ 啟用/停用等級
- ✅ 批量匯入/匯出（CSV/JSON）

#### 6.1.2 等級預覽
- ✅ 即時預覽稱號顯示效果
- ✅ 顯示升級曲線圖表
- ✅ 顯示獎勵累計圖表

---

### 6.2 勳章系統配置

#### 6.2.1 勳章列表管理
- ✅ 查看所有勳章配置
- ✅ 新增勳章
- ✅ 編輯勳章資訊
  - 勳章名稱
  - 勳章描述
  - 圖示選擇（Lucide Icons 選擇器）
  - 圖示顏色（顏色選擇器）
  - 背景漸層（漸層編輯器）
  - 邊框顏色
  - 光暈效果
  - 動畫效果
  - 難度等級
  - 解鎖條件（JSON 編輯器）
  - 是否隱藏
  - 顯示順序
- ✅ 刪除勳章
- ✅ 啟用/停用勳章
- ✅ 批量匯入/匯出（CSV/JSON）

#### 6.2.2 勳章預覽
- ✅ 即時預覽勳章視覺效果
- ✅ 測試 Hover 動畫效果
- ✅ 顯示解鎖條件說明

#### 6.2.3 解鎖條件編輯器
- ✅ 視覺化條件編輯器
- ✅ 支援簡單條件（單一欄位比較）
- ✅ 支援複雜條件（AND/OR 邏輯組合）
- ✅ 條件預覽（JSON 格式）
- ✅ 條件驗證

---

### 6.3 活躍度點數規則配置

#### 6.3.1 規則列表管理
- ✅ 查看所有點數規則
- ✅ 編輯規則
  - 行為類型
  - 獲得點數
  - 描述
  - 每日最大次數
  - 冷卻時間（秒）
- ✅ 啟用/停用規則
- ✅ 批量匯入/匯出（CSV/JSON）

#### 6.3.2 規則統計
- ✅ 顯示各規則的觸發次數
- ✅ 顯示各規則的點數貢獻比例
- ✅ 顯示異常行為警告

---

### 6.4 會員等級管理

#### 6.4.1 會員等級列表
- ✅ 查看所有會員的等級資訊
- ✅ 篩選（按等級、活躍度點數）
- ✅ 排序（按等級、點數、升級時間）
- ✅ 搜尋（按帳號、暱稱）

#### 6.4.2 會員等級詳情
- ✅ 查看會員的等級資訊
  - 當前等級
  - 當前稱號
  - 活躍度點數
  - 距離下一級所需點數
  - 累計配額獎勵
  - 已解鎖勳章列表
- ✅ 查看會員的點數獲得歷史
- ✅ 手動調整會員點數（需審計日誌）
- ✅ 手動調整會員等級（需審計日誌）
- ✅ 手動解鎖/撤銷勳章（需審計日誌）

---

### 6.5 系統監控與統計

#### 6.5.1 等級分佈統計
- ✅ 顯示各等級的會員數量
- ✅ 顯示等級分佈圖表（長條圖）
- ✅ 顯示平均等級
- ✅ 顯示等級中位數

#### 6.5.2 勳章統計
- ✅ 顯示各勳章的解鎖人數
- ✅ 顯示勳章解鎖率
- ✅ 顯示最稀有勳章
- ✅ 顯示最常見勳章

#### 6.5.3 活躍度統計
- ✅ 顯示每日點數獲得總量
- ✅ 顯示各行為的點數貢獻比例
- ✅ 顯示活躍度趨勢圖表（折線圖）
- ✅ 顯示異常行為警告

#### 6.5.4 升級趨勢分析
- ✅ 顯示每日升級人數
- ✅ 顯示平均升級時間
- ✅ 顯示升級瓶頸分析
- ✅ 顯示配額使用率

---

### 6.6 批量操作

#### 6.6.1 批量匯入
- ✅ 匯入等級配置（CSV/JSON）
- ✅ 匯入勳章配置（CSV/JSON）
- ✅ 匯入點數規則（CSV/JSON）
- ✅ 驗證資料格式
- ✅ 預覽匯入結果
- ✅ 錯誤處理

#### 6.6.2 批量匯出
- ✅ 匯出等級配置（CSV/JSON）
- ✅ 匯出勳章配置（CSV/JSON）
- ✅ 匯出點數規則（CSV/JSON）
- ✅ 匯出會員等級資料（CSV/JSON）
- ✅ 自訂匯出欄位

---

## 7. 實作優先順序

### 階段 G.1：資料庫設計與初始化（1 天）

**任務**：
1. ✅ 建立所有資料表（level_config, badge_config, activity_point_rules, member_badges, activity_point_history）
2. ✅ 新增 member_statistics 欄位
3. ✅ 建立資料庫函數（calculate_member_level）
4. ✅ 插入預設資料（30 個等級、27 個勳章、5 個點數規則）
5. ✅ 建立索引和約束
6. ✅ 測試資料庫結構

**交付物**：
- SQL 遷移檔案
- 測試資料 SQL
- 資料庫文件

---

### 階段 G.2：活躍度點數計算邏輯（1-2 天）

**任務**：
1. ✅ 建立點數計算 API（POST /api/activity/add-points）
2. ✅ 整合到現有功能
   - 上傳債務資料時觸發
   - 查詢債務資料時觸發
   - 按讚時觸發
   - 每日登入時觸發
3. ✅ 實作每日上限檢查
4. ✅ 實作冷卻時間檢查
5. ✅ 實作點數歷史記錄
6. ✅ 測試點數計算邏輯

**交付物**：
- API 端點
- 單元測試
- 整合測試

---

### 階段 G.3：等級升級觸發（1 天）

**任務**：
1. ✅ 建立等級計算邏輯
2. ✅ 實作自動升級觸發
3. ✅ 實作升級通知（前端彈窗）
4. ✅ 更新會員配額（根據等級獎勵）
5. ✅ 記錄升級歷史（審計日誌）
6. ✅ 測試升級邏輯

**交付物**：
- 升級邏輯函數
- 升級通知組件
- 單元測試

---

### 階段 G.4：勳章解鎖邏輯（1-2 天）

**任務**：
1. ✅ 建立勳章檢查 API（POST /api/badges/check-unlock）
2. ✅ 實作條件解析邏輯
3. ✅ 實作自動解鎖觸發
4. ✅ 實作解鎖通知（前端彈窗）
5. ✅ 實作隱藏勳章邏輯
6. ✅ 測試勳章解鎖邏輯

**交付物**：
- 勳章檢查 API
- 條件解析函數
- 解鎖通知組件
- 單元測試

---

### 階段 G.5：會員等級顯示整合（1 天）

**任務**：
1. ✅ 更新 MemberNav 組件（顯示等級和稱號）
2. ✅ 建立等級徽章組件
3. ✅ 建立勳章展示組件
4. ✅ 整合到會員個人資料頁面
5. ✅ 整合到會員首頁
6. ✅ 測試前端顯示

**交付物**：
- 等級徽章組件
- 勳章展示組件
- 更新後的 MemberNav
- UI 測試

---

### 階段 G.6：管理員配置介面（2-3 天）

**任務**：
1. ✅ 建立等級配置頁面（/admin/level-config）
2. ✅ 建立勳章配置頁面（/admin/badge-config）
3. ✅ 建立點數規則配置頁面（/admin/activity-rules）
4. ✅ 建立會員等級管理頁面（/admin/members/levels）
5. ✅ 建立系統監控頁面（/admin/level-system/monitor）
6. ✅ 實作批量匯入/匯出功能
7. ✅ 測試管理介面

**交付物**：
- 5 個管理頁面
- 批量操作功能
- 管理介面測試

---

### 階段 G.7：測試與優化（1 天）

**任務**：
1. ✅ 整合測試
2. ✅ 效能測試
3. ✅ 壓力測試（大量會員同時升級）
4. ✅ 修復 Bug
5. ✅ 優化查詢效能
6. ✅ 撰寫使用文件

**交付物**：
- 測試報告
- 效能優化報告
- 使用文件

---

## 總結

本規格報告詳細定義了臻好尋債務平台的等級與勳章系統，包含：

- ✅ **活躍度點數系統**：5 種行為，每日上限控制，防濫用機制
- ✅ **等級升級系統**：LV1-LV30，30 個等級，升級時間約 7.9 年（混合估算）
- ✅ **勳章系統**：27 種勳章，4 個難度等級，3 個隱藏勳章
- ✅ **視覺設計規範**：SVG 圖示 + 漸層背景 + 光暈效果 + 動畫
- ✅ **資料庫設計**：6 個資料表，完整的索引和約束
- ✅ **管理員配置**：完全可配置，支援批量操作
- ✅ **實作計畫**：7 個階段，預估 8-12 天完成

**預估總工時**：8-12 天
**建議實作順序**：G.1 → G.2 → G.3 → G.4 → G.5 → G.6 → G.7

此系統設計確保了長期目標、成就感、平衡性和可擴展性，為會員提供持續的動力和樂趣！🚀

---

**文件結束**

