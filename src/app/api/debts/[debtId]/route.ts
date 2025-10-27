import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { DebtStatusUpdateRequest } from '@/types/debt'

/**
 * 債務狀態更新 API
 * PATCH /api/debts/[debtId]
 *
 * 功能：
 * 1. 驗證使用者身份
 * 2. 驗證是否為上傳者或管理員
 * 3. 更新還款狀態和備註
 * 4. 記錄審計日誌
 * 5. 返回成功回應
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ debtId: string }> }
) {
  try {
    const { debtId: id } = await params

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

    // 2. 檢查會員狀態
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, user_id, status, nickname')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '找不到會員資料'),
        { status: 403 }
      )
    }

    // 3. 檢查債務記錄是否存在
    const { data: debtRecord, error: fetchError } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !debtRecord) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到該債務記錄'),
        { status: 404 }
      )
    }

    // 4. 檢查權限（必須是上傳者或管理員）
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const isAdmin = roleData && ['super_admin', 'admin'].includes(roleData.role)
    const isUploader = debtRecord.uploaded_by === user.id

    if (!isUploader && !isAdmin) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '您沒有權限修改此債務記錄'),
        { status: 403 }
      )
    }

    // 5. 解析請求資料
    const body: DebtStatusUpdateRequest = await req.json()

    // 6. 驗證還款狀況
    const validStatuses = ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳']
    if (!validStatuses.includes(body.repayment_status)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `還款狀況必須為：${validStatuses.join('、')}`
        ),
        { status: 400 }
      )
    }

    // 7. 更新債務記錄
    const updateData: any = {
      repayment_status: body.repayment_status,
      updated_at: new Date().toISOString()
    }

    // 如果有提供備註，也一併更新
    if (body.note !== undefined) {
      updateData.note = body.note?.trim() || null
    }

    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('debt_records')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update debt record:', updateError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '更新失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 8. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'DEBT_UPDATE',
        p_resource: 'debt_records',
        p_resource_id: id,
        p_meta: {
          old_status: debtRecord.repayment_status,
          new_status: body.repayment_status,
          updated_by: member.nickname,
          is_admin: isAdmin
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞主流程
    }

    // 9. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          debt_record: updatedRecord,
          message: '債務狀態更新成功！'
        },
        '更新成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Debt update error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * 刪除債務記錄 API（僅限管理員）
 * DELETE /api/debts/[id]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ debtId: string }> }
) {
  try {
    const { debtId: id } = await params

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

    // 2. 檢查管理員權限
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

    // 3. 刪除債務記錄
    const { error: deleteError } = await supabaseAdmin
      .from('debt_records')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete debt record:', deleteError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '刪除失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 4. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'DEBT_DELETE',
        p_resource: 'debt_records',
        p_resource_id: id,
        p_meta: {
          deleted_by_admin: true
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞主流程
    }

    // 5. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          message: '債務記錄已刪除'
        },
        '刪除成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Debt delete error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

