import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { DebtUploadRequest } from '@/types/debt'

/**
 * 債務上傳 API
 * POST /api/debts/upload
 * 
 * 功能：
 * 1. 驗證使用者身份和權限（必須是已審核會員）
 * 2. 驗證輸入資料（所有必填欄位）
 * 3. 檢查每日上傳配額（初始 10 次/天）
 * 4. 插入債務記錄
 * 5. 記錄審計日誌
 * 6. 返回成功回應
 */
export async function POST(req: NextRequest) {
  try {
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

    // 2. 檢查會員狀態（必須是已審核會員）
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

    if (member.status !== 'approved') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '您的帳號尚未通過審核，無法上傳債務資料'),
        { status: 403 }
      )
    }

    // 3. 解析請求資料
    const body: DebtUploadRequest = await req.json()

    // 4. 驗證必填欄位
    const requiredFields = [
      'debtor_name',
      'debtor_id_full',
      'gender',
      'residence',
      'debt_date',
      'face_value',
      'payment_frequency',
      'repayment_status'
    ]

    const missingFields: string[] = []
    const fieldNames: Record<string, string> = {
      debtor_name: '債務人姓名',
      debtor_id_full: '身分證字號',
      gender: '性別',
      residence: '居住地',
      debt_date: '債務日期',
      face_value: '票面金額',
      payment_frequency: '還款配合',
      repayment_status: '還款狀況'
    }

    for (const field of requiredFields) {
      if (!body[field as keyof DebtUploadRequest]) {
        missingFields.push(fieldNames[field])
      }
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `以下欄位為必填：${missingFields.join('、')}`
        ),
        { status: 400 }
      )
    }

    // 5. 驗證欄位格式
    // 5.1 身分證格式（1 個英文字母 + 9 個數字）
    if (!/^[A-Z][0-9]{9}$/i.test(body.debtor_id_full)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '身分證格式錯誤，應為 1 個英文字母 + 9 個數字（例如：A123456789）'
        ),
        { status: 400 }
      )
    }

    // 5.2 性別驗證
    if (!['男', '女', '其他'].includes(body.gender)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '性別必須為：男、女、其他'),
        { status: 400 }
      )
    }

    // 5.3 居住地驗證
    const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
    if (!validRegions.includes(body.residence)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `居住地必須為：${validRegions.join('、')}`
        ),
        { status: 400 }
      )
    }

    // 5.4 還款配合驗證
    if (!['daily', 'weekly', 'monthly'].includes(body.payment_frequency)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '還款配合必須為：daily（日結）、weekly（周結）、monthly（月結）'
        ),
        { status: 400 }
      )
    }

    // 5.5 還款狀況驗證
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

    // 5.6 票面金額驗證
    if (typeof body.face_value !== 'number' || body.face_value <= 0) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '票面金額必須為大於 0 的數字'),
        { status: 400 }
      )
    }

    // 5.7 債務日期驗證（YYYY-MM-DD 格式）
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.debt_date)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '債務日期格式錯誤，應為 YYYY-MM-DD（例如：2025-01-15）'
        ),
        { status: 400 }
      )
    }

    // 5.8 電話格式驗證（選填）
    if (body.debtor_phone && !/^09\d{8}$/.test(body.debtor_phone)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '電話格式錯誤，請輸入正確的手機號碼（例如：0912345678）'
        ),
        { status: 400 }
      )
    }

    // 6. 檢查每日上傳配額（初始 10 次/天）
    const today = new Date().toISOString().split('T')[0]
    const { count: todayUploadCount } = await supabaseAdmin
      .from('debt_records')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', user.id)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`)

    const dailyLimit = 10 // TODO: 從會員設定中讀取
    if ((todayUploadCount || 0) >= dailyLimit) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          `您今日的上傳次數已達上限（${dailyLimit} 次），請明天再試`
        ),
        { status: 429 }
      )
    }

    // 7. 上傳債務記錄並新增活躍度點數（優化：使用資料庫函數合併操作）
    const { data: uploadResult, error: uploadError } = await supabaseAdmin.rpc('upload_debt_with_points', {
      p_user_id: user.id,
      p_debt_data: {
        debtor_name: body.debtor_name.trim(),
        debtor_id_full: body.debtor_id_full.toUpperCase(),
        debtor_phone: body.debtor_phone || null,
        gender: body.gender,
        profession: body.profession?.trim() || null,
        residence: body.residence,
        debt_date: body.debt_date,
        face_value: body.face_value,
        payment_frequency: body.payment_frequency,
        repayment_status: body.repayment_status,
        note: body.note?.trim() || null
      }
    })

    if (uploadError || !uploadResult || !uploadResult.success) {
      console.error('Failed to upload debt record:', uploadError || uploadResult?.error)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, uploadResult?.message || '債務記錄儲存失敗，請稍後再試'),
        { status: 500 }
      )
    }

    const debtId = uploadResult.debt_id
    const activityResult = {
      points_added: uploadResult.points_added,
      total_points: uploadResult.total_points
    }

    // 8. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'DEBT_UPLOAD',
        p_resource: 'debt_records',
        p_resource_id: debtId,
        p_meta: {
          debtor_id_last5: body.debtor_id_full.slice(-5),
          residence: body.residence,
          face_value: body.face_value,
          uploader_nickname: member.nickname
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞主流程
    }

    // 9. 查詢剛上傳的債務記錄（取得完整資訊）
    const { data: debtRecord } = await supabaseAdmin
      .from('debt_records')
      .select('id, debtor_id_last5, debtor_id_first_letter, created_at')
      .eq('id', debtId)
      .single()

    // 10. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          debt_record: {
            id: debtId,
            debtor_id_last5: debtRecord?.debtor_id_last5 || body.debtor_id_full.slice(-5),
            debtor_id_first_letter: debtRecord?.debtor_id_first_letter || body.debtor_id_full.charAt(0),
            created_at: new Date().toISOString()
          },
          remaining_uploads: dailyLimit - (todayUploadCount || 0) - 1,
          message: '債務記錄上傳成功！',
          // 活躍度點數資訊
          activity: activityResult
        },
        '上傳成功'
      ),
      { status: 201 }
    )
  } catch (error) {
    console.error('Debt upload error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

