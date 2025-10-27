import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET - 查詢債務資料修改申請
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.error('[Debt Modification GET] No token provided')
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      console.error('[Debt Modification GET] Auth error:', authError?.message || 'No user')
      return NextResponse.json({ error: `未授權：${authError?.message || '無效token'}` }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabaseAdmin
      .from('debt_modification_requests')
      .select('*, debt_records(debtor_name, debtor_id_first_letter, debtor_id_last5)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Failed to fetch debt modification requests:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error in GET /api/modification-requests/debt:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

// POST - 提交債務資料修改申請
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權' }, { status: 401 })
    }

    const body = await request.json()
    const { debt_record_id, field_name, new_value, reason } = body

    if (!debt_record_id || !field_name || !new_value) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 })
    }

    // 驗證債務記錄是否存在且屬於該會員
    const { data: debt, error: debtError } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('id', debt_record_id)
      .eq('uploaded_by', user.id)
      .single()

    if (debtError || !debt) {
      return NextResponse.json({ error: '債務記錄不存在或無權限' }, { status: 404 })
    }

    const old_value = (debt as any)[field_name]?.toString() || ''

    // 檢查是否有待審核的相同欄位申請
    const { data: pending, error: pendingError } = await supabaseAdmin
      .from('debt_modification_requests')
      .select('id')
      .eq('debt_record_id', debt_record_id)
      .eq('field_name', field_name)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending) {
      return NextResponse.json({ error: '該欄位已有待審核的修改申請' }, { status: 400 })
    }

    // 創建申請
    const { data: newRequest, error: insertError } = await supabaseAdmin
      .from('debt_modification_requests')
      .insert({
        debt_record_id,
        user_id: user.id,
        field_name,
        old_value,
        new_value: new_value.toString(),
        reason: reason || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create debt modification request:', insertError)
      return NextResponse.json({ error: '提交申請失敗' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newRequest })
  } catch (error) {
    console.error('Error in POST /api/modification-requests/debt:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

