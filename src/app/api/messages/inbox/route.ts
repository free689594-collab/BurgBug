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
 * GET /api/messages/inbox
 * 取得收件箱訊息
 * 
 * Query params:
 * - page: 頁碼（預設 1）
 * - limit: 每頁筆數（預設 20）
 * - unread_only: 只顯示未讀（true/false）
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證用戶
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    const from = (page - 1) * limit
    const to = from + limit - 1

    // 建立查詢
    let query = supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('receiver_id', user.id)
      .eq('deleted_by_receiver', false)
      .order('created_at', { ascending: false })

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: messages, error: messagesError, count } = await query
      .range(from, to)

    if (messagesError) {
      console.error('Failed to fetch messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // 手動查詢發送者資訊
    const senderIds = [...new Set(messages?.map(m => m.sender_id).filter(Boolean) || [])]
    const { data: senders } = await supabaseAdmin
      .from('members')
      .select('user_id, account, nickname')
      .in('user_id', senderIds)

    // 組合資料
    const messagesWithSender = messages?.map(message => ({
      ...message,
      sender: message.sender_type === 'system' 
        ? { account: 'system', nickname: '系統' }
        : senders?.find(s => s.user_id === message.sender_id) || null
    })) || []

    return NextResponse.json({
      success: true,
      data: messagesWithSender,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Inbox error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/messages/inbox
 * 標記訊息為已讀/未讀
 *
 * Body:
 * - message_ids: 訊息 ID 陣列
 * - is_read: true/false
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證用戶
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message_ids, is_read } = body

    if (!message_ids || !Array.isArray(message_ids)) {
      return NextResponse.json(
        { error: 'message_ids is required and must be an array' },
        { status: 400 }
      )
    }

    // 更新訊息狀態
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        is_read,
        read_at: is_read ? new Date().toISOString() : null
      })
      .in('id', message_ids)
      .eq('receiver_id', user.id)

    if (updateError) {
      console.error('Failed to update messages:', updateError)
      return NextResponse.json(
        { error: 'Failed to update messages' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Messages updated successfully'
    })

  } catch (error) {
    console.error('Update messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
