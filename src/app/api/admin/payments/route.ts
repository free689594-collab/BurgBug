import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/admin/payments
 * 查詢所有付款記錄（管理員用，支援分頁和篩選）
 * 
 * Query Parameters:
 * - status: 付款狀態（pending/completed/failed）
 * - method: 付款方式（atm/barcode/cvs）
 * - account: 會員帳號（模糊搜尋）
 * - start_date: 開始日期（ISO 8601 格式）
 * - end_date: 結束日期（ISO 8601 格式）
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
    const status = searchParams.get('status') || null
    const method = searchParams.get('method') || null
    const account = searchParams.get('account') || null
    const startDate = searchParams.get('start_date') || null
    const endDate = searchParams.get('end_date') || null
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // 4. 查詢付款記錄
    const { data: payments, error: paymentsError } = await supabaseAdmin
      .rpc('admin_get_payment_records', {
        p_payment_status: status,
        p_payment_method: method,
        p_account: account,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: limit,
        p_offset: offset
      })

    if (paymentsError) {
      console.error('查詢付款記錄失敗:', paymentsError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢失敗',
          paymentsError.message
        ),
        { status: 500 }
      )
    }

    // 5. 查詢總數
    const { data: totalCount, error: countError } = await supabaseAdmin
      .rpc('admin_count_payment_records', {
        p_payment_status: status,
        p_payment_method: method,
        p_account: account,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (countError) {
      console.error('統計付款記錄失敗:', countError)
    }

    // 6. 返回結果
    return NextResponse.json(
      successResponse({
        payments: payments || [],
        pagination: {
          total: totalCount || 0,
          limit,
          offset,
          has_more: (offset + limit) < (totalCount || 0)
        }
      }, '查詢成功')
    )

  } catch (error) {
    console.error('管理員查詢付款記錄 API 錯誤:', error)
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

