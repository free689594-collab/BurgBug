import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 報表匯出 API（僅限管理員）
 * GET /api/reports/export?format=csv&start_date=2024-01-01&end_date=2024-12-31&region=北北基宜&status=待觀察
 * 
 * Query Parameters:
 * - format: 匯出格式（csv，預設 csv）
 * - start_date: 開始日期（ISO 8601 格式，可選）
 * - end_date: 結束日期（ISO 8601 格式，可選）
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
    const format = searchParams.get('format') || 'csv'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const region = searchParams.get('region')
    const status = searchParams.get('status')

    // 5. 建立查詢
    let query = supabaseAdmin
      .from('debt_records')
      .select(`
        id,
        debtor_name,
        debtor_id_full,
        debtor_phone,
        residence,
        face_value,
        repayment_status,
        debt_date,
        payment_frequency,
        created_at,
        uploaded_by
      `)

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

    // 排序
    query = query.order('created_at', { ascending: false })

    const { data: records, error: queryError } = await query

    if (queryError) {
      console.error('Failed to query debt records:', queryError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 6. 取得上傳者資訊
    const uploaderIds = [...new Set(records?.map(r => r.uploaded_by).filter(Boolean))]
    const { data: uploaders } = await supabaseAdmin
      .from('members')
      .select('user_id, account, nickname')
      .in('user_id', uploaderIds)

    // 7. 合併上傳者資訊
    const recordsWithUploaders = records?.map(record => ({
      ...record,
      uploader_account: uploaders?.find(u => u.user_id === record.uploaded_by)?.account || '未知',
      uploader_nickname: uploaders?.find(u => u.user_id === record.uploaded_by)?.nickname || '未知',
    }))

    // 8. 根據格式匯出
    if (format === 'csv') {
      // 產生 CSV
      const csvHeaders = [
        'ID',
        '債務人姓名',
        '身分證字號',
        '電話',
        '居住地',
        '債務金額',
        '還款狀況',
        '債務日期',
        '繳款頻率',
        '上傳者帳號',
        '上傳者暱稱',
        '建立時間',
      ]

      const csvRows = recordsWithUploaders?.map(record => [
        record.id,
        record.debtor_name,
        record.debtor_id_full,
        record.debtor_phone || '',
        record.residence,
        record.face_value || '',
        record.repayment_status,
        record.debt_date || '',
        record.payment_frequency || '',
        record.uploader_account,
        record.uploader_nickname,
        new Date(record.created_at).toLocaleString('zh-TW'),
      ])

      const csv = [
        csvHeaders.join(','),
        ...(csvRows?.map(row => row.map(cell => `"${cell}"`).join(',')) || []),
      ].join('\n')

      // 加入 BOM 以支援 Excel 正確顯示中文
      const bom = '\uFEFF'
      const csvWithBom = bom + csv

      // 產生檔名
      const filename = `debt_records_${new Date().toISOString().split('T')[0]}.csv`

      return new NextResponse(csvWithBom, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    return NextResponse.json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, '不支援的匯出格式'),
      { status: 400 }
    )

  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '匯出過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

