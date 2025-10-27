import { NextRequest, NextResponse } from 'next/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { supabaseAdmin } from '@/lib/supabase/server'

/**
 * POST /api/debts/[debtId]/like
 * 對債務記錄按讚
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ debtId: string }> }
) {
  try {
    const { debtId } = await params

    // 1. 驗證 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證失敗'),
        { status: 401 }
      )
    }

    // 3. 檢查會員狀態
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('status')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到會員資料'),
        { status: 404 }
      )
    }

    if (member.status !== 'approved') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '只有已審核會員才能按讚'),
        { status: 403 }
      )
    }

    // 4. 檢查債務記錄是否存在
    const { data: debtRecord, error: debtError } = await supabaseAdmin
      .from('debt_records')
      .select('id, uploaded_by')
      .eq('id', debtId)
      .single()

    if (debtError || !debtRecord) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到債務記錄'),
        { status: 404 }
      )
    }

    // 5. 檢查是否是自己上傳的債務記錄
    if (debtRecord.uploaded_by === user.id) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '不能對自己上傳的債務記錄按讚'),
        { status: 403 }
      )
    }

    // 6. 檢查是否已經按讚
    const { data: existingLike } = await supabaseAdmin
      .from('debt_record_likes')
      .select('id')
      .eq('debt_record_id', debtId)
      .eq('liker_id', user.id)
      .maybeSingle()

    if (existingLike) {
      return NextResponse.json(
        errorResponse(ErrorCodes.CONFLICT, '您已經對這筆債務記錄按過讚了'),
        { status: 409 }
      )
    }

    // 7. 新增按讚記錄
    const { error: insertError } = await supabaseAdmin
      .from('debt_record_likes')
      .insert({
        debt_record_id: debtId,
        liker_id: user.id
      })

    if (insertError) {
      console.error('Insert like error:', insertError)
      // 重複按讚（唯一鍵衝突）
      if ((insertError as any).code === '23505') {
        return NextResponse.json(
          errorResponse(ErrorCodes.CONFLICT, '您已經對這筆債務記錄按過讚了'),
          { status: 409 }
        )
      }
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '按讚失敗'),
        { status: 500 }
      )
    }

    // 8. 新增活躍度點數
    // 8.1 為按讚者增加 1 點（like_given）
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/add-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'like_given',
          metadata: {
            debt_record_id: debtId,
            uploader_id: debtRecord.uploaded_by
          }
        })
      })
    } catch (err) {
      console.error('Failed to add points for liker:', err)
      // 不阻塞主流程
    }

    // 8.2 為被讚者增加 3 點（like_received）
    try {
      // 直接在資料庫中添加活躍度點數
      const { error: pointsError } = await supabaseAdmin
        .from('activity_point_history')
        .insert({
          user_id: debtRecord.uploaded_by,
          action: 'like_received',
          points: 3,
          metadata: {
            debt_record_id: debtId,
            liker_id: user.id
          }
        })

      if (!pointsError) {
        // 更新會員的活躍度點數
        const { data: currentPoints } = await supabaseAdmin
          .from('members')
          .select('activity_points')
          .eq('user_id', debtRecord.uploaded_by)
          .single()

        if (currentPoints) {
          await supabaseAdmin
            .from('members')
            .update({ activity_points: (currentPoints.activity_points || 0) + 3 })
            .eq('user_id', debtRecord.uploaded_by)
        }
      }
    } catch (err) {
      console.error('Failed to add points for uploader:', err)
      // 不阻塞主流程
    }

    // 9. 取得更新後的按讚數
    const { data: updatedDebtRecord } = await supabaseAdmin
      .from('debt_records')
      .select('likes_count')
      .eq('id', debtId)
      .single()

    return NextResponse.json(
      successResponse({
        message: '按讚成功！',
        likes_count: updatedDebtRecord?.likes_count || 0
      }, '按讚成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Like debt record error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/debts/[debtId]/like
 * 取消對債務記錄的按讚
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ debtId: string }> }
) {
  try {
    const { debtId } = await params

    // 1. 驗證 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證失敗'),
        { status: 401 }
      )
    }

    // 3. 刪除按讚記錄
    const { error: deleteError } = await supabaseAdmin
      .from('debt_record_likes')
      .delete()
      .eq('debt_record_id', debtId)
      .eq('liker_id', user.id)

    if (deleteError) {
      console.error('Delete like error:', deleteError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '取消按讚失敗'),
        { status: 500 }
      )
    }

    // 4. 取得更新後的按讚數
    const { data: updatedDebtRecord } = await supabaseAdmin
      .from('debt_records')
      .select('likes_count')
      .eq('id', debtId)
      .single()

    return NextResponse.json(
      successResponse({
        message: '已取消按讚',
        likes_count: updatedDebtRecord?.likes_count || 0
      }, '取消按讚成功'),
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unlike debt record error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

