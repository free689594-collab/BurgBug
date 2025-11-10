import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/admin/analytics/revenue-trends
 * 取得收入趨勢資料（管理員用）
 * 
 * Query Parameters:
 * - period: 統計週期 ('day', 'week', 'month'，預設 'day')
 * - start_date: 開始日期（ISO 8601 格式，可選）
 * - end_date: 結束日期（ISO 8601 格式，可選）
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

    // 4. 解析查詢參數
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'day'
    const startDate = searchParams.get('start_date') || null
    const endDate = searchParams.get('end_date') || null

    // 驗證 period 參數
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INVALID_INPUT, '無效的統計週期'),
        { status: 400 }
      )
    }

    // 5. 呼叫資料庫函數
    const { data: trends, error: trendsError } = await supabaseAdmin
      .rpc('get_revenue_trends', {
        p_period: period,
        p_start_date: startDate,
        p_end_date: endDate
      })

    if (trendsError) {
      console.error('查詢收入趨勢失敗:', trendsError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢失敗',
          trendsError.message
        ),
        { status: 500 }
      )
    }

    // 6. 返回結果
    return NextResponse.json(
      successResponse({
        trends: trends || [],
        period
      }, '查詢成功')
    )

  } catch (error) {
    console.error('收入趨勢 API 錯誤:', error)
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

