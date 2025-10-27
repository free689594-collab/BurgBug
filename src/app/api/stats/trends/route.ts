import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 趨勢統計 API（僅限管理員）
 * GET /api/stats/trends?days=7&type=uploads
 *
 * Query Parameters:
 * - days: 天數（7, 30, 90，預設 7）
 * - type: 類型（uploads, queries, all，預設 all）
 *
 * 功能：
 * 1. 驗證管理員權限
 * 2. 取得最近 N 天的新增趨勢
 * 3. 取得每日上傳量統計
 * 4. 取得每日查詢量統計
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
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限才能查看趨勢統計'),
        { status: 403 }
      )
    }

    // 4. 解析查詢參數
    const { searchParams } = new URL(req.url)
    const days = Math.min(parseInt(searchParams.get('days') || '7'), 90)
    const type = searchParams.get('type') || 'all'

    // 5. 計算日期範圍
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // 6. 取得每日上傳量統計
    let uploadTrends: any[] = []
    if (type === 'uploads' || type === 'all') {
      const { data: uploadData } = await supabaseAdmin
        .from('debt_records')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // 按日期分組統計
      const uploadsByDate: { [key: string]: number } = {}
      uploadData?.forEach(record => {
        const date = record.created_at.split('T')[0]
        uploadsByDate[date] = (uploadsByDate[date] || 0) + 1
      })

      // 填充缺失的日期（確保每天都有數據）
      uploadTrends = []
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        uploadTrends.push({
          date: dateStr,
          count: uploadsByDate[dateStr] || 0,
        })
      }
    }

    // 6. 取得每日查詢量統計
    let queryTrends: any[] = []
    if (type === 'queries' || type === 'all') {
      const { data: queryData } = await supabaseAdmin
        .from('audit_logs')
        .select('created_at')
        .eq('action', 'DEBT_SEARCH')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // 按日期分組統計
      const queriesByDate: { [key: string]: number } = {}
      queryData?.forEach(record => {
        const date = record.created_at.split('T')[0]
        queriesByDate[date] = (queriesByDate[date] || 0) + 1
      })

      // 填充缺失的日期
      queryTrends = []
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]
        queryTrends.push({
          date: dateStr,
          count: queriesByDate[dateStr] || 0,
        })
      }
    }

    // 7. 組合回傳資料
    const trends: any = {
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: days,
      },
    }

    if (type === 'uploads' || type === 'all') {
      trends.uploads = uploadTrends
    }

    if (type === 'queries' || type === 'all') {
      trends.queries = queryTrends
    }

    // 8. 計算總計和平均值
    if (uploadTrends.length > 0) {
      const totalUploads = uploadTrends.reduce((sum, item) => sum + item.count, 0)
      trends.uploads_summary = {
        total: totalUploads,
        average: (totalUploads / days).toFixed(2),
        max: Math.max(...uploadTrends.map(item => item.count)),
        min: Math.min(...uploadTrends.map(item => item.count)),
      }
    }

    if (queryTrends.length > 0) {
      const totalQueries = queryTrends.reduce((sum, item) => sum + item.count, 0)
      trends.queries_summary = {
        total: totalQueries,
        average: (totalQueries / days).toFixed(2),
        max: Math.max(...queryTrends.map(item => item.count)),
        min: Math.min(...queryTrends.map(item => item.count)),
      }
    }

    return NextResponse.json(
      successResponse(trends, '趨勢統計資料取得成功')
    )

  } catch (error: any) {
    console.error('Trends stats query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '取得趨勢統計資料過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

