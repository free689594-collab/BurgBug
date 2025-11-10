import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * POST /api/admin/subscription/extend
 * 管理員延長訂閱期限
 * 
 * Request Body:
 * {
 *   "subscription_id": "uuid",
 *   "extend_days": 1-100,
 *   "admin_note": "延長原因（選填）"
 * }
 */
export async function POST(request: NextRequest) {
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

    // 3. 解析請求參數
    const body = await request.json()
    const { subscription_id, extend_days, admin_note } = body

    if (!subscription_id) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少訂閱 ID'),
        { status: 400 }
      )
    }

    if (!extend_days || extend_days < 1 || extend_days > 100) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '延長天數必須在 1-100 天之間'),
        { status: 400 }
      )
    }

    // 4. 呼叫資料庫函數延長訂閱
    const { data, error } = await supabaseAdmin
      .rpc('admin_extend_subscription', {
        p_subscription_id: subscription_id,
        p_extend_days: extend_days,
        p_admin_note: admin_note || null
      })
      .single<{
        success: boolean
        message: string
        subscription_id?: string
        old_end_date?: string
        new_end_date?: string
        extended_days?: number
      }>()

    if (error) {
      console.error('延長訂閱失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '延長訂閱失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    // 5. 檢查執行結果
    if (!data || !data.success) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.BUSINESS_ERROR,
          data?.message || '延長訂閱失敗'
        ),
        { status: 400 }
      )
    }

    // 6. 返回成功結果
    return NextResponse.json(
      successResponse({
        subscription_id: data.subscription_id,
        old_end_date: data.old_end_date,
        new_end_date: data.new_end_date,
        extended_days: data.extended_days,
        message: data.message
      }, '訂閱已成功延長')
    )

  } catch (error) {
    console.error('管理員延長訂閱 API 錯誤:', error)
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

