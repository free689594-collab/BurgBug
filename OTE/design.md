# 債務查詢系統 - 技術設計文檔

## 1. 系統架構概覽

### 1.1 整體架構
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端應用層     │    │   API 服務層     │    │   資料服務層     │
│                 │    │                 │    │                 │
│ Next.js 15      │◄──►│ Next.js API     │◄──►│ Supabase        │
│ React 18        │    │ Routes          │    │ PostgreSQL      │
│ TypeScript 5    │    │ 中間件層        │    │ RLS 安全策略    │
│ Tailwind CSS    │    │ 認證授權        │    │ 即時訂閱        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 1.2 核心技術棧
- **前端框架**: Next.js 15 + React 18 + TypeScript 5
- **樣式系統**: Tailwind CSS 3 + Lucide React Icons
- **後端服務**: Supabase (認證 + 資料庫 + 即時功能)
- **資料庫**: PostgreSQL with Row Level Security (RLS)
- **部署平台**: Vercel (前端) + Supabase (後端服務)

## 2. 資料庫設計

### 2.1 核心資料表結構

#### 用戶認證表 (auth.users - Supabase 內建)
```sql
-- 角色模型放在 public schema（避免修改 Supabase 受管控的 auth.users）
CREATE TYPE user_role AS ENUM ('user','super_admin');

CREATE TABLE user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 會員資料表 (members)
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

#### 債務記錄表 (debt_records)
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

#### 會員統計表 (member_statistics)
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

### 2.2 防濫用機制設計

#### 按讚冷卻機制
```sql
-- 按讚記錄表（加入冷卻機制）
CREATE TABLE member_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liker_id UUID REFERENCES auth.users(id),
    liked_member_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(liker_id, liked_member_id),

    -- 防止自己給自己按讚
    CONSTRAINT no_self_like CHECK (liker_id != liked_member_id)
);

-- 按讚頻率限制表（優化版）
CREATE TABLE like_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    like_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_like_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

-- 自動清理過期記錄
CREATE OR REPLACE FUNCTION cleanup_like_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM like_rate_limits
    WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
```

#### 使用配額表 (usage_counters)
```sql
-- 每位用戶每日用量計數（台灣時區口徑）
CREATE TABLE usage_counters (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    day DATE NOT NULL DEFAULT (CURRENT_DATE AT TIME ZONE 'Asia/Taipei'),
    uploads INTEGER NOT NULL DEFAULT 0,
    queries INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);

-- 便於清理與查詢
CREATE INDEX idx_usage_counters_day ON usage_counters(day);
```

#### 單裝置控制表 (active_sessions)
```sql
-- 強制單裝置：每位用戶僅保留一筆最新會話，登入時覆寫舊會話
CREATE TABLE active_sessions (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,                     -- 由後端生成並綁定
    device_fingerprint TEXT,                      -- 裝置指紋/UA/平台摘要
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ                        -- 可選：用於被動過期與清理
);

CREATE INDEX idx_active_sessions_last_seen ON active_sessions(last_seen);
```

> 登入邏輯說明（設計口徑）：
> - 成功登入後：UPSERT active_sessions（以 user_id 為主鍵覆寫），並以新 session_id 生效；如有舊會話即被踢下線
> - 安全監控：7 日內異常登入次數超門檻（例：≥5）→ 可在應用層自動將 members.status 設為 suspended，並記錄於 audit_logs


#### 資料修改申請（會員/債務）
```sql
-- 會員資料修改申請（例如名稱、聯絡資訊變更）
CREATE TYPE mod_request_status AS ENUM ('pending','approved','rejected','cancelled');

