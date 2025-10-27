import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET - 管理員查詢所有修改申請
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    // 檢查管理員權限
    const { data: role } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!role || !['super_admin', 'admin'].includes(role.role)) {
      return NextResponse.json({ error: '無權限' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'profile' or 'debt'
    const status = searchParams.get('status')

    // 查詢會員資料修改申請
    let profileQuery = supabaseAdmin
      .from('profile_modification_requests')
      .select('*, members!profile_modification_requests_user_id_fkey(nickname, business_type, business_region)')
      .order('created_at', { ascending: false })

    if (status) {
      profileQuery = profileQuery.eq('status', status)
    }

    // 查詢債務資料修改申請
    let debtQuery = supabaseAdmin
      .from('debt_modification_requests')
      .select('*, members!debt_modification_requests_user_id_fkey(nickname), debt_records(debtor_name, debtor_id_first_letter, debtor_id_last5)')
      .order('created_at', { ascending: false })

    if (status) {
      debtQuery = debtQuery.eq('status', status)
    }

    let profileData = []
    let debtData = []

    if (!type || type === 'profile') {
      const { data, error } = await profileQuery
      if (error) {
        console.error('Failed to fetch profile requests:', error)
      } else {
        profileData = data || []
      }
    }

    if (!type || type === 'debt') {
      const { data, error } = await debtQuery
      if (error) {
        console.error('Failed to fetch debt requests:', error)
      } else {
        debtData = data || []
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        profile: profileData,
        debt: debtData
      }
    })
  } catch (error) {
    console.error('Error in GET /api/admin/modification-requests:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

