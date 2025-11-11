import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    // 1. 從 Authorization header 或 Cookie 取得 token
    let token: string | undefined

    // 優先從 Authorization header 取得
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '')
    } else {
      // 如果沒有 Authorization header，從 Cookie 取得
      token = req.cookies.get('access_token')?.value
    }

    if (!token) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 3. 取得會員資料（包含暱稱、業務類型、業務區域）
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('user_id, account, status, created_at, nickname, business_type, business_region')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '會員資料不存在'),
        { status: 404 }
      )
    }

    // 4. 取得角色
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    // 5. 取得統計資料
    const { data: stats } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 6. 查詢訂閱狀態
    const { data: subscriptionStatus, error: subError } = await supabaseAdmin
      .rpc('check_subscription_status', { p_user_id: user.id })
      .single<{
        status: string
        is_vip: boolean
        end_date: string | null
        days_remaining: number
        is_expired: boolean
      }>()

    if (subError) {
      console.error('查詢訂閱狀態失敗:', subError)
    }

    // 7. 查詢上傳額度
    const { data: uploadQuota } = await supabaseAdmin
      .rpc('check_usage_quota', {
        p_user_id: user.id,
        p_action_type: 'upload'
      })
      .single<{ limit_value: number; remaining: number }>()

    // 8. 查詢查詢額度
    const { data: queryQuota } = await supabaseAdmin
      .rpc('check_usage_quota', {
        p_user_id: user.id,
        p_action_type: 'query'
      })
      .single<{ limit_value: number; remaining: number }>()

    // 9. 從訂閱系統獲取額度資訊
    const uploadLimit = uploadQuota?.limit_value || 10
    const queryLimit = queryQuota?.limit_value || 10
    const uploadRemaining = uploadQuota?.remaining || 0
    const queryRemaining = queryQuota?.remaining || 0
    const uploadUsed = uploadLimit - uploadRemaining
    const queryUsed = queryLimit - queryRemaining

    // 10. 加上等級獎勵
    const uploadBonus = stats?.total_upload_quota_bonus || 0
    const queryBonus = stats?.total_query_quota_bonus || 0
    const totalUploadLimit = uploadLimit + uploadBonus
    const totalQueryLimit = queryLimit + queryBonus

    // 11. 回傳使用者資訊
    return NextResponse.json(
      successResponse({
        id: user.id,
        account: member.account,
        email: user.email,
        status: member.status,
        role: roleData?.role || 'user',
        created_at: member.created_at,
        nickname: member.nickname,
        business_type: member.business_type,
        business_region: member.business_region,
        // 等級資訊
        level_info: {
          current_level: stats?.activity_level || 1,
          title: stats?.title || '初入江湖',
          title_color: stats?.title_color || '#9CA3AF',
          activity_points: stats?.activity_points || 0
        },
        statistics: {
          likes_received: stats?.likes_received || 0,
          likes_given: stats?.likes_given || 0,
          uploads_count: stats?.uploads_count || 0,
          queries_count: stats?.queries_count || 0,
        },
        // 訂閱資訊
        subscription: subscriptionStatus ? {
          status: subscriptionStatus.status,
          is_vip: subscriptionStatus.is_vip,
          end_date: subscriptionStatus.end_date,
          days_remaining: subscriptionStatus.days_remaining,
          is_expired: subscriptionStatus.is_expired,
        } : null,
        // 額度資訊（從訂閱系統獲取）
        quota: {
          uploads_used: uploadUsed,
          queries_used: queryUsed,
          uploads_remaining: Math.max(0, totalUploadLimit - uploadUsed),
          queries_remaining: Math.max(0, totalQueryLimit - queryUsed),
          upload_limit: totalUploadLimit,
          query_limit: totalQueryLimit,
          // 保留舊的欄位名稱以保持向後相容
          remaining_uploads: Math.max(0, totalUploadLimit - uploadUsed),
          remaining_queries: Math.max(0, totalQueryLimit - queryUsed),
          daily_upload_limit: totalUploadLimit,
          daily_query_limit: totalQueryLimit,
        }
      })
    )

  } catch (error: any) {
    console.error('Get user error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '取得使用者資訊失敗',
        error.message
      ),
      { status: 500 }
    )
  }
}