CREATE TABLE profile_modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_member_id UUID NOT NULL REFERENCES members(user_id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,                 -- 申請的變更內容
  status mod_request_status NOT NULL DEFAULT 'pending',
  reason TEXT,                                      -- 駁回原因或備註
  processed_by UUID REFERENCES auth.users(id),      -- 審核者
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_profile_mod_req_target ON profile_modification_requests(target_member_id, status);

-- 債務資料修改申請（例如修正金額、狀態等）
CREATE TABLE debt_modification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_debt_id UUID NOT NULL REFERENCES debt_records(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  status mod_request_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_debt_mod_req_target ON debt_modification_requests(target_debt_id, status);
```

#### 審計日誌（操作/查詢行為）
```sql
-- 以 30 天為預設保留（實際清理由排程按 system_config.audit_retention_days 執行）
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                             -- 例：'MEMBER_QUERY','UPLOAD_CREATE','ADMIN_APPROVE'
  resource TEXT,                                    -- 例：'members','debt_records'
  resource_id UUID,
  meta JSONB,                                       -- 相關上下文（不放敏感資料）
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```


#### 冷卻機制實作
```typescript
// 按讚冷卻檢查函數
const LIKE_COOLDOWN = {
  maxLikesPerMinute: 3,
  maxLikesPerHour: 50,
  windowDuration: 60 * 1000 // 1分鐘
};

async function checkLikeCooldown(userId: string): Promise<{ allowed: boolean; remainingTime?: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - LIKE_COOLDOWN.windowDuration);

  // 檢查頻率限制
  const { data: rateLimit } = await supabase
    .from('like_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (rateLimit) {
    const timeSinceLastLike = now.getTime() - new Date(rateLimit.last_like_at).getTime();
    const minInterval = LIKE_COOLDOWN.windowDuration / LIKE_COOLDOWN.maxLikesPerMinute;

    if (timeSinceLastLike < minInterval) {
      return {
        allowed: false,
        remainingTime: Math.ceil((minInterval - timeSinceLastLike) / 1000)
      };
    }
  }

  // 檢查小時內總數
  const recentLikes = await supabase
    .from('member_likes')
    .select('created_at')
    .eq('liker_id', userId)
    .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

  if (recentLikes.data?.length >= LIKE_COOLDOWN.maxLikesPerHour) {
    return { allowed: false };

##### 原子性限流 Upsert（伺服器端必須採用）
```sql
-- 在執行按讚 INSERT 前，先以單語句 Upsert 原子更新限流視窗與計數
INSERT INTO like_rate_limits (user_id, like_count, window_start, last_like_at)
VALUES ($1, 1, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE
SET like_count = CASE
  WHEN like_rate_limits.window_start > NOW() - INTERVAL '1 hour'
  THEN like_rate_limits.like_count + 1 ELSE 1 END,
    window_start = CASE
  WHEN like_rate_limits.window_start > NOW() - INTERVAL '1 hour'
  THEN like_rate_limits.window_start ELSE NOW() END,
    last_like_at = NOW()
RETURNING like_count, window_start, last_like_at;
```

- 伺服器端依據返回的 like_count/last_like_at 判斷是否超出每分鐘/每小時/每日門檻；若超標則不進行按讚寫入
- 此設計避免高併發下的競態條件，確保限流不被繞過

  }

  return { allowed: true };
}
```

### 2.3 統計數據同步機制

#### 即時統計更新
```sql
-- 統計數據觸發器
CREATE OR REPLACE FUNCTION update_member_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 上傳統計更新
    IF TG_TABLE_NAME = 'debt_records' AND TG_OP = 'INSERT' THEN
        INSERT INTO member_statistics (user_id, total_uploads)
        VALUES (NEW.uploaded_by, 1)
        ON CONFLICT (user_id)
        DO UPDATE SET
            total_uploads = member_statistics.total_uploads + 1,
            updated_at = NOW();
    END IF;

    -- 按讚統計更新
    IF TG_TABLE_NAME = 'member_likes' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE member_statistics
            SET likes_received = likes_received + 1,
                updated_at = NOW()
            WHERE user_id = NEW.liked_member_id;

            UPDATE member_statistics
            SET likes_given = likes_given + 1,
                updated_at = NOW()
            WHERE user_id = NEW.liker_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE member_statistics
            SET likes_received = GREATEST(likes_received - 1, 0),
                updated_at = NOW()
            WHERE user_id = OLD.liked_member_id;

            UPDATE member_statistics
            SET likes_given = GREATEST(likes_given - 1, 0),
                updated_at = NOW()
            WHERE user_id = OLD.liker_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 建立觸發器
CREATE TRIGGER trigger_update_statistics_debt
    AFTER INSERT ON debt_records
    FOR EACH ROW EXECUTE FUNCTION update_member_statistics();

CREATE TRIGGER trigger_update_statistics_likes
    AFTER INSERT OR DELETE ON member_likes
    FOR EACH ROW EXECUTE FUNCTION update_member_statistics();
```

## 3. API 設計規格

### 3.1 認證與授權中間件
```typescript
// helper: 管理路由判斷
const ADMIN_PREFIXES = ['/admin', '/api/admin'];
export function isAdminRoute(url: string) {
  try {
    return ADMIN_PREFIXES.some((p) => new URL(url).pathname.startsWith(p));
  } catch {
    return false;
  }
}

// helper: 取得目前使用者（簡化版，使用 Authorization Bearer token）
export async function getCurrentUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user ? { id: user.id, email: user.email } : null;
}

