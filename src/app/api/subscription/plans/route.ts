import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/subscription/plans
 * 查詢所有可用的訂閱計畫
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證 token'),
        { status: 401 }
      )
    }

    // 3. 查詢所有啟用的訂閱計畫
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true })

    if (error) {
      console.error('查詢訂閱計畫失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢訂閱計畫失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse(plans || [])
    )

  } catch (error: any) {
    console.error('訂閱計畫 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

