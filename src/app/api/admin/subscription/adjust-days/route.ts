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
 * POST /api/admin/subscription/adjust-days
 * 調整個人會員的訂閱天數（管理員專用）
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

    // 3. 檢查管理員權限
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 4. 解析請求參數
    const body = await request.json()
    const { subscription_id, days_to_adjust, reason } = body

    if (!subscription_id) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少 subscription_id 參數'),
        { status: 400 }
      )
    }

    if (days_to_adjust === undefined || days_to_adjust === 0) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '調整天數不能為 0'),
        { status: 400 }
      )
    }

    if (days_to_adjust < -365 || days_to_adjust > 365) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '調整天數範圍必須在 -365 到 365 之間'),
        { status: 400 }
      )
    }

    // 5. 查詢訂閱資料
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到該訂閱記錄'),
        { status: 404 }
      )
    }

    // 6. 計算新的到期日期
    const currentEndDate = new Date(subscription.end_date)
    const newEndDate = new Date(currentEndDate)
    newEndDate.setDate(newEndDate.getDate() + days_to_adjust)

    // 7. 檢查新的到期日期是否合理（不能早於今天）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (newEndDate < today) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '調整後的到期日期不能早於今天'),
        { status: 400 }
      )
    }

    // 8. 更新訂閱到期日期
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('member_subscriptions')
      .update({
        end_date: newEndDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription_id)
      .select('*')
      .single()

    if (updateError) {
      console.error('更新訂閱天數失敗:', updateError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '更新訂閱天數失敗',
          updateError.message
        ),
        { status: 500 }
      )
    }

    // 9. 記錄調整歷史（可選，如果有 subscription_history 表）
    // 這裡可以新增一筆記錄到歷史表，記錄誰在什麼時候調整了多少天

    // 10. 發送站內信通知會員（可選）
    const actionText = days_to_adjust > 0 ? '延長' : '縮短'
    const daysText = Math.abs(days_to_adjust)

    await supabaseAdmin
      .from('messages')
      .insert({
        receiver_id: subscription.user_id,
        sender_type: 'system',
        subject: '訂閱期限調整通知',
        content: `您好，管理員已${actionText}您的訂閱期限 ${daysText} 天。\n\n原到期日期：${new Date(subscription.end_date).toLocaleDateString('zh-TW')}\n新到期日期：${newEndDate.toLocaleDateString('zh-TW')}\n\n${reason ? `調整原因：${reason}` : ''}`,
        message_type: 'system',
        is_read: false
      })

    return NextResponse.json(
      successResponse({
        subscription: updatedSubscription,
        old_end_date: subscription.end_date,
        new_end_date: newEndDate.toISOString(),
        days_adjusted: days_to_adjust
      }, `成功${actionText}訂閱 ${daysText} 天`)
    )

  } catch (error: any) {
    console.error('調整訂閱天數 API 錯誤:', error)
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