// 認證中間件
export async function authMiddleware(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: '無效的認證令牌' }, { status: 401 });
  }

  // 檢查會員狀態
  const { data: member } = await supabase
    .from('members')
    .select('status')
    .eq('user_id', user.id)
    .single();

  if (member?.status !== 'approved' && !isAdminRoute(req.url)) {
    return NextResponse.json({ error: '帳號未通過審核' }, { status: 403 });
  }

  return NextResponse.next();
}

// 管理員權限檢查（以 user_roles 判斷）
export async function adminMiddleware(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
  }

  const { data: roleRow } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (roleRow?.role !== 'super_admin') {
    return NextResponse.json({ error: '需要管理員權限' }, { status: 403 });
  }

  return NextResponse.next();
}
```

### 3.2 核心 API 端點

#### 會員互動 API
```typescript
// 按讚功能 API
POST /api/member/like/{memberId}
{
  "success": boolean,
  "newLikeCount": number,
  "cooldownRemaining"?: number // 如果觸發冷卻，返回剩餘時間
}

// 會員資訊卡 API
GET /api/member/info-card/{memberId}
{
  "userId": string,
  "nickname": string,
  "businessType": string,
  "businessRegion": string,
  "activityLevel": number,
  "title": string,
  "titleColor": string,
  "badges": Badge[],
  "likesReceived": number,
  "canLike": boolean,
  "hasLiked": boolean
}
```

#### 管理員配置 API
```typescript
// 活躍度系統配置
PUT /api/admin/activity-config
{
  "pointRules": {
    "uploadPoints": number,
    "queryPoints": number,
    "likeReceivedPoints": number
  },
  "levelThresholds": number[],
  "levelTitles": string[],
  "levelColors": string[]
}

// 勳章系統配置
POST /api/admin/badge-config
{
  "badgeKey": string,
  "badgeName": string,
  "description": string,
  "icon": string,
  "unlockCondition": {
    "type": "upload_count" | "query_count" | "likes_received",
    "threshold": number
  }
}
```

## 4. UI設計系統

### 4.1 設計風格定義
```typescript
// 簡潔現代黑色調設計系統
const designSystem = {
  colors: {
    // 主色調 - 黑色系
    background: {
      primary: "#0A0A0A",      // 主背景 - 深黑
      secondary: "#1A1A1A",    // 卡片背景 - 淺黑
      tertiary: "#2A2A2A",     // 懸停背景 - 中黑
    },

    // 文字顏色
    text: {
      primary: "#FFFFFF",      // 主要文字 - 純白
      secondary: "#B3B3B3",    // 次要文字 - 淺灰
      muted: "#666666",        // 輔助文字 - 深灰
      accent: "#3B82F6",       // 強調文字 - 藍色
    },

    // 功能色彩
    accent: {
      primary: "#3B82F6",      // 主要按鈕 - 藍色
      success: "#10B981",      // 成功狀態 - 綠色
      warning: "#F59E0B",      // 警告狀態 - 黃色
      danger: "#EF4444",       // 危險狀態 - 紅色
      info: "#8B5CF6",         // 資訊狀態 - 紫色
    },

    // 邊框顏色
    border: {
      primary: "#333333",      // 主要邊框
      secondary: "#444444",    // 次要邊框
      accent: "#3B82F6",       // 強調邊框
    }
  },

  typography: {
    fontFamily: {
      sans: ["Geist Sans", "Inter", "system-ui", "sans-serif"],
      mono: ["Geist Mono", "Fira Code", "monospace"]
    },
    fontSize: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "32px",
      "4xl": "40px"
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
    "3xl": "64px"
  },

  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    full: "9999px"
  },

  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.3)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
  }
};
```

### 4.2 核心組件設計

#### 按鈕組件
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

// 黑色調按鈕樣式
const buttonStyles = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white border-blue-600",
  secondary: "bg-gray-800 hover:bg-gray-700 text-white border-gray-600",
  ghost: "bg-transparent hover:bg-gray-800 text-gray-300 border-gray-600",
  danger: "bg-red-600 hover:bg-red-700 text-white border-red-600"
};
```

