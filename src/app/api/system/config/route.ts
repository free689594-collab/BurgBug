import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * GET /api/system/config
 * 取得系統配置
 *
 * 權限：所有已登入使用者可讀取
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    // 2. 查詢系統配置
    const { data: config, error: configError } = await supabaseAdmin
      .from('system_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError) {
      console.error('Failed to fetch system config:', configError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢系統配置失敗'),
        { status: 500 }
      )
    }

    // 3. 返回配置
    return NextResponse.json(
      successResponse(
        {
          display_overrides: config.display_overrides || {},
          audit_retention_days: config.audit_retention_days || 30,
          updated_at: config.updated_at
        },
        '查詢成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('System config GET error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤'),
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/system/config
 * 更新系統配置
 * 
 * 權限：僅管理員可更新
 * 
 * Request Body:
 * {
 *   display_overrides?: { [region: string]: number }
 *   audit_retention_days?: number
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '請先登入'),
        { status: 401 }
      )
    }

    // 2. 檢查管理員權限
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'super_admin')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '權限不足，僅管理員可更新系統配置'),
        { status: 403 }
      )
    }

    // 3. 解析請求資料
    const body = await req.json()
    const { display_overrides, audit_retention_days } = body

    // 4. 驗證輸入
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (display_overrides !== undefined) {
      // 驗證 display_overrides 格式
      if (typeof display_overrides !== 'object' || Array.isArray(display_overrides)) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, 'display_overrides 必須是物件'),
          { status: 400 }
        )
      }

      // 驗證區域名稱
      const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
      const regions = Object.keys(display_overrides)
      
      for (const region of regions) {
        if (!validRegions.includes(region)) {
          return NextResponse.json(
            errorResponse(ErrorCodes.VALIDATION_ERROR, `無效的區域名稱：${region}`),
            { status: 400 }
          )
        }

        // 驗證增量值（0-50）
        const value = display_overrides[region]
        if (typeof value !== 'number' || value < 0 || value > 50) {
          return NextResponse.json(
            errorResponse(ErrorCodes.VALIDATION_ERROR, `區域 ${region} 的增量值必須在 0-50 之間`),
            { status: 400 }
          )
        }
      }

      updateData.display_overrides = display_overrides
    }

    if (audit_retention_days !== undefined) {
      // 驗證保留天數（1-365）
      if (typeof audit_retention_days !== 'number' || audit_retention_days < 1 || audit_retention_days > 365) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '審計日誌保留天數必須在 1-365 之間'),
          { status: 400 }
        )
      }

      updateData.audit_retention_days = audit_retention_days
    }

    // 5. 更新配置
    const { data: updatedConfig, error: updateError } = await supabaseAdmin
      .from('system_config')
      .update(updateData)
      .eq('id', 1)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update system config:', updateError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '更新系統配置失敗'),
        { status: 500 }
      )
    }

    // 6. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'UPDATE_SYSTEM_CONFIG',
        p_resource: 'system_config',
        p_resource_id: '1',
        p_meta: {
          updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
          display_overrides: updateData.display_overrides,
          audit_retention_days: updateData.audit_retention_days
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞主流程
    }

    // 7. 返回更新後的配置
    return NextResponse.json(
      successResponse(
        {
          display_overrides: updatedConfig.display_overrides,
          audit_retention_days: updatedConfig.audit_retention_days,
          updated_at: updatedConfig.updated_at
        },
        '系統配置更新成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('System config PATCH error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤'),
      { status: 500 }
    )
  }
}

