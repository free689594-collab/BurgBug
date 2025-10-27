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
 * GET /api/admin/level-config
 * 取得所有等級配置
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

    // 3. 取得所有等級配置
    const { data: levels, error: levelsError } = await supabaseAdmin
      .from('level_config')
      .select('*')
      .order('level', { ascending: true })

    if (levelsError) {
      throw levelsError
    }

    return NextResponse.json(
      successResponse(levels, '取得等級配置成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Get level config error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/level-config
 * 更新等級配置
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
    const { level, title, title_color, required_points, upload_quota_bonus, query_quota_bonus } = body

    // 4. 驗證輸入
    if (!level || !title || !title_color || required_points === undefined) {
      return NextResponse.json(
        errorResponse('缺少必要欄位', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 5. 更新等級配置
    const { data, error: updateError } = await supabaseAdmin
      .from('level_config')
      .update({
        title,
        title_color,
        required_points,
        bonus_upload_quota: upload_quota_bonus || 0,
        bonus_query_quota: query_quota_bonus || 0,
        updated_at: new Date().toISOString()
      })
      .eq('level', level)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json(
      successResponse(data, '更新等級配置成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Update level config error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/level-config
 * 新增等級配置
 */
export async function POST(req: NextRequest) {
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
    const { level, title, title_color, required_points, upload_quota_bonus, query_quota_bonus } = body

    // 4. 驗證輸入
    if (!level || !title || !title_color || required_points === undefined) {
      return NextResponse.json(
        errorResponse('缺少必要欄位', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 5. 新增等級配置
    const { data, error: insertError } = await supabaseAdmin
      .from('level_config')
      .insert({
        level,
        title,
        title_color,
        required_points,
        bonus_upload_quota: upload_quota_bonus || 0,
        bonus_query_quota: query_quota_bonus || 0
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json(
      successResponse(data, '新增等級配置成功'),
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Create level config error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/level-config
 * 刪除等級配置
 */
export async function DELETE(req: NextRequest) {
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
    const { searchParams } = new URL(req.url)
    const level = parseInt(searchParams.get('level') || '0')

    // 4. 驗證輸入
    if (!level) {
      return NextResponse.json(
        errorResponse('缺少等級參數', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 5. 保護 LV1 和 LV99
    if (level === 1 || level === 99) {
      return NextResponse.json(
        errorResponse('無法刪除 LV1 和 LV99', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // 6. 刪除等級配置
    const { error: deleteError } = await supabaseAdmin
      .from('level_config')
      .delete()
      .eq('level', level)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json(
      successResponse(null, '刪除等級配置成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Delete level config error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