#### 卡片組件
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'bordered';
  padding?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

// 黑色調卡片樣式
const cardStyles = {
  default: "bg-gray-900 border border-gray-700",
  elevated: "bg-gray-900 border border-gray-700 shadow-lg",
  bordered: "bg-gray-900 border-2 border-gray-600"
};
```

### 4.3 頁面佈局設計

#### 主佈局結構
```typescript
// 黑色調主佈局
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* 頂部導航 */}
      <nav className="bg-gray-900 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Logo />
          <UserMenu />
        </div>
      </nav>

      {/* 主要內容區 */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>

      {/* 底部 */}
      <footer className="bg-gray-900 border-t border-gray-700 px-6 py-4 mt-auto">
        <div className="text-center text-gray-400 text-sm">
          © 2024 債務查詢系統. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
```

### 4.4 活躍度等級視覺設計

#### 黑色調等級效果
```css
/* 等級稱號黑色調效果 */
.level-1 {
  color: #666666;
}

.level-3 {
  color: #3B82F6;
  text-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
}

.level-5 {
  color: #F59E0B;
  text-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  animation: pulse-gold 2s infinite;
}

.level-10 {
  background: linear-gradient(45deg, #FFD700, #FFA500, #FF6B35);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbow-glow 3s infinite;
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
}

@keyframes pulse-gold {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}

@keyframes rainbow-glow {
  0% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)) hue-rotate(0deg); }
  100% { filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5)) hue-rotate(360deg); }
}
```

## 5. 前端組件設計

### 5.1 會員資訊卡組件（黑色調版本）
```typescript
interface MemberInfoCardProps {
  memberInfo: MemberInfo;
  onLike?: (memberId: string) => void;
  showLikeButton?: boolean;
}

// 輕量級動畫效果
const titleAnimations = {
  1: 'text-gray-500',
  2: 'text-green-600',
  3: 'text-blue-600 animate-pulse',
  4: 'text-purple-600 animate-pulse',
  5: 'text-yellow-600 animate-bounce',
  // 高等級使用 CSS 變數實現漸變效果
  10: 'bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent animate-pulse'
};

