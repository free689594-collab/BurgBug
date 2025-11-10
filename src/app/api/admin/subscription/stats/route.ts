import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import type { SubscriptionStatsResponse, SubscriptionStats } from '@/types/subscription'

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
 * GET /api/admin/subscription/stats
 * 查詢訂閱系統統計資料（管理員專用）
 */
export async function GET(request: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證 token'),
        { status: 401 }
      )
    }

    // 3. 檢查管理員權限
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

    // 4. 查詢訂閱統計資料

    // 4.1 總訂閱數
    const { count: totalSubscriptions } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })

    // 4.2 活躍訂閱數（未過期）
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['trial', 'active'])
      .gte('end_date', new Date().toISOString())

    // 4.3 試用訂閱數
    const { count: trialSubscriptions } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial')
      .gte('end_date', new Date().toISOString())

    // 4.4 過期訂閱數
    const { count: expiredSubscriptions } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired')

    // 4.5 VIP 會員數
    const { count: vipMembers } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('is_vip', true)

    // 4.6 總收入（已付款的訂單）
    const { data: paidPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'paid')

    const totalRevenue = paidPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 4.7 本月收入
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: monthlyPayments } = await supabaseAdmin
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('created_at', startOfMonth.toISOString())

    const monthlyRevenue = monthlyPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0

    // 4.8 訂閱分布
    const { count: freeTrialCount } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_type', 'free_trial')
      .gte('end_date', new Date().toISOString())

    const { count: vipMonthlyCount } = await supabaseAdmin
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_type', 'vip_monthly')
      .gte('end_date', new Date().toISOString())

    // 4.9 最近付款記錄（最新 10 筆）
    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    // 4.10 即將到期的訂閱（7 天內）
    const sevenDaysLater = new Date()
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const { data: expiringSoon } = await supabaseAdmin
      .from('member_subscriptions')
      .select(`
        id,
        user_id,
        end_date,
        members!inner(account)
      `)
      .in('status', ['trial', 'active'])
      .gte('end_date', new Date().toISOString())
      .lte('end_date', sevenDaysLater.toISOString())
      .order('end_date', { ascending: true })

    const expiringSoonList = expiringSoon?.map(sub => {
      const endDate = new Date(sub.end_date)
      const now = new Date()
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return {
        user_id: sub.user_id,
        account: (sub.members as any)?.account || '',
        end_date: sub.end_date,
        days_remaining: daysRemaining
      }
    }) || []

    // 5. 組合統計資料
    const stats: SubscriptionStats = {
      total_subscriptions: totalSubscriptions || 0,
      active_subscriptions: activeSubscriptions || 0,
      trial_subscriptions: trialSubscriptions || 0,
      expired_subscriptions: expiredSubscriptions || 0,
      vip_members: vipMembers || 0,
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      subscription_distribution: {
        free_trial: freeTrialCount || 0,
        vip_monthly: vipMonthlyCount || 0
      },
      recent_payments: recentPayments || [],
      expiring_soon: {
        count: expiringSoonList.length,
        subscriptions: expiringSoonList
      }
    }

    return NextResponse.json(
      successResponse<SubscriptionStats>(stats)
    )

  } catch (error: any) {
    console.error('訂閱統計 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

