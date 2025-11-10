import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/admin/subscription/expiring
 * 查詢即將到期的訂閱列表（管理員用）
 * 
 * Query Parameters:
 * - days: 天數閾值（預設 7 天）
 * - limit: 每頁筆數（預設 50，最大 100）
 * - offset: 偏移量（預設 0）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 取得 token
    const token = request.cookies.get('access_token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    // 2. 驗證使用者身份
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 3. 檢查管理員權限
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !userRole || !['admin', 'super_admin'].includes(userRole.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '無權限訪問'),
        { status: 403 }
      )
    }

    // 3. 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 4. 查詢即將到期的訂閱
    const { data: subscriptions, error: queryError } = await supabaseAdmin
      .rpc('admin_get_expiring_subscriptions', {
        p_days_threshold: days,
        p_limit: limit,
        p_offset: offset
      })

    if (queryError) {
      console.error('查詢即將到期訂閱失敗:', queryError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢失敗',
          queryError.message
        ),
        { status: 500 }
      )
    }

    // 5. 返回結果
    return NextResponse.json(
      successResponse({
        subscriptions: subscriptions || [],
        pagination: {
          limit,
          offset,
          count: subscriptions?.length || 0
        }
      }, '查詢成功')
    )

  } catch (error) {
    console.error('管理員查詢即將到期訂閱 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error instanceof Error ? error.message : '未知錯誤'
      ),
      { status: 500 }
    )
  }
}

