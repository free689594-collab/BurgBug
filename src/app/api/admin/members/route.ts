import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 取得會員列表（僅限管理員）
 * GET /api/admin/members
 * 
 * Query Parameters:
 * - limit: 每頁筆數（預設 20，最大 100）
 * - offset: 偏移量（預設 0）
 * - status: 篩選狀態（pending, approved, suspended）
 * - role: 篩選角色（user, admin, super_admin）
 * - search: 搜尋帳號（模糊搜尋）
 * - sort: 排序欄位（created_at, account）
 * - order: 排序方向（asc, desc，預設 desc）
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

    // 4. 解析查詢參數
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'created_at'
    const order = searchParams.get('order') || 'desc'

    // 5. 建立查詢
    let query = supabaseAdmin
      .from('members')
      .select(`
        user_id,
        account,
        status,
        created_at
      `, { count: 'exact' })

    // 6. 套用篩選條件
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('account', `%${search}%`)
    }

    // 7. 套用排序
    if (sort === 'account') {
      query = query.order('account', { ascending: order === 'asc' })
    } else {
      query = query.order('created_at', { ascending: order === 'asc' })
    }

    // 8. 套用分頁
    query = query.range(offset, offset + limit - 1)

    // 9. 執行查詢
    const { data: members, error, count } = await query

    if (error) {
      console.error('Failed to fetch members:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢會員列表失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    // 10. 取得角色資訊
    const userIds = members?.map(m => m.user_id) || []
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds)

    const { data: sessions } = await supabaseAdmin
      .from('active_sessions')
      .select('user_id, last_seen')
      .in('user_id', userIds)

    // 11. 格式化資料
    const formattedMembers = members?.map(member => {
      const roleData = roles?.find(r => r.user_id === member.user_id)
      const sessionData = sessions?.find(s => s.user_id === member.user_id)

      return {
        user_id: member.user_id,
        account: member.account,
        status: member.status,
        role: roleData?.role || 'user',
        created_at: member.created_at,
        last_login: sessionData?.last_seen || null
      }
    }) || []

    // 12. 套用角色篩選（如果有）
    let filteredMembers = formattedMembers
    if (role) {
      filteredMembers = formattedMembers.filter(m => m.role === role)
    }

    // 13. 回傳結果
    return NextResponse.json(
      successResponse({
        members: filteredMembers,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      }, '查詢成功')
    )

  } catch (error: any) {
    console.error('Members query error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '查詢會員列表過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

