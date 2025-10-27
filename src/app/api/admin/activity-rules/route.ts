import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse } from '@/lib/api/response'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * 驗證使用者是否為管理員
 */
async function verifyAdmin(token: string) {
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  
  if (authError || !user) {
    return { isAdmin: false, error: '認證失敗' }
  }

  const { data: roleData } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  const isAdmin = roleData?.role === 'super_admin' || roleData?.role === 'admin'

  return { isAdmin, error: isAdmin ? null : '權限不足' }
}

/**
 * GET /api/admin/activity-rules
 * 取得所有活躍度規則
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('未提供認證 token', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證管理員權限
    const { isAdmin, error } = await verifyAdmin(token)
    if (!isAdmin) {
      return NextResponse.json(
        errorResponse(error || '權限不足', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // 3. 取得所有活躍度規則
    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('activity_point_rules')
      .select('*')
      .order('action', { ascending: true })

    if (rulesError) {
      throw rulesError
    }

    return NextResponse.json(
      successResponse(rules, '取得活躍度規則成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Get activity rules error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/activity-rules
 * 更新活躍度規則
 */
export async function PUT(req: NextRequest) {
  try {
    // 1. 驗證 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('未提供認證 token', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證管理員權限
    const { isAdmin, error } = await verifyAdmin(token)
    if (!isAdmin) {
      return NextResponse.json(
        errorResponse(error || '權限不足', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // 3. 取得請求資料
    const body = await req.json()
    const { action, points, max_daily_count, cooldown_seconds, description } = body

    // 4. 驗證輸入
    if (!action || points === undefined || max_daily_count === undefined || cooldown_seconds === undefined) {
      return NextResponse.json(
        errorResponse('缺少必要欄位', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 5. 驗證點數和限制
    if (points < 0) {
      return NextResponse.json(
        errorResponse('點數不能為負數', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    if (max_daily_count < -1) {
      return NextResponse.json(
        errorResponse('每日上限不能小於 -1', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    if (cooldown_seconds < 0) {
      return NextResponse.json(
        errorResponse('冷卻時間不能為負數', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 6. 更新活躍度規則
    const { data, error: updateError } = await supabaseAdmin
      .from('activity_point_rules')
      .update({
        points,
        max_daily_count,
        cooldown_seconds,
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('action', action)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json(
      successResponse(data, '更新活躍度規則成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Update activity rule error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

