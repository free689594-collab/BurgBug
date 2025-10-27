import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 報表查詢 API（僅限管理員）
 * GET /api/reports/query?start_date=2024-01-01&end_date=2024-12-31&group_by=region
 * 
 * Query Parameters:
 * - start_date: 開始日期（ISO 8601 格式，可選）
 * - end_date: 結束日期（ISO 8601 格式，可選）
 * - group_by: 分組方式（region, status, date，可選）
 * - region: 地區篩選（可選）
 * - status: 還款狀況篩選（可選）
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

    // 4. 解析查詢參數
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const groupBy = searchParams.get('group_by')
    const region = searchParams.get('region')
    const status = searchParams.get('status')

    // 5. 建立基礎查詢
    let query = supabaseAdmin
      .from('debt_records')
      .select('*')

    // 套用日期篩選
    if (startDate) {
      query = query.gte('created_at', startDate)
    }
    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    // 套用地區篩選
    if (region) {
      query = query.eq('residence', region)
    }

    // 套用還款狀況篩選
    if (status) {
      query = query.eq('repayment_status', status)
    }

    const { data: records, error: queryError } = await query

    if (queryError) {
      console.error('Failed to query debt records:', queryError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 6. 根據分組方式統計
    let groupedData: any = {}

    if (groupBy === 'region') {
      // 按地區分組
      groupedData = records?.reduce((acc: any, record) => {
        const key = record.residence || '未知'
        if (!acc[key]) {
          acc[key] = {
            count: 0,
            total_face_value: 0,
            statuses: {},
          }
        }
        acc[key].count++
        acc[key].total_face_value += parseFloat(record.face_value || '0')
        const recordStatus = record.repayment_status || '未知'
        acc[key].statuses[recordStatus] = (acc[key].statuses[recordStatus] || 0) + 1
        return acc
      }, {})
    } else if (groupBy === 'status') {
      // 按還款狀況分組
      groupedData = records?.reduce((acc: any, record) => {
        const key = record.repayment_status || '未知'
        if (!acc[key]) {
          acc[key] = {
            count: 0,
            total_face_value: 0,
            regions: {},
          }
        }
        acc[key].count++
        acc[key].total_face_value += parseFloat(record.face_value || '0')
        const recordRegion = record.residence || '未知'
        acc[key].regions[recordRegion] = (acc[key].regions[recordRegion] || 0) + 1
        return acc
      }, {})
    } else if (groupBy === 'date') {
      // 按日期分組
      groupedData = records?.reduce((acc: any, record) => {
        const key = record.created_at.split('T')[0]
        if (!acc[key]) {
          acc[key] = {
            count: 0,
            total_face_value: 0,
          }
        }
        acc[key].count++
        acc[key].total_face_value += parseFloat(record.face_value || '0')
        return acc
      }, {})
    }

    // 7. 計算總計
    const summary = {
      total_records: records?.length || 0,
      total_face_value: records?.reduce((sum, r) => sum + parseFloat(r.face_value || '0'), 0) || 0,
      unique_debtors: records ? new Set(records.map(r => r.debtor_id_full)).size : 0,
      date_range: {
        start: startDate || '不限',
        end: endDate || '不限',
      },
      filters: {
        region: region || '全部',
        status: status || '全部',
      },
    }

    // 8. 回傳結果
    return NextResponse.json(
      successResponse(
        {
          summary,
          grouped_data: groupedData,
          group_by: groupBy || 'none',
        },
        '報表查詢成功'
      )
    )

  } catch (error: any) {
    console.error('Report query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '報表查詢過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

