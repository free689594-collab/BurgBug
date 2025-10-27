import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { validateAccount, validatePassword } from '@/lib/auth/utils'

/**
 * 建立新的使用者帳號（僅限管理員）
 * POST /api/admin/users/create
 */
export async function POST(req: NextRequest) {
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

    const { data: { user: admin }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !admin) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 3. 檢查管理員權限（允許 super_admin 和 admin）
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', admin.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 4. 解析請求體
    const body = await req.json()
    const { account, password, role = 'user', status = 'approved' } = body

    // 5. 權限層級檢查
    // 5.1 只有 q689594 可以建立 super_admin
    if (role === 'super_admin') {
      if (admin.id !== '5a3b6190-cf02-48dd-bbbc-39f586edd85d') {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.FORBIDDEN,
            '只有最高權限管理員可以建立 super_admin 帳號'
          ),
          { status: 403 }
        )
      }
    }

    // 5.2 admin 角色只能建立 user
    if (roleData.role === 'admin') {
      if (role !== 'user') {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.FORBIDDEN,
            '一般管理員只能建立一般會員帳號（role: user）'
          ),
          { status: 403 }
        )
      }
    }

    // 6. 驗證必填欄位
    if (!account || !password) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '帳號和密碼為必填欄位'),
        { status: 400 }
      )
    }

    // 6. 驗證帳號格式
    if (!validateAccount(account)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '帳號格式錯誤：僅允許英文字母和數字，長度 5-15 字元'
        ),
        { status: 400 }
      )
    }

    // 7. 驗證密碼強度
    if (!validatePassword(password)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '密碼格式錯誤：至少 8 字元'
        ),
        { status: 400 }
      )
    }

    // 8. 驗證角色
    if (!['user', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '角色錯誤：僅允許 user、admin 或 super_admin'
        ),
        { status: 400 }
      )
    }

    // 9. 驗證狀態
    if (!['pending', 'approved', 'suspended'].includes(status)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '狀態錯誤：僅允許 pending、approved 或 suspended'
        ),
        { status: 400 }
      )
    }

    // 10. 檢查帳號是否已存在
    const { data: existingMember } = await supabaseAdmin
      .from('members')
      .select('account')
      .ilike('account', account)
      .single()

    if (existingMember) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.CONFLICT,
          '此帳號已存在，請更換其他帳號'
        ),
        { status: 409 }
      )
    }

    // 11. 使用 Supabase Admin API 建立帳號
    const email = `${account.toLowerCase()}@auth.local`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        account,
        email_verified: true
      }
    })

    if (authError || !authData.user) {
      console.error('Failed to create user:', authError)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '建立帳號失敗',
          authError?.message
        ),
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 12. 建立 members 記錄
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: userId,
        account: account.toLowerCase(),
        status,
      })

    if (memberError) {
      console.error('Failed to create member:', memberError)
      // 回滾：刪除已建立的 auth user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '建立會員資料失敗',
          memberError.message
        ),
        { status: 500 }
      )
    }

    // 13. 建立 user_roles 記錄
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
      })

    if (roleError) {
      console.error('Failed to create user_roles:', roleError)
      // 回滾：刪除已建立的記錄
      await supabaseAdmin.from('members').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '建立角色資料失敗',
          roleError.message
        ),
        { status: 500 }
      )
    }

    // 14. 建立 member_statistics 記錄
    const { error: statsError } = await supabaseAdmin
      .from('member_statistics')
      .insert({
        user_id: userId,
        likes_received: 0,
        likes_given: 0,
        uploads_count: 0,
        queries_count: 0,
      })

    if (statsError) {
      console.error('Failed to create member_statistics:', statsError)
      // 不回滾，統計資料可以後續補建
    }

    // 15. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'ADMIN_CREATE_USER',
        p_resource: 'users',
        p_resource_id: userId,
        p_meta: {
          created_by: admin.id,
          created_account: account,
          created_role: role,
          created_status: status,
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
    }

    // 16. 回傳成功響應
    return NextResponse.json(
      successResponse({
        user: {
          id: userId,
          account,
          email,
          role,
          status,
        }
      }, '帳號建立成功')
    )

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '建立帳號過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

