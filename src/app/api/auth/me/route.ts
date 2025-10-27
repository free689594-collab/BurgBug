import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

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

    // 6. 取得今日配額使用情況
    const today = new Date().toISOString().split('T')[0]
    const { data: quotaData } = await supabaseAdmin
      .from('usage_counters')
      .select('uploads, queries')
      .eq('user_id', user.id)
      .eq('day', today)
      .single()

    // 7. 計算配額（包含等級獎勵）
    const baseUploadLimit = 10
    const baseQueryLimit = 20
    const uploadBonus = stats?.total_upload_quota_bonus || 0
    const queryBonus = stats?.total_query_quota_bonus || 0
    const dailyUploadLimit = baseUploadLimit + uploadBonus
    const dailyQueryLimit = baseQueryLimit + queryBonus

    // 8. 回傳使用者資訊
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
        quota: {
          uploads_today: quotaData?.uploads || 0,
          queries_today: quotaData?.queries || 0,
          // 使用與 /profile 頁面相同的欄位名稱
          remaining_uploads: Math.max(0, dailyUploadLimit - (quotaData?.uploads || 0)),
          remaining_queries: Math.max(0, dailyQueryLimit - (quotaData?.queries || 0)),
          // 保留舊的欄位名稱以保持向後相容
          uploads_remaining: Math.max(0, dailyUploadLimit - (quotaData?.uploads || 0)),
          queries_remaining: Math.max(0, dailyQueryLimit - (quotaData?.queries || 0)),
          daily_upload_limit: dailyUploadLimit,
          daily_query_limit: dailyQueryLimit,
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

