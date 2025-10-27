import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET /api/admin/debts
 * 管理員查詢所有債務記錄（分頁、篩選、排序）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 驗證管理員權限
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權：無效token' }, { status: 401 })
    }

    // 檢查是否為管理員
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: '權限不足：需要管理員權限' }, { status: 403 })
    }

    // 2. 解析查詢參數
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || '' // 搜尋關鍵字（姓名、身分證）
    const uploader = searchParams.get('uploader') || '' // 上傳者ID或暱稱
    const residence = searchParams.get('residence') || '' // 居住地
    const status = searchParams.get('status') || '' // 還款狀況
    const dateFrom = searchParams.get('dateFrom') || '' // 債務日期起始
    const dateTo = searchParams.get('dateTo') || '' // 債務日期結束
    const sortBy = searchParams.get('sortBy') || 'created_at' // 排序欄位
    const sortOrder = searchParams.get('sortOrder') || 'desc' // 排序方向

    // 3. 建立查詢（不使用外鍵關聯，改用手動join）
    let query = supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact' })

    // 4. 套用篩選條件
    if (search) {
      query = query.or(`debtor_name.ilike.%${search}%,debtor_id_full.ilike.%${search}%`)
    }

    if (uploader) {
      // 可以是 user_id 或暱稱
      if (uploader.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        query = query.eq('uploaded_by', uploader)
      } else {
        // 先查詢符合暱稱的會員ID
        const { data: members } = await supabaseAdmin
          .from('members')
          .select('user_id')
          .ilike('nickname', `%${uploader}%`)
        
        if (members && members.length > 0) {
          const memberIds = members.map(m => m.user_id)
          query = query.in('uploaded_by', memberIds)
        } else {
          // 沒有符合的會員，返回空結果
          return NextResponse.json({
            success: true,
            data: {
              records: [],
              pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0
              }
            }
          })
        }
      }
    }

    if (residence) {
      query = query.eq('residence', residence)
    }

    if (status) {
      query = query.eq('repayment_status', status)
    }

    if (dateFrom) {
      query = query.gte('debt_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('debt_date', dateTo)
    }

    // 5. 套用排序
    const validSortFields = ['created_at', 'debt_date', 'face_value', 'debtor_name', 'likes_count']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    query = query.order(sortField, { ascending: sortOrder === 'asc' })

    // 6. 套用分頁
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    // 7. 執行查詢
    const { data: records, error, count } = await query

    if (error) {
      console.error('Failed to fetch debt records:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    // 8. 手動查詢上傳者資訊
    const uploaderIds = [...new Set(records?.map(r => r.uploaded_by) || [])]
    const { data: uploaders } = await supabaseAdmin
      .from('members')
      .select('user_id, account, nickname, business_type, business_region')
      .in('user_id', uploaderIds)

    // 9. 組合資料
    const recordsWithUploader = records?.map(record => ({
      ...record,
      uploader: uploaders?.find(u => u.user_id === record.uploaded_by) || null
    })) || []

    // 10. 計算分頁資訊
    const totalPages = count ? Math.ceil(count / limit) : 0

    return NextResponse.json({
      success: true,
      data: {
        records: recordsWithUploader,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages
        },
        filters: {
          search,
          uploader,
          residence,
          status,
          dateFrom,
          dateTo,
          sortBy: sortField,
          sortOrder
        }
      }
    })
  } catch (error) {
    console.error('Error in GET /api/admin/debts:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

