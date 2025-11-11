import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理路徑前綴清單
 */
const ADMIN_PREFIXES = ['/admin', '/api/admin']

/**
 * 公開路徑清單（不需要認證）
 */
const PUBLIC_PATHS = [
  '/',              // 根目錄（歡迎首頁）
  '/login',
  '/register',
  '/waiting-approval',
  '/account-suspended',
  '/session-expired',
  '/session-conflict',
  '/subscription-expired',  // 訂閱過期頁面
  '/test-cookie',   // Cookie 測試頁面
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/resolve-conflict',
  '/api/test-cookie',
  '/api/health',
  '/api/debug',
]

/**
 * 訂閱豁免路徑（即使訂閱過期也可以訪問）
 */
const SUBSCRIPTION_EXEMPT_PATHS = [
  '/subscription-expired',
  '/profile',
  '/api/subscription',
  '/api/auth/me',
  '/api/auth/logout',
]

/**
 * 判斷路徑是否為管理路徑
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * 判斷路徑是否為公開路徑
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
}

/**
 * 判斷路徑是否豁免訂閱檢查
 */
function isSubscriptionExempt(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))
}

/**
 * 從請求中取得當前使用者
 */
async function getCurrentUser(req: NextRequest): Promise<any | null> {
  try {
    // 1. 嘗試從 cookie 取得 token
    let token = req.cookies.get('access_token')?.value

    // 2. 如果 cookie 沒有，嘗試從 Authorization header 取得
    if (!token) {
      token = req.headers.get('authorization')?.replace('Bearer ', '')
    }

    if (!token) {
      return null
    }

    // 3. 使用 Supabase 驗證 token（用於 auth.getUser）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    // 3.1 建立 service role client（用於查詢 members 和 user_roles，繞過 RLS）
    // 這是安全的，因為 middleware 只在伺服器端執行，不會洩漏 service key
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let userId: string | null = null
    // 優先使用 Supabase Auth API 
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (!error && user) {
      userId = user.id
    } else {
      // 後備方案：
      try {
        const payloadPart = token.split('.')[1] || ''
        const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
        const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0
        const b64Padded = b64 + '='.repeat(pad)
        let json = ''
        if (typeof Buffer !== 'undefined') {
          json = Buffer.from(b64Padded, 'base64').toString('utf-8')
        } else if (typeof atob !== 'undefined') {
          json = decodeURIComponent(Array.prototype.map.call(atob(b64Padded), (c: string) =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join(''))
        }
        const payload = JSON.parse(json)
        userId = payload.sub || payload.user_id || null
      } catch (e) {
        userId = null
      }
    }

    if (!userId) {
      return null
    }

    // 4.  session_id
    let sessionId: string
    try {
      const payloadPart = token.split('.')[1] || ''
      const b64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
      const pad = b64.length % 4 ? 4 - (b64.length % 4) : 0
      const b64Padded = b64 + '='.repeat(pad)
      let json = ''
      if (typeof Buffer !== 'undefined') {
        json = Buffer.from(b64Padded, 'base64').toString('utf-8')
      } else if (typeof atob !== 'undefined') {
        json = decodeURIComponent(Array.prototype.map.call(atob(b64Padded), (c: string) =>
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''))
      }
      const tokenPayload = JSON.parse(json)
      sessionId = tokenPayload.session_id || token.substring(0, 36)
    } catch (e) {
      sessionId = token.substring(0, 36)
    }

    // 5. 取得會員資料和角色（使用 service role client 繞過 RLS）
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('account, status')
      .eq('user_id', userId)
      .single()

    if (memberError) {
      console.error('[getCurrentUser] Member query error:', memberError)
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (roleError) {
      console.error('[getCurrentUser] Role query error:', roleError)
      console.error('[getCurrentUser] Role error details:', JSON.stringify(roleError))
    }

    // 重要：不要給 role 預設值，讓它保持 undefined 以便在 middleware 中判斷查詢是否成功
    const userObj = {
      id: userId,
      email: undefined,
      account: member?.account,
      status: member?.status,
      role: roleData?.role, // 移除預設值 'user'，保持原始值
      sessionId, // 新增：包含 session_id
    }

    console.log('[getCurrentUser] User object:', JSON.stringify(userObj))
    console.log('[getCurrentUser] roleData:', JSON.stringify(roleData))
    return userObj
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

/**
 * 驗證會話是否有效（單裝置控制）
 * 檢查當前 session_id 是否與 active_sessions 表中的記錄匹配
 */
async function validateSession(userId: string, sessionId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: activeSession } = await supabase
      .from('active_sessions')
      .select('session_id')
      .eq('user_id', userId)
      .single()

    // 如果沒有找到記錄，或 session_id 不匹配，則會話無效
    if (!activeSession || activeSession.session_id !== sessionId) {
      return false
    }

    return true
  } catch (error) {
    console.error('validateSession error:', error)
    return false
  }
}

/**
 * 檢查訂閱狀態
 * 返回訂閱是否有效
 */
async function checkSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: subscriptionStatus, error } = await supabase
      .rpc('check_subscription_status', { p_user_id: userId })
      .single<{ is_active: boolean }>()

    if (error) {
      console.error('[checkSubscriptionStatus] 查詢訂閱狀態失敗:', error)
      // 查詢失敗時，為了不影響用戶體驗，暫時放行
      return true
    }

    // 檢查訂閱是否有效（未過期）
    return subscriptionStatus?.is_active === true

  } catch (error) {
    console.error('[checkSubscriptionStatus] 錯誤:', error)
    // 發生錯誤時，為了不影響用戶體驗，暫時放行
    return true
  }
}

