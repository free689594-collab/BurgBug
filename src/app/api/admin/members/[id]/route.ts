import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 取得會員詳細資料（僅限管理員）
 * GET /api/admin/members/[id]
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

    // 1. 驗證管理員權限
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
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

    const { data: adminRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminRoleData || !['super_admin', 'admin'].includes(adminRoleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 2. 查詢會員基本資料
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '會員不存在'),
        { status: 404 }
      )
    }

    // 3. 查詢會員統計資料（從 member_statistics 表）
    const { data: memberStats } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', userId)
      .single()

    // 使用 member_statistics 的等級，如果不存在則使用 members 表的等級
    const currentLevel = memberStats?.activity_level || member.level || 1
    const currentActivityPoints = memberStats?.activity_points || 0

    // 4. 查詢等級資訊
    const { data: levelConfig } = await supabaseAdmin
      .from('level_config')
      .select('*')
      .eq('level', currentLevel)
      .single()

    // 5. 查詢勳章
    const { data: badges } = await supabaseAdmin
      .from('member_badges')
      .select('*, badge_config(*)')
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false })

    // 6. 查詢活躍度歷史（最近30天）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: activityHistory } = await supabaseAdmin
      .from('activity_point_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    // 7. 從 member_statistics 表讀取統計數據
    const uploadCount = memberStats?.uploads_count || 0
    const queryCount = memberStats?.queries_count || 0
    const receivedLikesCount = memberStats?.likes_received || 0
    const givenLikesCount = memberStats?.likes_given || 0

    // 8. 查詢每日配額使用情況
    const today = new Date().toISOString().split('T')[0]
    const { data: todayUsage } = await supabaseAdmin
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .eq('day', today)
      .single()

    // 9. 查詢最近上傳的債務記錄
    const { data: recentDebts } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 10. 查詢資料修改申請
    const { data: modificationRequests } = await supabaseAdmin
      .from('profile_modification_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // 11. 組合完整資料
    const memberDetail = {
      ...member,
      level: currentLevel,
      activity_points: currentActivityPoints,
      level_config: levelConfig,
      badges: badges || [],
      activity_history: activityHistory || [],
      statistics: {
        upload_count: uploadCount,
        query_count: queryCount,
        received_likes: receivedLikesCount,
        given_likes: givenLikesCount
      },
      today_usage: {
        upload_count: todayUsage?.uploads || 0,
        query_count: todayUsage?.queries || 0
      },
      recent_debts: recentDebts || [],
      modification_requests: modificationRequests || []
    }

    return NextResponse.json(
      successResponse(memberDetail, '查詢成功')
    )

  } catch (error: any) {
    console.error('Get member detail error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '查詢會員詳細資料失敗',
        error.message
      ),
      { status: 500 }
    )
  }
}

/**
 * 更新會員狀態（僅限管理員）
 * PATCH /api/admin/members/[id]
 * 
 * Request Body:
 * - status: 'pending' | 'approved' | 'suspended'
 * - role: 'user' | 'admin' | 'super_admin' (可選，僅 super_admin 可修改)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

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
    const { data: adminRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminRoleData || !['super_admin', 'admin'].includes(adminRoleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    const adminRole = adminRoleData.role

    // 4. 解析請求內容
    const body = await req.json()
    const { status, role } = body

    // 5. 驗證輸入
    if (status && !['pending', 'approved', 'suspended'].includes(status)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的狀態值'),
        { status: 400 }
      )
    }

    if (role && !['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的角色值'),
        { status: 400 }
      )
    }

    // 6. 檢查是否有要更新的欄位
    if (!status && !role) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '請提供要更新的欄位'),
        { status: 400 }
      )
    }

    // 7. 檢查目標會員是否存在
    const { data: targetMember, error: memberError } = await supabaseAdmin
      .from('members')
      .select('user_id, account, status')
      .eq('user_id', userId)
      .single()

    if (memberError || !targetMember) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '會員不存在'),
        { status: 404 }
      )
    }

    // 8. 檢查目標會員的角色
    const { data: targetRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    const targetRole = targetRoleData?.role || 'user'

    // 9. 權限檢查：只有 super_admin 可以修改角色
    if (role && adminRole !== 'super_admin') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '只有超級管理員可以修改角色'),
        { status: 403 }
      )
    }

    // 10. 權限檢查：admin 不能修改 super_admin 或其他 admin
    if (adminRole === 'admin' && ['admin', 'super_admin'].includes(targetRole)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '您沒有權限修改此會員'),
        { status: 403 }
      )
    }

    // 11. 防止修改自己的狀態或角色
    if (user.id === userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '不能修改自己的狀態或角色'),
        { status: 403 }
      )
    }

    // 12. 更新會員狀態
    if (status) {
      const { error: updateError } = await supabaseAdmin
        .from('members')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Failed to update member status:', updateError)
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, '更新會員狀態失敗'),
          { status: 500 }
        )
      }
    }

    // 13. 更新會員角色
    if (role) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId)

      if (roleUpdateError) {
        console.error('Failed to update member role:', roleUpdateError)
        return NextResponse.json(
          errorResponse(ErrorCodes.INTERNAL_ERROR, '更新會員角色失敗'),
          { status: 500 }
        )
      }
    }

    // 14. 記錄審計日誌
    try {
      const changes: any = {}
      if (status) changes.status = { from: targetMember.status, to: status }
      if (role) changes.role = { from: targetRole, to: role }

      await supabaseAdmin.rpc('log_audit', {
        p_action: 'UPDATE_MEMBER',
        p_resource: 'members',
        p_resource_id: userId,
        p_meta: {
          account: targetMember.account,
          changes,
          updated_by: user.id
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞更新流程
    }

    // 15. 取得更新後的資料
    const { data: updatedMember } = await supabaseAdmin
      .from('members')
      .select('user_id, account, status, created_at, updated_at')
      .eq('user_id', userId)
      .single()

    const { data: updatedRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    // 16. 回傳成功響應
    return NextResponse.json(
      successResponse({
        member: {
          ...updatedMember,
          role: updatedRole?.role || 'user'
        }
      }, '更新成功')
    )

  } catch (error: any) {
    console.error('Update member error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '更新會員過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

/**
 * 刪除會員（僅限 super_admin）
 * DELETE /api/admin/members/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params

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

    // 3. 檢查 super_admin 權限
    const { data: adminRoleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminRoleData || adminRoleData.role !== 'super_admin') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '只有超級管理員可以刪除會員'),
        { status: 403 }
      )
    }

    // 4. 防止刪除自己
    if (user.id === userId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '不能刪除自己的帳號'),
        { status: 403 }
      )
    }

    // 5. 檢查目標會員是否存在
    const { data: targetMember } = await supabaseAdmin
      .from('members')
      .select('account')
      .eq('user_id', userId)
      .single()

    if (!targetMember) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '會員不存在'),
        { status: 404 }
      )
    }

    // 6. 刪除會員（使用 Supabase Auth Admin API）
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Failed to delete user:', deleteError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '刪除會員失敗'),
        { status: 500 }
      )
    }

    // 7. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'DELETE_MEMBER',
        p_resource: 'members',
        p_resource_id: userId,
        p_meta: {
          account: targetMember.account,
          deleted_by: user.id
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
    }

    // 8. 回傳成功響應
    return NextResponse.json(
      successResponse({ deleted: true }, '刪除成功')
    )

  } catch (error: any) {
    console.error('Delete member error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '刪除會員過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