export function MemberInfoCard({ memberInfo, onLike, showLikeButton }: MemberInfoCardProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  const handleLike = async () => {
    if (isLiking || cooldownTime > 0) return;

    setIsLiking(true);
    try {
      const response = await fetch(`/api/member/like/${memberInfo.userId}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.cooldownRemaining) {
        setCooldownTime(result.cooldownRemaining);
        const timer = setInterval(() => {
          setCooldownTime(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      onLike?.(memberInfo.userId);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <span className={`font-semibold ${titleAnimations[memberInfo.activityLevel]}`}>
              {memberInfo.nickname}
            </span>
            <span className="text-sm text-gray-400">
              {memberInfo.businessRegion} · {memberInfo.businessType}
            </span>
            <span className={`text-xs font-medium ${titleAnimations[memberInfo.activityLevel]}`}>
              Lv.{memberInfo.activityLevel} {memberInfo.title}
            </span>
          </div>
        </div>

        {showLikeButton && (
          <button
            onClick={handleLike}
            disabled={isLiking || cooldownTime > 0}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${memberInfo.hasLiked
                ? 'bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30'
                : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700 hover:border-gray-500'
              }
              ${(isLiking || cooldownTime > 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Heart className={`w-4 h-4 ${memberInfo.hasLiked ? 'fill-current' : ''}`} />
            <span>{memberInfo.likesReceived}</span>
            {cooldownTime > 0 && (
              <span className="text-xs bg-gray-700 px-1 rounded">
                {cooldownTime}s
              </span>
            )}
          </button>
        )}
      </div>

      {memberInfo.badges.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {memberInfo.badges.map(badge => (
            <span
              key={badge.key}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30"
              title={badge.description}
            >
              {badge.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4.2 管理員儀表板組件
```typescript
export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);

  useEffect(() => {
    // 即時統計更新
    const channel = supabase
      .channel('admin-stats')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'debt_records' },
        () => refreshStats()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'members' },
        () => refreshStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* 即時統計卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="待審核會員"
          value={stats?.memberStats.pending}
          icon={<UserClock />}
          color="yellow"
        />
        <StatCard
          title="今日上傳"
          value={stats?.dataStats.todayUploads}
          icon={<Upload />}
          color="green"
        />
        <StatCard
          title="今日查詢"
          value={stats?.dataStats.todayQueries}
          icon={<Search />}
          color="blue"
        />
        <StatCard
          title="系統健康"
          value={stats?.systemHealth.status}
          icon={<Activity />}
          color={stats?.systemHealth.status === 'healthy' ? 'green' : 'red'}
        />
      </div>

      {/* 區域統計對比 */}
      <RegionStatsComparison realStats={stats?.regionRealStats} />

      {/* 活躍度系統配置 */}
      <ActivitySystemConfig />
    </div>
  );
}
```

## 5. 安全性設計

### 5.1 Row Level Security (RLS) 政策
```sql

-- 使用配額 usage_counters 啟用 RLS 與政策
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "本人可存取自身用量" ON usage_counters
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "管理員存取所有用量" ON usage_counters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- 單裝置 active_sessions 啟用 RLS 與政策
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "本人可存取自身會話" ON active_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "管理員存取所有會話" ON active_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_records ENABLE ROW LEVEL SECURITY;


-- 會員資料 RLS
CREATE POLICY "會員查看自己的資料" ON members
    FOR SELECT USING (auth.uid() = user_id);

-- 修改申請 RLS
ALTER TABLE profile_modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_modification_requests ENABLE ROW LEVEL SECURITY;

-- 申請人可查看/新增自己的申請；可在 pending 狀態取消（UPDATE status='cancelled'）
CREATE POLICY "本人查看/新增自身修改申請" ON profile_modification_requests
  FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "本人新增修改申請" ON profile_modification_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "本人可取消待審申請" ON profile_modification_requests
  FOR UPDATE USING (auth.uid() = requested_by AND status = 'pending')
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "本人查看/新增自身債務修改申請" ON debt_modification_requests
  FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "本人新增債務修改申請" ON debt_modification_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "本人可取消待審債務申請" ON debt_modification_requests
  FOR UPDATE USING (auth.uid() = requested_by AND status = 'pending')
  WITH CHECK (auth.uid() = requested_by);

-- 管理員可管理所有修改申請
CREATE POLICY "管理員可管理所有修改申請" ON profile_modification_requests
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "管理員可管理所有債務修改申請" ON debt_modification_requests
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));

-- 審計日誌 RLS：僅管理員可查詢；插入由服務角色或 SECURITY DEFINER 函數負責
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "管理員可查詢審計日誌" ON audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));


CREATE POLICY "管理員管理所有會員" ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- 債務記錄 RLSㄅㄤ
CREATE POLICY "已審核會員查詢債務記錄" ON debt_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE user_id = auth.uid() AND status = 'approved'
        )
    );

CREATE POLICY "已審核會員上傳債務記錄" ON debt_records
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM members
            WHERE user_id = auth.uid() AND status = 'approved'
        )
    );

-- 管理員存取所有債務記錄（覆蓋所有操作）
CREATE POLICY "管理員管理所有債務記錄" ON debt_records
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- 上傳者可更新還款狀態（以 uploaded_by 綁定）
-- 注意：欄位層級限制需由觸發器或應用層驗證確保只變更 repayment_status
CREATE POLICY "上傳者可更新還款狀態" ON debt_records
    FOR UPDATE USING (uploaded_by = auth.uid())
    WITH CHECK (uploaded_by = auth.uid());

-- 刪除僅管理員
CREATE POLICY "管理員可刪除債務資料" ON debt_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );
```

### 5.2 資料遮罩函數
```sql
-- 優化的遮罩函數
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

## 6. 性能優化策略

### 6.1 資料庫索引優化

> 注意（CONCURRENTLY 與交易）：
> - CREATE INDEX CONCURRENTLY 不能在交易（transaction）內執行；許多遷移工具會自動包一層交易，會導致報錯。
> - 建議做法：
>   1) 初始遷移（資料表尚空）可移除 CONCURRENTLY，直接建立索引。
>   2) 若為線上環境或大表，請將索引建立拆成「不包交易」的獨立遷移（或使用工具的 skip-transaction/disableTransaction 設定）。
>   3) Supabase SQL Editor/psql 可直接執行下列語句（單獨執行，每條語句各自提交）。

