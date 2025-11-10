import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

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
 * GET /api/admin/subscription/plans
 * 查詢訂閱方案配置（管理員專用）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證 token'),
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

    // 4. 查詢訂閱方案
    const { data: plans, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('plan_name')

    if (error) {
      console.error('查詢訂閱方案失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢訂閱方案失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse(plans)
    )

  } catch (error: any) {
    console.error('訂閱方案查詢 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/subscription/plans
 * 更新訂閱方案配置（管理員專用）
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證 token'),
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

    // 4. 解析請求參數
    const body = await request.json()
    const { plan_name, price, duration_days, upload_quota_daily, query_quota_daily, upload_quota_total, query_quota_total } = body

    if (!plan_name) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '缺少 plan_name 參數'),
        { status: 400 }
      )
    }

    // 5. 驗證參數
    const updates: any = {}

    if (price !== undefined) {
      if (price < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '價格不能為負數'),
          { status: 400 }
        )
      }
      updates.price = price
    }

    if (duration_days !== undefined) {
      if (duration_days < 1) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '訂閱天數必須至少為 1 天'),
          { status: 400 }
        )
      }
      if (duration_days > 365) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '訂閱天數不能超過 365 天'),
          { status: 400 }
        )
      }
      updates.duration_days = duration_days
    }

    if (upload_quota_daily !== undefined) {
      if (upload_quota_daily < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '每日上傳次數不能為負數'),
          { status: 400 }
        )
      }
      updates.upload_quota_daily = upload_quota_daily
    }

    if (query_quota_daily !== undefined) {
      if (query_quota_daily < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '每日查詢次數不能為負數'),
          { status: 400 }
        )
      }
      updates.query_quota_daily = query_quota_daily
    }

    if (upload_quota_total !== undefined) {
      if (upload_quota_total < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '總上傳次數不能為負數'),
          { status: 400 }
        )
      }
      updates.upload_quota_total = upload_quota_total
    }

    if (query_quota_total !== undefined) {
      if (query_quota_total < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '總查詢次數不能為負數'),
          { status: 400 }
        )
      }
      updates.query_quota_total = query_quota_total
    }

    // 6. 更新方案
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '沒有提供任何更新欄位'),
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data: updatedPlan, error } = await supabaseAdmin
      .from('subscription_plans')
      .update(updates)
      .eq('plan_name', plan_name)
      .select()
      .single()

    if (error) {
      console.error('更新訂閱方案失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '更新訂閱方案失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse(updatedPlan, '訂閱方案更新成功')
    )

  } catch (error: any) {
    console.error('訂閱方案更新 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

