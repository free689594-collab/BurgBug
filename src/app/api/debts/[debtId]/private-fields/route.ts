import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { UpdatePrivateFieldsRequest } from '@/types/debt'

/**
 * 債務記錄私密欄位 API
 * PATCH /api/debts/[debtId]/private-fields - 更新私密欄位
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 驗證是否為債務記錄的上傳者
 * 3. 更新私密欄位（結清金額、已收回金額、呆帳金額、內部評價）
 * 4. 返回結果
 */

/**
 * PATCH - 更新私密欄位
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ debtId: string }> }
) {
  try {
    const { debtId } = await params

    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 驗證 token 並取得使用者資訊
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證令牌無效或已過期'),
        { status: 401 }
      )
    }

    // 2. 驗證債務記錄是否存在且是否為上傳者
    const { data: debtRecord, error: debtError } = await supabaseAdmin
      .from('debt_records')
      .select('id, uploaded_by')
      .eq('id', debtId)
      .single()

    if (debtError || !debtRecord) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '債務記錄不存在'),
        { status: 404 }
      )
    }

    if (debtRecord.uploaded_by !== user.id) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '您沒有權限修改此債務記錄的私密欄位'),
        { status: 403 }
      )
    }

    // 3. 解析請求資料
    const body: UpdatePrivateFieldsRequest = await req.json()

    // 4. 驗證資料
    if (body.settled_amount !== undefined && body.settled_amount !== null) {
      if (body.settled_amount < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '結清金額不能為負數'),
          { status: 400 }
        )
      }
    }

    if (body.recovered_amount !== undefined && body.recovered_amount !== null) {
      if (body.recovered_amount < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '已收回金額不能為負數'),
          { status: 400 }
        )
      }
    }

    if (body.bad_debt_amount !== undefined && body.bad_debt_amount !== null) {
      if (body.bad_debt_amount < 0) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '呆帳金額不能為負數'),
          { status: 400 }
        )
      }
    }

    if (body.internal_rating !== undefined && body.internal_rating !== null) {
      if (body.internal_rating < 1 || body.internal_rating > 5) {
        return NextResponse.json(
          errorResponse(ErrorCodes.VALIDATION_ERROR, '內部評價必須在 1-5 之間'),
          { status: 400 }
        )
      }
    }

    // 5. 更新私密欄位
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.settled_amount !== undefined) {
      updateData.settled_amount = body.settled_amount
    }
    if (body.recovered_amount !== undefined) {
      updateData.recovered_amount = body.recovered_amount
    }
    if (body.bad_debt_amount !== undefined) {
      updateData.bad_debt_amount = body.bad_debt_amount
    }
    if (body.internal_rating !== undefined) {
      updateData.internal_rating = body.internal_rating
    }

    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('debt_records')
      .update(updateData)
      .eq('id', debtId)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update private fields:', updateError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '更新失敗'),
        { status: 500 }
      )
    }

    // 6. 返回結果
    return NextResponse.json(
      successResponse(updatedRecord, '更新成功'),
      { status: 200 }
    )
  } catch (error) {
    console.error('Update private fields error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

