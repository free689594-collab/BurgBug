import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { SubscriptionStatusResponse, SubscriptionStatusResult } from '@/types/subscription'

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
 * GET /api/subscription/status
 * 查詢當前會員的訂閱狀態
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

    // 3. 呼叫資料庫函數查詢訂閱狀態
    const { data, error } = await supabaseAdmin
      .rpc('check_subscription_status', { p_user_id: user.id })
      .single()

    if (error) {
      console.error('查詢訂閱狀態失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢訂閱狀態失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到訂閱資料'),
        { status: 404 }
      )
    }

    // 4. 回傳訂閱狀態
    const result: SubscriptionStatusResult = {
      subscription_id: data.subscription_id,
      plan_name: data.plan_name,
      display_name: data.display_name,
      status: data.status,
      subscription_type: data.subscription_type,
      start_date: data.start_date,
      end_date: data.end_date,
      days_remaining: data.days_remaining,
      is_expired: data.is_expired,
      is_vip: data.is_vip,
      quota_type: data.quota_type,
      upload_used: data.upload_used,
      upload_limit: data.upload_limit,
      upload_remaining: data.upload_remaining,
      query_used: data.query_used,
      query_limit: data.query_limit,
      query_remaining: data.query_remaining,
    }

    return NextResponse.json(
      successResponse<SubscriptionStatusResult>(result)
    )

  } catch (error: any) {
    console.error('訂閱狀態 API 錯誤:', error)
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

