import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// PATCH - 管理員審核修改申請
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { type, status, admin_comment } = body // type: 'profile' or 'debt'

    if (!type || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '缺少必要參數或參數無效' }, { status: 400 })
    }

    const tableName = type === 'profile'
      ? 'profile_modification_requests'
      : 'debt_modification_requests'

    // 更新申請狀態
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .update({
        status,
        admin_id: user.id,
        admin_comment: admin_comment || null
      })
      .eq('id', id)
      .eq('status', 'pending') // 只能審核待審核的申請
      .select()
      .single()

    if (error) {
      console.error('Failed to update modification request:', error)
      return NextResponse.json({ error: '審核失敗' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '申請不存在或已被審核' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in PATCH /api/admin/modification-requests/[id]:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

