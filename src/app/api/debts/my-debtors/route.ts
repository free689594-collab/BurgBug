import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 我的債務人列表 API
 * GET /api/debts/my-debtors?status=待觀察&residence=北北基宜&page=1&limit=20
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 查詢使用者上傳的所有債務記錄（不遮罩，因為是自己上傳的）
 * 3. 支援篩選（還款狀況、居住地）
 * 4. 支援分頁
 * 5. 返回統計資訊
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

    const token = authHeader.substring(7)

    // 驗證 token 並取得使用者資訊
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證令牌無效或已過期'),
        { status: 401 }
      )
    }

    // 2. 檢查會員狀態
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, user_id, status')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '找不到會員資料'),
        { status: 403 }
      )
    }

    // 3. 解析查詢參數
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const residence = searchParams.get('residence')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最多 100 筆

    // 4. 驗證參數
    if (status) {
      const validStatuses = ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `還款狀況必須為：${validStatuses.join('、')}`
          ),
          { status: 400 }
        )
      }
    }

    if (residence) {
      const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
      if (!validRegions.includes(residence)) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `居住地必須為：${validRegions.join('、')}`
          ),
          { status: 400 }
        )
      }
    }

    // 5. 查詢債務記錄（不遮罩，因為是自己上傳的）
    let query = supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact' })
      .eq('uploaded_by', user.id)

    // 套用篩選條件
    if (status) {
      query = query.eq('repayment_status', status)
    }
    if (residence) {
      query = query.eq('residence', residence)
    }

    // 套用分頁
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to).order('created_at', { ascending: false })

    const { data: debtRecords, error: queryError, count } = await query

    if (queryError) {
      console.error('Failed to query my debtors:', queryError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 6. 計算統計資訊
    const { data: statsData } = await supabaseAdmin
      .from('debt_records')
      .select('repayment_status, face_value, residence, settled_amount, recovered_amount, bad_debt_amount')
      .eq('uploaded_by', user.id)

    const stats = {
      total_count: count || 0,
      total_face_value: statsData?.reduce((sum, record) => sum + (record.face_value || 0), 0) || 0,
      by_status: {} as Record<string, { count: number; total_value: number }>,
      by_region: {} as Record<string, number>
    }

    // 按還款狀況統計
    statsData?.forEach(record => {
      if (!stats.by_status[record.repayment_status]) {
        stats.by_status[record.repayment_status] = { count: 0, total_value: 0 }
      }
      stats.by_status[record.repayment_status].count++
      stats.by_status[record.repayment_status].total_value += record.face_value || 0
    })

    // 按居住地統計
    statsData?.forEach(record => {
      if (!stats.by_region[record.residence]) {
        stats.by_region[record.residence] = 0
      }
      stats.by_region[record.residence]++
    })

    // 7. 計算私密欄位統計（只統計有填寫私密欄位的債務人）
    const recordsWithPrivateFields = statsData?.filter(record =>
      record.settled_amount !== null ||
      record.recovered_amount !== null ||
      record.bad_debt_amount !== null
    ) || []

    const privateStats = {
      // 總計
      total_count: recordsWithPrivateFields.length,
      total_face_value: recordsWithPrivateFields.reduce((sum, record) => sum + (record.face_value || 0), 0),
      total_settled: recordsWithPrivateFields.reduce((sum, record) => sum + (record.settled_amount || 0), 0),
      total_recovered: recordsWithPrivateFields.reduce((sum, record) => sum + (record.recovered_amount || 0), 0),
      total_bad_debt: recordsWithPrivateFields.reduce((sum, record) => sum + (record.bad_debt_amount || 0), 0),
      recovery_rate: 0,

      // 按還款狀況分類
      by_status: {} as Record<string, {
        count: number
        face_value: number
        settled_amount: number
        recovered_amount: number
        bad_debt_amount: number
      }>
    }

    // 計算收回率
    if (privateStats.total_face_value > 0) {
      privateStats.recovery_rate = Math.round((privateStats.total_recovered / privateStats.total_face_value) * 100)
    }

    // 按還款狀況分類統計私密欄位
    recordsWithPrivateFields.forEach(record => {
      const status = record.repayment_status
      if (!privateStats.by_status[status]) {
        privateStats.by_status[status] = {
          count: 0,
          face_value: 0,
          settled_amount: 0,
          recovered_amount: 0,
          bad_debt_amount: 0
        }
      }

      privateStats.by_status[status].count++
      privateStats.by_status[status].face_value += record.face_value || 0
      privateStats.by_status[status].settled_amount += record.settled_amount || 0
      privateStats.by_status[status].recovered_amount += record.recovered_amount || 0
      privateStats.by_status[status].bad_debt_amount += record.bad_debt_amount || 0
    })

    // 8. 返回結果
    return NextResponse.json(
      successResponse(
        {
          records: debtRecords || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / limit)
          },
          stats,
          private_stats: privateStats,
          filters: {
            status: status || null,
            residence: residence || null
          }
        },
        '查詢成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('My debtors error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

