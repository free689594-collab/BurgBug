import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 展示數據（灌水）配置管理 API（僅限管理員）
 * GET /api/admin/display-overrides - 查詢當前配置
 * PUT /api/admin/display-overrides - 更新配置
 */

// GET - 查詢當前配置
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

    // 2. 查詢當前配置
    const { data: configData, error: queryError } = await supabaseAdmin
      .from('system_config')
      .select('display_overrides, updated_at')
      .single()

    if (queryError) {
      console.error('Failed to query display_overrides:', queryError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢配置失敗'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      successResponse(
        {
          overrides: configData.display_overrides || {},
          updated_at: configData.updated_at,
        },
        '查詢配置成功'
      )
    )

  } catch (error: any) {
    console.error('Get display overrides error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '查詢配置過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

// PUT - 更新配置
export async function PUT(req: NextRequest) {
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

    // 2. 解析請求資料
    const body = await req.json()
    const { overrides } = body

    if (!overrides || typeof overrides !== 'object') {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的配置格式'),
        { status: 400 }
      )
    }

    // 3. 驗證配置格式
    const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
    const regions = Object.keys(overrides)

    // 檢查是否包含所有必要的區域
    const missingRegions = validRegions.filter(r => !regions.includes(r))
    if (missingRegions.length > 0) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `缺少必要的區域配置: ${missingRegions.join(', ')}`
        ),
        { status: 400 }
      )
    }

    // 檢查是否有無效的區域
    const invalidRegions = regions.filter(r => !validRegions.includes(r))
    if (invalidRegions.length > 0) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `無效的區域名稱: ${invalidRegions.join(', ')}`
        ),
        { status: 400 }
      )
    }

    // 檢查數值是否有效（0-50 的整數）
    for (const region of validRegions) {
      const value = overrides[region]
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 50) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `${region} 的灌水量必須是 0-50 之間的整數`
          ),
          { status: 400 }
        )
      }
    }

    // 4. 更新配置
    const { error: updateError } = await supabaseAdmin
      .from('system_config')
      .update({ display_overrides: overrides })
      .eq('id', 1) // system_config 表只有一行

    if (updateError) {
      console.error('Failed to update display_overrides:', updateError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '更新配置失敗'),
        { status: 500 }
      )
    }

    // 5. 記錄審計日誌
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'update_display_overrides',
        details: {
          old_overrides: null, // 可以先查詢舊值再記錄
          new_overrides: overrides,
        },
      })

    return NextResponse.json(
      successResponse(
        {
          overrides,
          updated_at: new Date().toISOString(),
        },
        '配置更新成功'
      )
    )

  } catch (error: any) {
    console.error('Update display overrides error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '更新配置過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

