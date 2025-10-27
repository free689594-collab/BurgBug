import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import {
  accountToEmail,
  validateAccount,
  validatePassword,
  generateDeviceFingerprint
} from '@/lib/auth/utils'

/**
 * 根據使用者角色和狀態決定登入後的導向路徑
 */
function getRedirectPath(status: string, role: string): string {
  // 管理員（super_admin 和 admin）優先導向管理後台
  if (role === 'super_admin' || role === 'admin') {
    return '/admin/dashboard'
  }

  // 一般會員根據狀態導向
  if (status === 'approved') {
    return '/dashboard'
  } else if (status === 'pending') {
    return '/waiting-approval?status=pending'
  } else if (status === 'suspended') {
    // suspended 會員導向 waiting-approval 頁面，並顯示停用訊息
    return '/waiting-approval?status=suspended'
  } else {
    // 其他未知狀態，預設導向 waiting-approval
    return '/waiting-approval'
  }
}

// Create a fresh client for each request to handle auth properly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { account, password } = body

    // 1. 驗證輸入格式
    if (!account || !password) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '帳號和密碼為必填欄位'),
        { status: 400 }
      )
    }

    if (!validateAccount(account)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR, 
          '帳號格式錯誤（5-15 字元，僅允許英文字母和數字）'
        ),
        { status: 400 }
      )
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '密碼至少需要 8 個字元'),
        { status: 400 }
      )
    }

    // 2. 轉換帳號為 email 格式
    const email = accountToEmail(account)

    // 3. 使用 Supabase Auth 登入（建立新的客戶端實例）
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // 記錄失敗的登入嘗試
      console.error('Login failed:', authError.message)

      return NextResponse.json(
        errorResponse(
          ErrorCodes.UNAUTHORIZED,
          '帳號或密碼錯誤'
        ),
        { status: 401 }
      )
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '登入失敗'),
        { status: 401 }
      )
    }

    // 4. 檢查會員狀態
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('user_id, account, status')
      .eq('user_id', authData.user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '會員資料不存在'),
        { status: 404 }
      )
    }

    // 僅阻擋 suspended 會員登入
    // pending 會員可以登入，但會被中間件導向 /waiting-approval
    if (member.status === 'suspended') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '帳號已被停用，請聯絡管理員'),
        { status: 403 }
      )
    }

    // 5. 取得使用者角色
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .single()

    // 6. 單裝置控制：更新 active_sessions
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const deviceFingerprint = generateDeviceFingerprint(userAgent)

    // 從 JWT token 中解析 session_id
    // Supabase Auth 的 JWT payload 包含 session_id
    let sessionId: string
    try {
      const tokenPayload = JSON.parse(
        Buffer.from(authData.session.access_token.split('.')[1], 'base64').toString()
      )
      sessionId = tokenPayload.session_id || authData.session.access_token.substring(0, 36)
    } catch (e) {
      // 如果解析失敗，使用 access_token 的前 36 字元作為 session_id
      sessionId = authData.session.access_token.substring(0, 36)
    }

    const { error: sessionError } = await supabaseAdmin
      .from('active_sessions')
      .upsert({
        user_id: authData.user.id,
        session_id: sessionId,
        device_fingerprint: deviceFingerprint,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (sessionError) {
      console.error('Failed to update active_sessions:', sessionError)
      // 不阻塞登入流程，僅記錄錯誤
    }

    // 7. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'LOGIN',
        p_resource: 'auth',
        p_resource_id: authData.user.id,
        p_meta: {
          account: member.account,
          device_fingerprint: deviceFingerprint
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
    }

    // 8. 處理每日登入點數和連續登入天數
    let activityResult = null
    try {
      // 檢查今天是否已登入
      const today = new Date().toISOString().split('T')[0]
      const { data: stats } = await supabaseAdmin
        .from('member_statistics')
        .select('last_login_date, consecutive_login_days')
        .eq('user_id', authData.user.id)
        .single()

      const lastLoginDate = stats?.last_login_date
      const shouldAddPoints = lastLoginDate !== today

      if (shouldAddPoints) {
        // 計算連續登入天數
        let newConsecutiveDays = 1
        if (lastLoginDate) {
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]

          if (lastLoginDate === yesterdayStr) {
            // 昨天有登入，連續天數 +1
            newConsecutiveDays = (stats?.consecutive_login_days || 0) + 1
          }
          // 如果不是昨天登入，則重置為 1
        }

        // 更新最後登入日期和連續登入天數
        await supabaseAdmin
          .from('member_statistics')
          .update({
            last_login_date: today,
            consecutive_login_days: newConsecutiveDays
          })
          .eq('user_id', authData.user.id)

        // 新增每日登入點數（優化：直接呼叫資料庫函數）
        const { data: loginPointsResult, error: loginPointsError } = await supabaseAdmin.rpc('add_daily_login_points', {
          p_user_id: authData.user.id,
          p_consecutive_days: newConsecutiveDays,
          p_login_date: today
        })

        if (!loginPointsError && loginPointsResult) {
          activityResult = loginPointsResult
        }
      }
    } catch (err) {
      console.error('Failed to process daily login:', err)
      // 不阻塞主流程
    }

    // 9. 回傳成功響應（包含建議的導向路徑）
    const userRole = roleData?.role || 'user'
    const redirectTo = getRedirectPath(member.status, userRole)

    // 建立回應並設置 Cookie，提供給 middleware 驗證使用
    const response = NextResponse.json(
      successResponse({
        user: {
          id: authData.user.id,
          account: member.account,
          email: authData.user.email,
          status: member.status,
          role: userRole,
        },
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at,
        },
        redirectTo, // 新增：建議的導向路徑
        activity: activityResult, // 活躍度點數資訊
      }, '登入成功')
    )

    // 將 secure 與實際連線協定綁定：本地 http 不設 Secure，HTTPS 才設 Secure
    const isSecure = new URL(req.url).protocol === 'https:'
    const maxAge = Math.max(0, (authData.session.expires_at ?? 0) - Math.floor(Date.now() / 1000)) || 60 * 60 * 2 // 預設 2 小時

    // 設置 HttpOnly Cookie，僅供伺服器端（含 middleware）讀取
    response.cookies.set('access_token', authData.session.access_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge,
    })
    response.cookies.set('refresh_token', authData.session.refresh_token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 天
    })

    return response

  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '登入過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