```sql
-- 查詢優化索引
CREATE INDEX CONCURRENTLY idx_debt_records_id_last5_status
ON debt_records(debtor_id_last5, repayment_status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_members_status_region
ON members(status, business_region) WHERE status = 'approved';

CREATE INDEX CONCURRENTLY idx_member_statistics_level_points
ON member_statistics(activity_level DESC, activity_points DESC);

-- 統計查詢優化
CREATE INDEX CONCURRENTLY idx_debt_records_uploaded_by_date
ON debt_records(uploaded_by, DATE(created_at));
```

### 6.2 前端性能優化
```typescript
// 虛擬化長列表
import { FixedSizeList as List } from 'react-window';

export function VirtualizedDebtorList({ debtors }: { debtors: DebtorRecord[] }) {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <DebtorCard debtor={debtors[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={debtors.length}
      itemSize={120}
      width="100%"
    >
      {Row}
    </List>
  );
}

// 圖片懶加載
export function LazyImage({ src, alt, className }: ImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 }
    );

    if (imgRef.current) observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
```

## 7. 部署與監控

### 7.1 環境配置
```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 應用配置
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=your_app_url

# 功能開關
ENABLE_LIKE_SYSTEM=true
ENABLE_REAL_TIME_STATS=true
LIKE_COOLDOWN_MINUTES=1
MAX_LIKES_PER_HOUR=50

# 監控配置
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

### 7.2 健康檢查端點
```typescript
// API 健康檢查
export async function GET() {
  const startTime = Date.now();
  try {
    // 檢查資料庫連接（以 head: true + count 取得健康訊號）
    const { count, error } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;

    // 檢查關鍵服務與性能
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        authentication: 'healthy',
        realtime: 'healthy'
      },
      performance: {
        responseTime: Date.now() - startTime,
        memoryUsage: typeof process !== 'undefined' ? process.memoryUsage() : {},
        uptime: typeof process !== 'undefined' ? process.uptime() : 0
      }
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: String((error as any)?.message ?? error) },
      { status: 500 }
    );
  }
}
```

## 8. 測試策略

### 8.1 單元測試
```typescript
// 按讚冷卻機制測試
describe('Like Cooldown System', () => {
  test('should enforce like cooldown', async () => {
    const userId = 'test-user-id';
    const targetId = 'target-user-id';

    // 第一次按讚應該成功
    const firstLike = await likeMember(userId, targetId);
    expect(firstLike.success).toBe(true);

    // 立即再次按讚應該被冷卻限制
    const secondLike = await likeMember(userId, targetId);
    expect(secondLike.success).toBe(false);
    expect(secondLike.cooldownRemaining).toBeGreaterThan(0);
  });

  test('should prevent self-liking', async () => {
    const userId = 'test-user-id';

    const result = await likeMember(userId, userId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('不能給自己按讚');
  });
});
```

### 8.2 整合測試
```typescript
// 統計數據同步測試
describe('Statistics Synchronization', () => {
  test('should update statistics in real-time', async () => {
    const userId = 'test-user-id';

    // 獲取初始統計
    const initialStats = await getMemberStatistics(userId);

    // 上傳債務記錄
    await uploadDebtRecord(userId, mockDebtorData);

    // 檢查統計是否更新
    const updatedStats = await getMemberStatistics(userId);
    expect(updatedStats.totalUploads).toBe(initialStats.totalUploads + 1);
  });
});
```

這個設計文檔涵蓋了所有核心功能的技術實現方案，特別針對您提到的重點優化項目提供了具體的解決方案。系統設計確保了安全性、性能和可維護性，可以支持漸進式部署和後續迭代開發。

## 9. 未來擴展功能：私人還款管理（僅上傳者可見）

- 範圍：此功能不納入當前開發階段，不預留資料表或 API；待核心問題修畢後開發
- 設計方向（未來）：
  - 新增獨立資料表並以外鍵關聯 `debt_records(id)` 與擁有者 `owner_user_id`
    - `repayment_schedules`：個人還款計畫（本金/利率/頻率/起始日/下一期日等）
    - `payment_records`：實際還款紀錄（金額/利息/本金/時間/備註等）
  - 權限：僅上傳者本人可見與操作；管理員可於審計下檢視
  - 影響範圍：不影響現行「上傳/查詢/會員管理/統計」流程；前端入口與 API 為獨立模組
  - 後續可擴充：到期提醒、利息計算模型、對賬摘要卡片
