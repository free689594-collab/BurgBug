import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET - 查詢會員資料修改申請
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.error('[Profile Modification GET] No token provided')
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('[Profile Modification GET] Auth error:', authError?.message || 'No user')
      return NextResponse.json({ error: `未授權：${authError?.message || '無效token'}` }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('profile_modification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch profile modification requests:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET /api/modification-requests/profile:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST - 提交會員資料修改申請
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.error('[Profile Modification POST] No token provided')
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('[Profile Modification POST] Auth error:', authError?.message || 'No user')
      return NextResponse.json({ error: `未授權：${authError?.message || '無效token'}` }, { status: 401 })
    }

    const body = await request.json()
    const { request_type, new_value, reason } = body

    if (!request_type || !new_value) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 驗證 request_type
    if (!['nickname', 'business_type', 'business_region'].includes(request_type)) {
      return NextResponse.json({ error: '無效的修改類型' }, { status: 400 })
    }

    // 取得當前值
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select(request_type)
      .eq('user_id', user.id)
      .single()

    if (memberError) {
      return NextResponse.json({ error: '無法取得會員資料' }, { status: 500 })
    }

    const old_value = member[request_type] || ''

    // 檢查是否有待審核的相同類型申請
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('profile_modification_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('request_type', request_type)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending) {
      return NextResponse.json({ error: '您已有相同類型的待審核申請' }, { status: 400 })
    }

    // 創建申請
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('profile_modification_requests')
      .insert({
        user_id: user.id,
        request_type,
        old_value,
        new_value,
        reason: reason || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create profile modification request:', insertError)
      return NextResponse.json({ error: '提交申請失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newRequest })
  } catch (error) {
    console.error('Error in POST /api/modification-requests/profile:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

