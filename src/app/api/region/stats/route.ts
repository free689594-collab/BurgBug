import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 區域統計 API
 * GET /api/region/stats
 * 
 * 功能：
 * 1. 根據上傳者的業務區域統計債務記錄筆數
 * 2. 會員看到 4 大區的展示數據（含灌水）
 * 3. 管理員看到 6 小區的實際數據、灌水量、展示數據
 * 
 * 區域對應：
 * - 北部 = 北北基宜 + 桃竹苗
 * - 中部 = 中彰投
 * - 南部 = 雲嘉南 + 高屏澎
 * - 東部 = 花東
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

    // 3. 檢查使用者角色
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = roleData && ['super_admin', 'admin'].includes(roleData.role)

    // 4. 查詢各小區的實際數據（根據上傳者的業務區域）
    // 先查詢所有債務記錄
    const { data: debtRecords, error: debtError } = await supabaseAdmin
      .from('debt_records')
      .select('uploaded_by')

    if (debtError) {
      console.error('Failed to query debt records:', debtError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢債務記錄失敗'),
        { status: 500 }
      )
    }

    // 查詢所有會員的業務區域
    const { data: members, error: membersError } = await supabaseAdmin
      .from('members')
      .select('user_id, business_region')

    if (membersError) {
      console.error('Failed to query members:', membersError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢會員資料失敗'),
        { status: 500 }
      )
    }

    // 建立會員 ID 到業務區域的映射
    const memberRegionMap: Record<string, string> = {}
    members?.forEach((member: any) => {
      memberRegionMap[member.user_id] = member.business_region
    })

    // 5. 統計各小區的實際筆數
    const actualCounts: Record<string, number> = {
      '北北基宜': 0,
      '桃竹苗': 0,
      '中彰投': 0,
      '雲嘉南': 0,
      '高屏澎': 0,
      '花東': 0,
    }

    debtRecords?.forEach((record: any) => {
      const region = memberRegionMap[record.uploaded_by]
      if (region && actualCounts.hasOwnProperty(region)) {
        actualCounts[region]++
      }
    })

    // 6. 讀取 display_overrides 配置
    const { data: configData } = await supabaseAdmin
      .from('system_config')
      .select('display_overrides')
      .eq('id', 1)
      .single()

    const overrides = configData?.display_overrides || {
      '北北基宜': 0,
      '桃竹苗': 0,
      '中彰投': 0,
      '雲嘉南': 0,
      '高屏澎': 0,
      '花東': 0,
    }

    // 7. 計算展示數據（實際 + 灌水）
    const displayCounts: Record<string, number> = {}
    Object.keys(actualCounts).forEach((region) => {
      displayCounts[region] = actualCounts[region] + (overrides[region] || 0)
    })

    // 8. 計算 4 大區統計
    const summary = {
      total: displayCounts['北北基宜'] + displayCounts['桃竹苗'] + 
             displayCounts['中彰投'] + displayCounts['雲嘉南'] + 
             displayCounts['高屏澎'] + displayCounts['花東'],
      north: displayCounts['北北基宜'] + displayCounts['桃竹苗'],
      central: displayCounts['中彰投'],
      south: displayCounts['雲嘉南'] + displayCounts['高屏澎'],
      east: displayCounts['花東'],
    }

    // 9. 根據角色回傳不同格式
    if (isAdmin) {
      // 管理員：回傳 6 小區詳細數據 + 4 大區統計
      const regions: Record<string, any> = {}
      Object.keys(actualCounts).forEach((region) => {
        regions[region] = {
          actual: actualCounts[region],
          override: overrides[region] || 0,
          display: displayCounts[region],
        }
      })

      const totals = {
        actual: Object.values(actualCounts).reduce((sum: number, count: any) => sum + (count || 0), 0),
        override: Object.values(overrides).reduce((sum: number, count: any) => sum + (count || 0), 0),
        display: summary.total,
      }

      return NextResponse.json(
        successResponse(
          {
            regions,
            summary,
            totals,
          },
          '區域統計查詢成功（管理員）'
        )
      )
    } else {
      // 會員：只回傳 4 大區的展示數據
      return NextResponse.json(
        successResponse(
          summary,
          '區域統計查詢成功'
        )
      )
    }

  } catch (error: any) {
    console.error('Region stats error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '區域統計查詢過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

