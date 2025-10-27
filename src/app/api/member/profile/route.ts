import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse } from '@/lib/api/response'

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
 * GET /api/member/profile
 * 取得會員完整資料
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('未提供認證 token', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('認證失敗', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    // 3. 取得會員基本資料
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, account, nickname, business_type, business_region, status, created_at')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse('找不到會員資料', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // 4. 取得會員統計資料
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (statsError) {
      console.error('Failed to fetch member statistics:', statsError)
    }

    // 5. 取得會員勳章
    const { data: badges, error: badgesError } = await supabaseAdmin
      .from('member_badges')
      .select(`
        badge_key,
        unlocked_at,
        badge_config (
          badge_name,
          description,
          difficulty,
          icon_name
        )
      `)
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    if (badgesError) {
      console.error('Failed to fetch member badges:', badgesError)
    }

    // 6. 取得下一等級資訊
    const currentLevel = stats?.activity_level || 1
    const { data: nextLevelData } = await supabaseAdmin
      .from('level_config')
      .select('level, required_points')
      .gt('level', currentLevel)
      .order('level', { ascending: true })
      .limit(1)
      .single()

    const nextLevelPoints = nextLevelData?.required_points || 0
    const currentPoints = stats?.activity_points || 0
    const progressPercentage = nextLevelPoints > 0
      ? Math.min(100, Math.round((currentPoints / nextLevelPoints) * 100))
      : 100

    // 7. 取得每日配額資訊（使用 usage_counters 表）
    const today = new Date().toISOString().split('T')[0]

    // 從 usage_counters 取得今日上傳和查詢次數
    const { data: quotaData } = await supabaseAdmin
      .from('usage_counters')
      .select('uploads, queries')
      .eq('user_id', user.id)
      .eq('day', today)
      .maybeSingle()

    const todayUploadCount = quotaData?.uploads || 0
    const todaySearchCount = quotaData?.queries || 0

    // 基礎配額
    const baseUploadLimit = 10
    const baseQueryLimit = 20

    // 加上等級獎勵
    const dailyUploadLimit = baseUploadLimit + (stats?.total_upload_quota_bonus || 0)
    const dailyQueryLimit = baseQueryLimit + (stats?.total_query_quota_bonus || 0)

    // 8. 格式化勳章資料
    const formattedBadges = (badges || []).map(badge => ({
      badge_key: badge.badge_key,
      badge_name: (badge.badge_config as any)?.badge_name || '',
      description: (badge.badge_config as any)?.description || '',
      difficulty: (badge.badge_config as any)?.difficulty || 'easy',
      icon_name: (badge.badge_config as any)?.icon_name || 'Award',
      unlocked_at: badge.unlocked_at
    }))

    // 9. 組合回應資料
    const profileData = {
      user: {
        id: member.id,
        account: member.account,
        nickname: member.nickname,
        business_type: member.business_type,
        business_region: member.business_region,
        status: member.status,
        created_at: member.created_at
      },
      level: {
        current_level: currentLevel,
        title: stats?.title || '初入江湖',
        title_color: stats?.title_color || '#9CA3AF',
        activity_points: currentPoints,
        next_level_points: nextLevelPoints,
        progress_percentage: progressPercentage,
        total_upload_bonus: stats?.total_upload_quota_bonus || 0,
        total_query_bonus: stats?.total_query_quota_bonus || 0
      },
      badges: formattedBadges,
      stats: {
        total_uploads: todayUploadCount,  // 今日上傳次數
        total_queries: todaySearchCount,  // 今日查詢次數
        consecutive_login_days: stats?.consecutive_login_days || 0,
        total_badges: formattedBadges.length,
        last_login_date: stats?.last_login_date || today
      },
      quotas: {
        daily_upload_limit: dailyUploadLimit,
        daily_query_limit: dailyQueryLimit,
        remaining_uploads: Math.max(0, dailyUploadLimit - todayUploadCount),
        remaining_queries: Math.max(0, dailyQueryLimit - todaySearchCount)
      }
    }

    return NextResponse.json(
      successResponse(profileData, '取得會員資料成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Get member profile error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

