import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 活躍度點數計算 API
 * POST /api/activity/add-points
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 驗證 action 參數
 * 3. 從 activity_point_rules 取得點數規則
 * 4. 檢查每日上限
 * 5. 檢查冷卻時間
 * 6. 新增活躍度點數到 member_statistics
 * 7. 記錄到 activity_point_history
 * 8. 檢查是否升級
 * 9. 返回新的點數和等級
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

    // 2. 解析請求資料
    const body = await req.json()
    const { action, metadata } = body

    // 3. 驗證 action 參數
    const validActions = ['upload', 'query', 'like_received', 'like_given', 'daily_login']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `action 必須為：${validActions.join('、')}`
        ),
        { status: 400 }
      )
    }

    // 4. 從 activity_point_rules 取得點數規則
    const { data: rule, error: ruleError } = await supabaseAdmin
      .from('activity_point_rules')
      .select('*')
      .eq('action', action)
      .eq('is_active', true)
      .single()

    if (ruleError || !rule) {
      return NextResponse.json(
        errorResponse(ErrorCodes.NOT_FOUND, '找不到對應的點數規則'),
        { status: 404 }
      )
    }

    // 5. 檢查每日上限（如果有設定）
    if (rule.max_daily_count !== null) {
      const today = new Date().toISOString().split('T')[0]
      const { count: todayCount } = await supabaseAdmin
        .from('activity_point_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('action', action)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`)

      if ((todayCount || 0) >= rule.max_daily_count) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            `今日 ${action} 次數已達上限（${rule.max_daily_count} 次）`
          ),
          { status: 429 }
        )
      }
    }

    // 6. 檢查冷卻時間（如果有設定）
    if (rule.cooldown_seconds > 0) {
      const cooldownTime = new Date(Date.now() - rule.cooldown_seconds * 1000).toISOString()
      const { data: recentAction } = await supabaseAdmin
        .from('activity_point_history')
        .select('created_at')
        .eq('user_id', user.id)
        .eq('action', action)
        .gte('created_at', cooldownTime)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (recentAction) {
        const remainingSeconds = Math.ceil(
          (new Date(recentAction.created_at).getTime() + rule.cooldown_seconds * 1000 - Date.now()) / 1000
        )
        return NextResponse.json(
          errorResponse(
            ErrorCodes.RATE_LIMIT_EXCEEDED,
            `請等待 ${remainingSeconds} 秒後再試`
          ),
          { status: 429 }
        )
      }
    }

    // 7. 取得當前統計資料（如果不存在則建立初始記錄）
    const { data: currentStats } = await supabaseAdmin
      .from('member_statistics')
      .select('activity_points, uploads_count, queries_count, likes_received, likes_given')
      .eq('user_id', user.id)
      .maybeSingle()

    // 如果記錄不存在，先建立初始記錄
    if (!currentStats) {
      const { error: insertError } = await supabaseAdmin
        .from('member_statistics')
        .insert({
          user_id: user.id,
          activity_points: 0,
          activity_level: 1,
          title: '初入江湖',
          title_color: '#9CA3AF',
          total_upload_quota_bonus: 0,
          total_query_quota_bonus: 0,
          consecutive_login_days: 0
        })

      if (insertError) {
        console.error('Failed to create initial stats:', insertError)
        return NextResponse.json(
          errorResponse(ErrorCodes.DATABASE_ERROR, '建立統計資料失敗'),
          { status: 500 }
        )
      }
    }

    // 8. 新增活躍度點數到 member_statistics，並更新對應的計數器
    const newActivityPoints = (currentStats?.activity_points || 0) + rule.points

    // 準備更新資料
    const updateData: any = {
      activity_points: newActivityPoints
    }

    // 根據 action 更新對應的計數器
    if (action === 'upload') {
      updateData.uploads_count = (currentStats?.uploads_count || 0) + 1
    } else if (action === 'query') {
      updateData.queries_count = (currentStats?.queries_count || 0) + 1
    } else if (action === 'like_received') {
      updateData.likes_received = (currentStats?.likes_received || 0) + 1
    } else if (action === 'like_given') {
      updateData.likes_given = (currentStats?.likes_given || 0) + 1
    }

    const { data: updatedStats, error: updateError } = await supabaseAdmin
      .from('member_statistics')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update activity points:', updateError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '更新活躍度點數失敗'),
        { status: 500 }
      )
    }

    // 9. 更新 usage_counters 表（每日配額使用次數）
    const today = new Date().toISOString().split('T')[0]

    // 準備 usage_counters 更新資料
    const usageUpdateData: any = {}
    if (action === 'upload') {
      usageUpdateData.uploads = 1
    } else if (action === 'query') {
      usageUpdateData.queries = 1
    } else if (action === 'like_given') {
      usageUpdateData.likes = 1
    }

    // 如果需要更新 usage_counters
    if (Object.keys(usageUpdateData).length > 0) {
      // 先嘗試取得今日記錄
      const { data: existingUsage } = await supabaseAdmin
        .from('usage_counters')
        .select('*')
        .eq('user_id', user.id)
        .eq('day', today)
        .maybeSingle()

      if (existingUsage) {
        // 如果記錄存在，更新計數器
        const updateUsageData: any = {}
        if (action === 'upload') {
          updateUsageData.uploads = (existingUsage.uploads || 0) + 1
        } else if (action === 'query') {
          updateUsageData.queries = (existingUsage.queries || 0) + 1
        } else if (action === 'like_given') {
          updateUsageData.likes = (existingUsage.likes || 0) + 1
        }

        await supabaseAdmin
          .from('usage_counters')
          .update(updateUsageData)
          .eq('user_id', user.id)
          .eq('day', today)
      } else {
        // 如果記錄不存在，插入新記錄
        await supabaseAdmin
          .from('usage_counters')
          .insert({
            user_id: user.id,
            day: today,
            ...usageUpdateData
          })
      }
    }

    // 10. 記錄到 activity_point_history
    const { error: historyError } = await supabaseAdmin
      .from('activity_point_history')
      .insert({
        user_id: user.id,
        action,
        points: rule.points,
        description: rule.description,
        metadata: metadata || null
      })

    if (historyError) {
      console.error('Failed to insert activity point history:', historyError)
      // 不阻塞主流程
    }

    // 11. 檢查是否升級
    let levelUpInfo = null
    try {
      const levelUpResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/check-level-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (levelUpResponse.ok) {
        const levelUpData = await levelUpResponse.json()
        if (levelUpData.data?.leveledUp) {
          levelUpInfo = levelUpData.data
        }
      }
    } catch (err) {
      console.error('Failed to check level up:', err)
      // 不阻塞主流程
    }

    // 12. 檢查勳章解鎖
    let newBadges = []
    try {
      const badgesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/activity/check-badges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (badgesResponse.ok) {
        const badgesData = await badgesResponse.json()
        if (badgesData.data?.newBadges) {
          newBadges = badgesData.data.newBadges
        }
      }
    } catch (err) {
      console.error('Failed to check badges:', err)
      // 不阻塞主流程
    }

    // 13. 返回成功回應
    return NextResponse.json(
      successResponse(
        {
          points_added: rule.points,
          total_points: updatedStats.activity_points,
          current_level: updatedStats.activity_level,
          current_title: updatedStats.title,
          level_up: levelUpInfo,
          new_badges: newBadges,
          message: `成功獲得 ${rule.points} 活躍度點數！`
        },
        '點數新增成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Add activity points error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

