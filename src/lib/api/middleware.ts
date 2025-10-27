import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, ErrorCodes } from './response'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理路徑前綴清單
 */
const ADMIN_PREFIXES = ['/admin', '/api/admin']

/**
 * 判斷路徑是否為管理路徑
 */
export function isAdminRoute(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  } catch {
    return false
  }
}

/**
 * 判斷路徑是否需要認證
 */
export function requireAuth(url: string): boolean {
  try {
    const pathname = new URL(url).pathname

    // 公開路徑清單
    const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/health']

    // 檢查是否為公開路徑
    if (publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
      return false
    }

    // 其他路徑都需要認證
    return true
  } catch {
    return false
  }
}

/**
 * 從請求中取得當前使用者
 * 支援從 Authorization header 或 cookie 取得 token
 */
export async function getCurrentUser(req: NextRequest): Promise<any | null> {
  try {
    // 1. 嘗試從 Authorization header 取得 token
    let token = req.headers.get('authorization')?.replace('Bearer ', '')

    // 2. 如果 header 沒有，嘗試從 cookie 取得
    if (!token) {
      token = req.cookies.get('access_token')?.value
    }

    if (!token) {
      return null
    }

    // 3. 使用 Supabase 驗證 token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return null
    }

    // 4. 取得會員資料和角色
    const { data: member } = await supabase
      .from('members')
      .select('account, status')
      .eq('user_id', user.id)
      .single()

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    return {
      id: user.id,
      email: user.email,
      account: member?.account,
      status: member?.status,
      role: roleData?.role || 'user',
    }
  } catch (error) {
    console.error('getCurrentUser error:', error)
    return null
  }
}

// 錯誤處理中間件
export async function withErrorHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      return await handler(req)
    } catch (error: any) {
      console.error('API Error:', error)
      
      // 記錄到審計日誌（可選）
      // await logAudit('API_ERROR', 'api', null, { error: error.message })
      
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          error.message || '伺服器內部錯誤',
          process.env.NODE_ENV === 'development' ? error.stack : undefined
        ),
        { status: 500 }
      )
    }
  }
}

/**
 * 認證中間件
 * 驗證使用者身份並注入到 handler
 */
export async function withAuth(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌或令牌無效'),
        { status: 401 }
      )
    }

    return await handler(req, user)
  }
}

/**
 * 管理員權限中間件
 * 驗證使用者是否為管理員（super_admin 或 admin）
 */
export async function requireAdmin(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未授權訪問'),
        { status: 401 }
      )
    }

    if (!['super_admin', 'admin'].includes(user.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    return await handler(req, user)
  }
}

/**
 * 最高權限管理員中間件
 * 驗證使用者是否為 super_admin
 */
export async function requireSuperAdmin(
  handler: (req: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req)

    if (!user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未授權訪問'),
        { status: 401 }
      )
    }

    if (user.role !== 'super_admin') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要最高權限管理員'),
        { status: 403 }
      )
    }

    return await handler(req, user)
  }
}