/**
 * Next.js 全域中間件
 * 處理認證和權限檢查
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 1. 公開路徑直接放行
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // 2. 靜態資源直接放行
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts')
  ) {
    return NextResponse.next()
  }

  // 3. API 路由直接放行（由各自的中間件處理認證）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 取得 token（供會話驗證與資料查詢使用）
  const token = req.cookies.get('access_token')?.value ||
                req.headers.get('authorization')?.replace('Bearer ', '') || ''

  // 4. 取得當前使用者
  const user = await getCurrentUser(req)

  // 5. 未認證使用者導向登入頁
  if (!user) {
    console.log(`[Middleware] 未認證使用者，導向登入頁: pathname=${pathname}`)
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  console.log(`[Middleware] 使用者已認證: id=${user.id}, account=${user.account}, role=${user.role}, status=${user.status}`)

  // 5.1 衝突提示頁允許通行（避免循環導向）
  if (pathname === '/session-conflict') {
    return NextResponse.next()
  }

  // 6. 會話驗證（單裝置控制）
  // 在開發中或顯式關閉時，跳過單裝置驗證以提升開發體驗
  const enforceSingleDevice = (process.env.ENFORCE_SINGLE_DEVICE ?? 'true').toLowerCase() !== 'false'
  const shouldValidateSession = process.env.NODE_ENV === 'production' ? enforceSingleDevice : false

  if (shouldValidateSession) {
    // 僅在需要時執行嚴格驗證
    const isSessionValid = await validateSession(user.id, user.sessionId)
    if (!isSessionValid) {
      // 會話無效（在其他裝置登入）→ 導向「裝置衝突提示頁」，讓使用者選擇處置
      const conflictUrl = new URL('/session-conflict', req.url)
      conflictUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(conflictUrl)
    }
  }

  // 7. 管理路徑權限檢查
  if (isAdminRoute(pathname)) {
    const isAdmin = user.role && ['super_admin', 'admin'].includes(user.role)
    console.log(`[Middleware] 管理路徑檢查: pathname=${pathname}, role=${user.role}, user.role type=${typeof user.role}, isAdmin=${isAdmin}`)

    // 開發模式：如果 role 是 null/undefined/空字串，可能是查詢失敗，先放行以便除錯
    if (process.env.NODE_ENV !== 'production' && !user.role) {
      console.log('[Middleware] 開發模式：role 未知或查詢失敗，暫時放行管理路徑以便除錯')
      console.log('[Middleware] 提示：請檢查 user_roles 表的 RLS 政策和資料是否正確')
      return NextResponse.next()
    }

    // 允許 super_admin 和 admin 存取管理路徑
    if (!isAdmin) {
      console.log(`[Middleware] 非管理員嘗試存取管理路徑: role=${user.role}, pathname=${pathname}`)
      // 非管理員嘗試存取管理路徑，導向儀表板
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // 管理員可以存取管理路徑
    console.log(`[Middleware] ✅ 管理員存取管理路徑: role=${user.role}, pathname=${pathname}`)
    return NextResponse.next()
  }

  // 8. 一般會員路徑狀態檢查
  if (user.status === 'pending') {
    // 待審核會員只能存取等待審核頁面
    if (pathname !== '/waiting-approval') {
      return NextResponse.redirect(new URL('/waiting-approval', req.url))
    }
  } else if (user.status === 'suspended') {
    // 停用會員只能存取帳號停用頁面
    if (pathname !== '/account-suspended') {
      return NextResponse.redirect(new URL('/account-suspended', req.url))
    }
  } else if (user.status === 'approved') {
    // 9. 訂閱狀態檢查（僅對已審核會員）
    // 如果路徑不在豁免清單中，檢查訂閱狀態
    if (!isSubscriptionExempt(pathname)) {
      const hasValidSubscription = await checkSubscriptionStatus(user.id)

      if (!hasValidSubscription) {
        console.log(`[Middleware] 訂閱已過期，導向訂閱過期頁面: user_id=${user.id}, pathname=${pathname}`)
        const expiredUrl = new URL('/subscription-expired', req.url)
        expiredUrl.searchParams.set('from', pathname)
        return NextResponse.redirect(expiredUrl)
      }
    }

    // 已審核會員且訂閱有效，可以正常存取
    return NextResponse.next()
  } else {
    // 未知狀態：開發模式放行以便除錯，生產模式導回登入
    console.log(`[Middleware] 未知狀態: status=${user.status}, role=${user.role}, pathname=${pathname}`)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Middleware] 開發模式：未知狀態放行')
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

/**
 * 中間件配置
 * 指定哪些路徑需要執行中間件
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路徑，除了：
     * - api/health (健康檢查)
     * - _next/static (靜態檔案)
     * - _next/image (圖片優化)
     * - favicon.ico (網站圖示)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

