import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 等級升級檢查 API
 * POST /api/activity/check-level-up
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 呼叫 calculate_member_level 函數
 * 3. 比較新舊等級
 * 4. 如果升級，更新 member_statistics
 * 5. 返回升級資訊
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

    // 2. 取得當前等級資訊
    const { data: currentStats, error: statsError } = await supabaseAdmin
      .from('member_statistics')
      .select('activity_level, title, title_color, total_upload_quota_bonus, total_query_quota_bonus')
      .eq('user_id', user.id)
      .single()

    if (statsError) {
      console.error('Failed to fetch current stats:', statsError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '取得統計資料失敗'),
        { status: 500 }
      )
    }

    const currentLevel = currentStats?.activity_level || 1

    // 3. 呼叫 calculate_member_level 函數計算新等級
    const { data: newLevelData, error: calcError } = await supabaseAdmin
      .rpc('calculate_member_level', { p_user_id: user.id })

    if (calcError) {
      console.error('Failed to calculate member level:', calcError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '計算等級失敗'),
        { status: 500 }
      )
    }

    // 如果沒有返回資料（可能是點數為 0），使用 LV1 的預設值
    const newLevel = newLevelData?.[0]?.new_level || 1
    const newTitle = newLevelData?.[0]?.new_title || '初入江湖'
    const newTitleColor = newLevelData?.[0]?.new_title_color || '#9CA3AF'
    const totalUploadBonus = newLevelData?.[0]?.total_upload_bonus || 0
    const totalQueryBonus = newLevelData?.[0]?.total_query_bonus || 0

    // 4. 檢查是否升級
    const leveledUp = newLevel > currentLevel

    // 5. 如果升級，更新 member_statistics
    if (leveledUp) {
      const { error: updateError } = await supabaseAdmin
        .from('member_statistics')
        .update({
          activity_level: newLevel,
          title: newTitle,
          title_color: newTitleColor,
          total_upload_quota_bonus: totalUploadBonus,
          total_query_quota_bonus: totalQueryBonus,
          level_updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update level:', updateError)
        return NextResponse.json(
          errorResponse(ErrorCodes.DATABASE_ERROR, '更新等級失敗'),
          { status: 500 }
        )
      }
    }

    // 6. 返回升級資訊
    return NextResponse.json(
      successResponse(
        {
          leveledUp,
          oldLevel: currentLevel,
          newLevel,
          newTitle,
          newTitleColor,
          totalUploadBonus,
          totalQueryBonus,
          message: leveledUp
            ? `恭喜！您已升級到 LV${newLevel}「${newTitle}」！`
            : '等級未變更'
        },
        leveledUp ? '升級成功' : '等級檢查完成'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Check level up error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

