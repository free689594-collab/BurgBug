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
 * GET /api/messages/sent
 * 取得寄件箱訊息
 * 
 * Query params:
 * - page: 頁碼（預設 1）
 * - limit: 每頁筆數（預設 20）
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

    const from = (page - 1) * limit
    const to = from + limit - 1

    // 查詢發送的訊息
    const { data: messages, error: messagesError, count } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('sender_id', user.id)
      .eq('deleted_by_sender', false)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (messagesError) {
      console.error('Failed to fetch sent messages:', messagesError)
      return NextResponse.json(
        { error: 'Failed to fetch sent messages' },
        { status: 500 }
      )
    }

    // 手動查詢接收者資訊
    const receiverIds = [...new Set(messages?.map(m => m.receiver_id) || [])]
    const { data: receivers } = await supabaseAdmin
      .from('members')
      .select('user_id, account, nickname')
      .in('user_id', receiverIds)

    // 組合資料
    const messagesWithReceiver = messages?.map(message => ({
      ...message,
      receiver: receivers?.find(r => r.user_id === message.receiver_id) || null
    })) || []

    return NextResponse.json({
      success: true,
      data: messagesWithReceiver,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Sent messages error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

