import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 系統整體統計 API（僅限管理員）
 * GET /api/stats/system
 *
 * 功能：
 * 1. 驗證管理員權限
 * 2. 取得總債務人數量（去重 debtor_id_full）
 * 3. 取得總債務筆數
 * 4. 取得今日/本週/本月新增債務筆數
 * 5. 取得地區分佈統計
 * 6. 取得還款狀況分佈統計
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

    // 3. 檢查管理員權限
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限才能查看系統統計'),
        { status: 403 }
      )
    }

    // 4. 取得總債務筆數
    const { count: totalDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })

    // 5. 取得總債務人數量（去重）
    const { data: uniqueDebtors } = await supabaseAdmin
      .from('debt_records')
      .select('debtor_id_full')

    const uniqueDebtorCount = uniqueDebtors
      ? new Set(uniqueDebtors.map(d => d.debtor_id_full)).size
      : 0

    // 5. 取得今日新增債務筆數
    const today = new Date().toISOString().split('T')[0]
    const { count: todayDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lte('created_at', `${today}T23:59:59.999Z`)

    // 6. 取得本週新增債務筆數
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const { count: weekDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())

    // 7. 取得本月新增債務筆數
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const { count: monthDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())

    // 8. 取得地區分佈統計
    const { data: regionData } = await supabaseAdmin
      .from('debt_records')
      .select('residence')

    const regionDistribution = regionData?.reduce((acc: any, record) => {
      const region = record.residence || '未知'
      acc[region] = (acc[region] || 0) + 1
      return acc
    }, {}) || {}

    // 9. 取得還款狀況分佈統計
    const { data: statusData } = await supabaseAdmin
      .from('debt_records')
      .select('repayment_status')

    const statusDistribution = statusData?.reduce((acc: any, record) => {
      const status = record.repayment_status || '未知'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

    // 10. 組合回傳資料
    const systemStats = {
      overview: {
        total_debtors: uniqueDebtorCount,
        total_debts: totalDebts || 0,
        today_debts: todayDebts || 0,
        week_debts: weekDebts || 0,
        month_debts: monthDebts || 0,
      },
      distribution: {
        by_region: regionDistribution,
        by_status: statusDistribution,
      },
    }

    return NextResponse.json(
      successResponse(systemStats, '系統統計資料取得成功')
    )

  } catch (error: any) {
    console.error('System stats query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '取得系統統計資料過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

