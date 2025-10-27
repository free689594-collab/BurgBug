import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 勳章解鎖檢查 API
 * POST /api/activity/check-badges
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 取得所有啟用的勳章配置
 * 3. 取得會員統計資料
 * 4. 逐一檢查解鎖條件
 * 5. 解鎖符合條件的勳章
 * 6. 返回新解鎖的勳章列表
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

    // 2. 取得會員統計資料
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('member_statistics')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (statsError) {
      console.error('Failed to fetch member stats:', statsError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '取得統計資料失敗'),
        { status: 500 }
      )
    }

    // 3. 取得會員角色（用於檢查管理員勳章）
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const userRole = roleData?.role || 'user'

    // 4. 取得已解鎖的勳章
    const { data: unlockedBadges } = await supabaseAdmin
      .from('member_badges')
      .select('badge_key')
      .eq('user_id', user.id)

    const unlockedBadgeKeys = new Set(unlockedBadges?.map(b => b.badge_key) || [])

    // 5. 取得所有啟用的勳章配置（排除已解鎖的）
    const { data: allBadges, error: badgesError } = await supabaseAdmin
      .from('badge_config')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (badgesError) {
      console.error('Failed to fetch badges:', badgesError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '取得勳章配置失敗'),
        { status: 500 }
      )
    }

    // 6. 檢查每個勳章的解鎖條件
    const newlyUnlockedBadges = []

    for (const badge of allBadges || []) {
      // 跳過已解鎖的勳章
      if (unlockedBadgeKeys.has(badge.badge_key)) {
        continue
      }

      const condition = badge.unlock_condition
      let shouldUnlock = false

      // 根據條件類型檢查
      if (condition.type === 'simple') {
        // 簡單條件：檢查統計欄位
        const fieldValue = stats?.[condition.field] || 0
        shouldUnlock = checkOperator(fieldValue, condition.operator, condition.value)
      } else if (condition.type === 'role') {
        // 角色條件：檢查使用者角色
        shouldUnlock = userRole === condition.value
      } else if (condition.type === 'badge_count') {
        // 勳章數量條件：檢查已解鎖勳章數量
        let badgeCount = unlockedBadgeKeys.size
        
        // 如果要排除隱藏勳章
        if (condition.exclude_hidden) {
          const { count: nonHiddenCount } = await supabaseAdmin
            .from('member_badges')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .in('badge_key', 
              allBadges
                .filter(b => !b.is_hidden)
                .map(b => b.badge_key)
            )
          badgeCount = nonHiddenCount || 0
        }
        
        shouldUnlock = checkOperator(badgeCount, condition.operator, condition.value)
      } else if (condition.type === 'custom') {
        // 自訂條件：需要特殊處理
        shouldUnlock = await checkCustomCondition(user.id, condition, stats)
      }

      // 如果符合條件，解鎖勳章
      if (shouldUnlock) {
        const { error: unlockError } = await supabaseAdmin
          .from('member_badges')
          .insert({
            user_id: user.id,
            badge_key: badge.badge_key,
            unlocked_at: new Date().toISOString(),
            is_displayed: true,
            display_order: newlyUnlockedBadges.length
          })

        if (!unlockError) {
          newlyUnlockedBadges.push({
            badge_key: badge.badge_key,
            badge_name: badge.badge_name,
            description: badge.description,
            difficulty: badge.difficulty,
            icon_name: badge.icon_name
          })
        }
      }
    }

    // 7. 返回新解鎖的勳章列表
    return NextResponse.json(
      successResponse(
        {
          newBadges: newlyUnlockedBadges,
          totalBadges: unlockedBadgeKeys.size + newlyUnlockedBadges.length,
          message: newlyUnlockedBadges.length > 0
            ? `恭喜！您解鎖了 ${newlyUnlockedBadges.length} 個新勳章！`
            : '目前沒有新勳章解鎖'
        },
        newlyUnlockedBadges.length > 0 ? '勳章解鎖成功' : '勳章檢查完成'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Check badges error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * 檢查運算子條件
 */
function checkOperator(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>=':
      return value >= target
    case '>':
      return value > target
    case '<=':
      return value <= target
    case '<':
      return value < target
    case '==':
    case '=':
      return value === target
    default:
      return false
  }
}

/**
 * 檢查自訂條件
 */
async function checkCustomCondition(userId: string, condition: any, stats: any): Promise<boolean> {
  try {
    switch (condition.check) {
      case 'single_debt_likes':
        // 檢查單筆資料收到的讚數
        const { data: debtRecords } = await supabaseAdmin
          .from('debt_records')
          .select('likes_count')
          .eq('uploaded_by', userId)
          .order('likes_count', { ascending: false })
          .limit(1)
          .single()
        
        return (debtRecords?.likes_count || 0) >= condition.value

      case 'registration_days':
        // 檢查註冊天數
        const { data: member } = await supabaseAdmin
          .from('members')
          .select('created_at')
          .eq('user_id', userId)
          .single()
        
        if (!member) return false
        
        const registrationDate = new Date(member.created_at)
        const daysSinceRegistration = Math.floor(
          (Date.now() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        
        return daysSinceRegistration >= condition.value

      case 'night_login_count':
        // 檢查凌晨 2-4 點登入次數
        // TODO: 需要記錄登入時間的功能
        return false

      case 'event_login':
        // 檢查活動期間登入
        // TODO: 需要活動系統
        return false

      default:
        return false
    }
  } catch (error) {
    console.error('Check custom condition error:', error)
    return false
  }
}

