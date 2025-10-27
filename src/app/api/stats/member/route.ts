import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 會員個人統計 API
 * GET /api/stats/member
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 取得個人統計數據（上傳次數、查詢次數、讚數）
 * 3. 取得查詢配額資訊（今日剩餘次數）
 * 4. 取得個人排名資訊
 * 5. 取得個人貢獻度（佔總數的百分比）
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // 2. 驗證 token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 3. 取得會員統計資料
    const { data: stats } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // 4. 取得今日查詢次數（計算剩餘配額）
    const today = new Date().toISOString().split('T')[0]
    const { count: todaySearchCount } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'DEBT_SEARCH')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    const dailyLimit = 20 // TODO: 從會員設定中讀取
    const remainingSearches = Math.max(0, dailyLimit - (todaySearchCount || 0))

    // 5. 取得個人上傳排名
    const { data: uploadRanking } = await supabaseAdmin
      .rpc('get_upload_ranking', { target_user_id: user.id })

    // 6. 取得個人查詢排名
    const { data: queryRanking } = await supabaseAdmin
      .rpc('get_query_ranking', { target_user_id: user.id })

    // 7. 取得總債務筆數（計算貢獻度）
    const { count: totalDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })

    const contributionPercentage = totalDebts && totalDebts > 0
      ? ((stats?.uploads_count || 0) / totalDebts * 100).toFixed(2)
      : '0.00'

    // 8. 組合回傳資料
    const memberStats = {
      personal: {
        uploads_count: stats?.uploads_count || 0,
        queries_count: stats?.queries_count || 0,
        likes_received: stats?.likes_received || 0,
        likes_given: stats?.likes_given || 0,
      },
      quota: {
        daily_limit: dailyLimit,
        used_today: todaySearchCount || 0,
        remaining_today: remainingSearches,
        percentage_used: dailyLimit > 0 ? ((todaySearchCount || 0) / dailyLimit * 100).toFixed(1) : '0.0',
      },
      ranking: {
        upload_rank: uploadRanking?.rank || null,
        upload_total_users: uploadRanking?.total_users || null,
        query_rank: queryRanking?.rank || null,
        query_total_users: queryRanking?.total_users || null,
      },
      contribution: {
        uploads_count: stats?.uploads_count || 0,
        total_debts: totalDebts || 0,
        percentage: contributionPercentage,
      },
    }

    return NextResponse.json(
      successResponse(memberStats, '會員統計資料取得成功')
    )

  } catch (error: any) {
    console.error('Member stats query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '取得會員統計資料過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

