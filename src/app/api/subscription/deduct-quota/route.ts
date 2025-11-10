import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { QuotaDeductResponse, QuotaDeductResult, DeductQuotaRequest } from '@/types/subscription'

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
 * POST /api/subscription/deduct-quota
 * 扣除會員的使用額度
 */
export async function POST(request: NextRequest) {
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

    // 3. 解析請求參數
    const body: DeductQuotaRequest = await request.json()
    const { action_type } = body

    if (!action_type || !['upload', 'query'].includes(action_type)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的操作類型，必須是 upload 或 query'),
        { status: 400 }
      )
    }

    // 4. 呼叫資料庫函數扣除額度
    const { data, error } = await supabaseAdmin
      .rpc('deduct_usage_quota', {
        p_user_id: user.id,
        p_action_type: action_type
      })
      .single()

    if (error) {
      console.error('扣除額度失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '扣除額度失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    // 5. 解析結果
    const success = data.success as boolean
    const remaining = data.remaining as number
    const message = data.message as string

    const result: QuotaDeductResult = {
      success: success,
      remaining: remaining,
      message: message
    }

    // 6. 如果額度不足，回傳 403
    if (!success) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, message),
        { status: 403 }
      )
    }

    return NextResponse.json(
      successResponse<QuotaDeductResult>(result)
    )

  } catch (error: any) {
    console.error('額度扣除 API 錯誤:', error)
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

