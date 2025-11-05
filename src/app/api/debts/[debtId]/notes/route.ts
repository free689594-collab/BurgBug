import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { CreateNoteRequest } from '@/types/debt'

/**
 * 債務記錄備註時間軸 API
 * GET /api/debts/[debtId]/notes - 取得備註列表
 * POST /api/debts/[debtId]/notes - 新增備註
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 驗證是否為債務記錄的上傳者
 * 3. 查詢或新增備註
 * 4. 返回結果
 */

/**
 * GET - 取得債務記錄的所有備註
 */
export async function GET(
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
        errorResponse(ErrorCodes.FORBIDDEN, '您沒有權限查看此債務記錄的備註'),
        { status: 403 }
      )
    }

    // 3. 查詢備註列表（按時間倒序）
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('debt_record_notes')
      .select('*')
      .eq('debt_record_id', debtId)
      .order('created_at', { ascending: false })

    if (notesError) {
      console.error('Failed to fetch notes:', notesError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢備註失敗'),
        { status: 500 }
      )
    }

    // 4. 返回結果
    return NextResponse.json(
      successResponse(notes || [], '查詢成功'),
      { status: 200 }
    )
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * POST - 新增備註
 */
export async function POST(
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
        errorResponse(ErrorCodes.FORBIDDEN, '您沒有權限為此債務記錄新增備註'),
        { status: 403 }
      )
    }

    // 3. 解析請求資料
    const body: CreateNoteRequest = await req.json()

    // 4. 驗證備註內容
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '備註內容不能為空'),
        { status: 400 }
      )
    }

    if (body.content.trim().length > 1000) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '備註內容不能超過 1000 字元'),
        { status: 400 }
      )
    }

    // 5. 新增備註
    const { data: newNote, error: insertError } = await supabaseAdmin
      .from('debt_record_notes')
      .insert({
        debt_record_id: debtId,
        user_id: user.id,
        content: body.content.trim()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert note:', insertError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '新增備註失敗'),
        { status: 500 }
      )
    }

    // 6. 返回結果
    return NextResponse.json(
      successResponse(newNote, '新增備註成功'),
      { status: 201 }
    )
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

