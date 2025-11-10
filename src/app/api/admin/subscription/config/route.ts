import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { SubscriptionConfigResponse, SubscriptionConfig, UpdateSubscriptionConfigRequest } from '@/types/subscription'

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
 * GET /api/admin/subscription/config
 * 查詢訂閱系統配置（管理員專用）
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

    // 4. 查詢訂閱配置
    const { data: config, error } = await supabaseAdmin
      .from('subscription_config')
      .select('*')
      .single()

    if (error) {
      console.error('查詢訂閱配置失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '查詢訂閱配置失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    if (!config) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到訂閱配置'),
        { status: 404 }
      )
    }

    return NextResponse.json(
      successResponse<SubscriptionConfig>(config)
    )

  } catch (error: any) {
    console.error('訂閱配置查詢 API 錯誤:', error)
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
 * PUT /api/admin/subscription/config
 * 更新訂閱系統配置（管理員專用）
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
    const body: UpdateSubscriptionConfigRequest = await request.json()

    // 5. 驗證參數
    const updates: any = {}

    if (body.trial_days !== undefined) {
      if (body.trial_days < 0 || body.trial_days > 365) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '試用天數必須在 0-365 之間'),
          { status: 400 }
        )
      }
      updates.trial_days = body.trial_days
    }

    if (body.monthly_price !== undefined) {
      if (body.monthly_price < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '月費金額不能為負數'),
          { status: 400 }
        )
      }
      updates.monthly_price = body.monthly_price
    }

    if (body.free_upload_quota !== undefined) {
      if (body.free_upload_quota < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '免費上傳額度不能為負數'),
          { status: 400 }
        )
      }
      updates.free_upload_quota = body.free_upload_quota
    }

    if (body.free_query_quota !== undefined) {
      if (body.free_query_quota < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '免費查詢額度不能為負數'),
          { status: 400 }
        )
      }
      updates.free_query_quota = body.free_query_quota
    }

    if (body.vip_upload_daily !== undefined) {
      if (body.vip_upload_daily < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, 'VIP 每日上傳額度不能為負數'),
          { status: 400 }
        )
      }
      updates.vip_upload_daily = body.vip_upload_daily
    }

    if (body.vip_query_daily !== undefined) {
      if (body.vip_query_daily < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, 'VIP 每日查詢額度不能為負數'),
          { status: 400 }
        )
      }
      updates.vip_query_daily = body.vip_query_daily
    }

    if (body.notification_days_before !== undefined) {
      if (!Array.isArray(body.notification_days_before)) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '通知天數必須是陣列'),
          { status: 400 }
        )
      }
      updates.notification_days_before = body.notification_days_before
    }

    if (body.ecpay_merchant_id !== undefined) {
      updates.ecpay_merchant_id = body.ecpay_merchant_id
    }

    if (body.ecpay_hash_key !== undefined) {
      updates.ecpay_hash_key = body.ecpay_hash_key
    }

    if (body.ecpay_hash_iv !== undefined) {
      updates.ecpay_hash_iv = body.ecpay_hash_iv
    }

    if (body.ecpay_test_mode !== undefined) {
      updates.ecpay_test_mode = body.ecpay_test_mode
    }

    // 6. 更新配置
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '沒有提供任何更新欄位'),
        { status: 400 }
      )
    }

    updates.updated_at = new Date().toISOString()

    const { data: updatedConfig, error } = await supabaseAdmin
      .from('subscription_config')
      .update(updates)
      .eq('id', 1) // 假設只有一筆配置記錄
      .select()
      .single()

    if (error) {
      console.error('更新訂閱配置失敗:', error)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          '更新訂閱配置失敗',
          error.message
        ),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse<SubscriptionConfig>(updatedConfig, '訂閱配置更新成功')
    )

  } catch (error: any) {
    console.error('訂閱配置更新 API 錯誤:', error)
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

