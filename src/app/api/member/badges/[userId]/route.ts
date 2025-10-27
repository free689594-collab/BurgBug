import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * GET /api/member/badges/[userId]
 * 取得指定會員的勳章資訊
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // 1. 取得會員的統計資料（用於判斷解鎖條件）
    const { data: memberStats, error: statsError } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (statsError) {
      console.error('Failed to fetch member statistics:', statsError)
      return NextResponse.json(
        { error: '無法取得會員統計資料' },
        { status: 500 }
      )
    }

    // 2. 取得所有勳章配置
    const { data: allBadges, error: badgesError } = await supabaseAdmin
      .from('badge_config')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (badgesError) {
      console.error('Failed to fetch badge config:', badgesError)
      return NextResponse.json(
        { error: '無法取得勳章配置' },
        { status: 500 }
      )
    }

    // 3. 取得會員已解鎖的勳章
    const { data: unlockedBadges, error: unlockedError } = await supabaseAdmin
      .from('member_badges')
      .select('badge_key, unlocked_at, is_displayed, display_order')
      .eq('user_id', userId)

    if (unlockedError) {
      console.error('Failed to fetch unlocked badges:', unlockedError)
      return NextResponse.json(
        { error: '無法取得已解鎖勳章' },
        { status: 500 }
      )
    }

    // 4. 建立已解鎖勳章的 Map
    const unlockedMap = new Map(
      unlockedBadges?.map(badge => [badge.badge_key, badge]) || []
    )

    // 5. 組合勳章資訊
    const badges = allBadges?.map(badge => {
      const unlocked = unlockedMap.get(badge.badge_key)
      const isUnlocked = !!unlocked

      // 檢查解鎖條件
      let progress = 0
      let target = 0
      let isConditionMet = false

      if (badge.unlock_condition) {
        const condition = badge.unlock_condition as any
        if (condition.type === 'simple') {
          const field = condition.field
          const value = condition.value
          const operator = condition.operator

          const currentValue = (memberStats as any)[field] || 0
          target = value
          progress = currentValue

          if (operator === '>=') {
            isConditionMet = currentValue >= value
          } else if (operator === '>') {
            isConditionMet = currentValue > value
          } else if (operator === '==') {
            isConditionMet = currentValue === value
          }
        }
      }

      return {
        badge_key: badge.badge_key,
        badge_name: badge.badge_name,
        icon_type: badge.icon_type,
        icon_name: badge.icon_name,
        icon_color: badge.icon_color,
        background_gradient: badge.background_gradient,
        border_color: badge.border_color,
        glow_effect: badge.glow_effect,
        animation_effect: badge.animation_effect,
        description: badge.description,
        difficulty: badge.difficulty,
        unlock_condition: badge.unlock_condition,
        is_hidden: badge.is_hidden,
        display_order: badge.display_order,
        is_unlocked: isUnlocked,
        unlocked_at: unlocked?.unlocked_at || null,
        is_displayed: unlocked?.is_displayed || false,
        progress,
        target,
        is_condition_met: isConditionMet
      }
    }) || []

    // 6. 分類勳章
    const unlockedBadgesList = badges.filter(b => b.is_unlocked)
    const lockedBadgesList = badges.filter(b => !b.is_unlocked && !b.is_hidden)

    return NextResponse.json({
      success: true,
      data: {
        unlocked: unlockedBadgesList,
        locked: lockedBadgesList,
        total_badges: allBadges?.length || 0,
        unlocked_count: unlockedBadgesList.length,
        locked_count: lockedBadgesList.length
      }
    })

  } catch (error) {
    console.error('Error in GET /api/member/badges/[userId]:', error)
    return NextResponse.json(
      { error: '伺服器錯誤' },
      { status: 500 }
    )
  }
}

