import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api-response'

/**
 * GET /api/subscription/notifications
 * 查詢會員自己的訂閱通知歷史記錄
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    // 2. 取得查詢參數
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const notificationType = searchParams.get('type') // 'expiry_7days', 'expiry_3days', 'expiry_1day', 'expired'

    // 3. 查詢會員的通知歷史記錄
    let query = supabase
      .from('subscription_notifications')
      .select(`
        id,
        subscription_id,
        notification_type,
        is_sent,
        sent_at,
        created_at,
        message_id,
        messages(
          id,
          title,
          content,
          is_read,
          read_at,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 如果指定了通知類型，則過濾
    if (notificationType) {
      query = query.eq('notification_type', notificationType)
    }

    const { data: notifications, error: notificationsError } = await query

    if (notificationsError) {
      console.error('查詢通知歷史失敗:', notificationsError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢通知歷史失敗'),
        { status: 500 }
      )
    }

    // 4. 查詢總數（用於分頁）
    let countQuery = supabase
      .from('subscription_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (notificationType) {
      countQuery = countQuery.eq('notification_type', notificationType)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('查詢通知總數失敗:', countError)
    }

    // 5. 返回結果
    return NextResponse.json(
      successResponse({
        notifications: notifications || [],
        pagination: {
          limit,
          offset,
          total: count || 0,
          has_more: (count || 0) > offset + limit
        }
      })
    )
  } catch (error) {
    console.error('查詢訂閱通知失敗:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '查詢訂閱通知失敗'),
      { status: 500 }
    )
  }
}

