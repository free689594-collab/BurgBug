import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/admin/subscription/notifications
 * 查詢訂閱通知統計和歷史記錄
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 驗證 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

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

    // 4. 取得查詢參數
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const notificationType = searchParams.get('type') // 'expiry_7days', 'expiry_3days', 'expiry_1day', 'expired'

    // 5. 查詢通知統計
    const { data: stats, error: statsError } = await supabaseAdmin.rpc('get_notification_stats')

    if (statsError) {
      console.error('查詢通知統計失敗:', statsError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢通知統計失敗'),
        { status: 500 }
      )
    }

    // 6. 查詢通知歷史記錄
    let query = supabaseAdmin
      .from('subscription_notifications')
      .select(`
        id,
        user_id,
        subscription_id,
        notification_type,
        is_sent,
        sent_at,
        created_at,
        message_id,
        members!inner(account, nickname)
      `)
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

    // 7. 查詢 pg_cron 排程狀態
    const { data: cronJobs, error: cronError } = await supabaseAdmin.rpc('get_cron_jobs')

    if (cronError) {
      console.error('查詢排程任務失敗:', cronError)
    }

    // 8. 返回結果
    return NextResponse.json(
      successResponse({
        stats: stats || {
          total_notifications: 0,
          sent_today: 0,
          sent_this_week: 0,
          sent_this_month: 0,
          by_type: {
            expiry_7days: 0,
            expiry_3days: 0,
            expiry_1day: 0,
            expired: 0
          }
        },
        notifications: notifications || [],
        cron_jobs: cronJobs || [],
        pagination: {
          limit,
          offset,
          total: notifications?.length || 0
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

/**
 * POST /api/admin/subscription/notifications
 * 手動觸發訂閱通知檢查
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 驗證 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

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

    // 4. 解析請求參數
    const body = await request.json()
    const { action } = body // 'send_notifications' 或 'send_expired_notifications'

    if (!action || !['send_notifications', 'send_expired_notifications'].includes(action)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的操作類型'),
        { status: 400 }
      )
    }

    // 5. 執行對應的函數
    let result
    if (action === 'send_notifications') {
      const { data, error } = await supabaseAdmin.rpc('send_subscription_notifications')
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabaseAdmin.rpc('send_expired_subscription_notifications')
      if (error) throw error
      result = data
    }

    // 6. 返回結果
    return NextResponse.json(
      successResponse({
        action,
        notifications_sent: result?.[0]?.notifications_sent || 0,
        notifications_details: result?.[0]?.notifications_details || [],
        message: `成功發送 ${result?.[0]?.notifications_sent || 0} 則通知`
      })
    )
  } catch (error) {
    console.error('手動觸發訂閱通知失敗:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '手動觸發訂閱通知失敗'),
      { status: 500 }
    )
  }
}

