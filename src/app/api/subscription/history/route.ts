import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/subscription/history
 * 查詢會員的訂閱歷史（最近 3 筆）
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

    // 3. 查詢訂閱歷史
    const { data: history, error: historyError } = await supabase
      .rpc('get_subscription_history', {
        p_user_id: user.id
      })

    if (historyError) {
      console.error('查詢訂閱歷史失敗:', historyError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢失敗',
          historyError.message
        ),
        { status: 500 }
      )
    }

    // 4. 返回結果
    return NextResponse.json(
      successResponse({
        history: history || []
      }, '查詢成功')
    )

  } catch (error) {
    console.error('訂閱歷史 API 錯誤:', error)
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

