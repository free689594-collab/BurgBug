import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 取得系統統計資訊（僅限管理員）
 * GET /api/admin/stats
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證管理員權限
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

    // 3. 檢查管理員權限（允許 super_admin 和 admin）
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

    // 4. 取得會員統計
    const { data: memberStats } = await supabaseAdmin.rpc('get_member_stats')

    // 5. 取得債務記錄統計
    const { data: debtStats } = await supabaseAdmin.rpc('get_debt_stats')

    // 6. 取得系統活動統計（最近 24 小時）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: recentActivityCount } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twentyFourHoursAgo)

    // 7. 取得本週新增會員數
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: weekMembers } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())

    // 8. 取得本月新增會員數
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const { count: monthMembers } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())

    // 9. 取得本週新增債務筆數
    const { count: weekDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())

    // 10. 取得本月新增債務筆數
    const { count: monthDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())

    // 11. 取得總債務人數量（去重）
    const { data: uniqueDebtors } = await supabaseAdmin
      .from('debt_records')
      .select('debtor_id_full')

    const uniqueDebtorCount = uniqueDebtors
      ? new Set(uniqueDebtors.map(d => d.debtor_id_full)).size
      : 0

    // 12. 取得地區分佈統計
    const { data: regionData } = await supabaseAdmin
      .from('debt_records')
      .select('residence')

    const regionDistribution = regionData?.reduce((acc: any, record) => {
      const region = record.residence || '未知'
      acc[region] = (acc[region] || 0) + 1
      return acc
    }, {}) || {}

    // 13. 組合統計資料
    const stats = {
      members: {
        ...(memberStats || {
          total: 0,
          pending: 0,
          approved: 0,
          suspended: 0,
          today: 0
        }),
        week: weekMembers || 0,
        month: monthMembers || 0,
      },
      debts: {
        ...(debtStats || {
          total: 0,
          today: 0
        }),
        week: weekDebts || 0,
        month: monthDebts || 0,
        unique_debtors: uniqueDebtorCount,
      },
      activity: {
        last24Hours: recentActivityCount || 0
      },
      distribution: {
        by_region: regionDistribution,
      }
    }

    // 14. 回傳結果
    return NextResponse.json(
      successResponse(stats, '統計資料取得成功')
    )

  } catch (error: any) {
    console.error('Stats query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '取得統計資料過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

