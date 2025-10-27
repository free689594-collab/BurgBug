import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 按讚功能 API
 * POST /api/member/like/[memberId]
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 檢查是否為自己（不能給自己按讚）
 * 3. 檢查是否已按讚
 * 4. 插入按讚記錄
 * 5. 給讚者 +1 點
 * 6. 被讚者 +3 點
 * 7. 返回成功回應
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

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

    // 2. 檢查是否為自己
    if (user.id === memberId) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '不能給自己按讚'),
        { status: 400 }
      )
    }

    // 3. 檢查被讚會員是否存在
    const { data: targetMember, error: memberError } = await supabaseAdmin
      .from('members')
      .select('user_id, nickname')
      .eq('user_id', memberId)
      .single()

    if (memberError || !targetMember) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到該會員'),
        { status: 404 }
      )
    }

    // 4. 檢查是否已按讚
    const { data: existingLike } = await supabaseAdmin
      .from('member_likes')
      .select('id')
      .eq('liker_id', user.id)
      .eq('liked_member_id', memberId)
      .single()

    if (existingLike) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '您已經給這位會員按過讚了'),
        { status: 400 }
      )
    }

    // 5. 插入按讚記錄
    const { error: insertError } = await supabaseAdmin
      .from('member_likes')
      .insert({
        liker_id: user.id,
        liked_member_id: memberId,
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to insert like:', insertError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '按讚失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 6. 給讚者 +1 點（like_given）
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
            liked_member_id: memberId,
            liked_member_nickname: targetMember.nickname
          }
        })
      })
    } catch (err) {
      console.error('Failed to add points for liker:', err)
      // 不阻塞主流程
    }

    // 7. 被讚者 +3 點（like_received）
    try {
      // 需要取得被讚者的 token，這裡我們直接更新資料庫
      // 因為被讚者可能不在線上
      
      // 取得被讚者當前活躍度點數
      const { data: targetStats } = await supabaseAdmin
        .from('member_statistics')
        .select('activity_points')
        .eq('user_id', memberId)
        .single()

      // 取得 like_received 的點數規則
      const { data: rule } = await supabaseAdmin
        .from('activity_point_rules')
        .select('points')
        .eq('action', 'like_received')
        .eq('is_active', true)
        .single()

      if (rule && targetStats) {
        // 更新被讚者的活躍度點數
        await supabaseAdmin
          .from('member_statistics')
          .update({
            activity_points: (targetStats.activity_points || 0) + rule.points
          })
          .eq('user_id', memberId)

        // 記錄到 activity_point_history
        await supabaseAdmin
          .from('activity_point_history')
          .insert({
            user_id: memberId,
            action: 'like_received',
            points: rule.points,
            description: '收到讚',
            metadata: {
              liker_id: user.id
            }
          })
      }
    } catch (err) {
      console.error('Failed to add points for liked member:', err)
      // 不阻塞主流程
    }

    // 8. 取得被讚者的新讚數
    const { count: newLikeCount } = await supabaseAdmin
      .from('member_likes')
      .select('*', { count: 'exact', head: true })
      .eq('liked_member_id', memberId)

    // 9. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          liked_member_id: memberId,
          liked_member_nickname: targetMember.nickname,
          new_like_count: newLikeCount || 0,
          message: `成功給 ${targetMember.nickname} 按讚！`
        },
        '按讚成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Like member error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * 取消按讚功能 API
 * DELETE /api/member/like/[memberId]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

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

    // 2. 檢查按讚記錄是否存在
    const { data: existingLike, error: fetchError } = await supabaseAdmin
      .from('member_likes')
      .select('id')
      .eq('liker_id', user.id)
      .eq('liked_member_id', memberId)
      .single()

    if (fetchError || !existingLike) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '您尚未給這位會員按讚'),
        { status: 404 }
      )
    }

    // 3. 刪除按讚記錄
    const { error: deleteError } = await supabaseAdmin
      .from('member_likes')
      .delete()
      .eq('liker_id', user.id)
      .eq('liked_member_id', memberId)

    if (deleteError) {
      console.error('Failed to delete like:', deleteError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '取消按讚失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 4. 扣除給讚者的點數（-1 點）
    try {
      const { data: likerStats } = await supabaseAdmin
        .from('member_statistics')
        .select('activity_points')
        .eq('user_id', user.id)
        .single()

      if (likerStats) {
        await supabaseAdmin
          .from('member_statistics')
          .update({
            activity_points: Math.max(0, (likerStats.activity_points || 0) - 1)
          })
          .eq('user_id', user.id)
      }
    } catch (err) {
      console.error('Failed to deduct points from liker:', err)
      // 不阻塞主流程
    }

    // 5. 扣除被讚者的點數（-3 點）
    try {
      const { data: targetStats } = await supabaseAdmin
        .from('member_statistics')
        .select('activity_points')
        .eq('user_id', memberId)
        .single()

      if (targetStats) {
        await supabaseAdmin
          .from('member_statistics')
          .update({
            activity_points: Math.max(0, (targetStats.activity_points || 0) - 3)
          })
          .eq('user_id', memberId)
      }
    } catch (err) {
      console.error('Failed to deduct points from liked member:', err)
      // 不阻塞主流程
    }

    // 6. 取得被讚者的新讚數
    const { count: newLikeCount } = await supabaseAdmin
      .from('member_likes')
      .select('*', { count: 'exact', head: true })
      .eq('liked_member_id', memberId)

    // 7. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          liked_member_id: memberId,
          new_like_count: newLikeCount || 0,
          message: '取消按讚成功'
        },
        '取消按讚成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Unlike member error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

