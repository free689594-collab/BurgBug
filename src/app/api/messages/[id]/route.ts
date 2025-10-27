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
 * GET /api/messages/[id]
 * 取得單筆訊息詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證用戶
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 查詢訊息
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', id)
      .single()

    if (messageError || !message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // 檢查權限（只有發送者或接收者可以查看）
    if (message.sender_id !== user.id && message.receiver_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 如果是接收者查看，自動標記為已讀
    if (message.receiver_id === user.id && !message.is_read) {
      await supabaseAdmin
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id)
      
      message.is_read = true
      message.read_at = new Date().toISOString()
    }

    // 查詢發送者資訊
    let sender = null
    if (message.sender_type === 'system') {
      sender = { account: 'system', nickname: '系統' }
    } else if (message.sender_id) {
      const { data: senderData } = await supabaseAdmin
        .from('members')
        .select('user_id, account, nickname')
        .eq('user_id', message.sender_id)
        .single()
      sender = senderData
    }

    // 查詢接收者資訊
    const { data: receiver } = await supabaseAdmin
      .from('members')
      .select('user_id, account, nickname')
      .eq('user_id', message.receiver_id)
      .single()

    return NextResponse.json({
      success: true,
      data: {
        ...message,
        sender,
        receiver
      }
    })

  } catch (error) {
    console.error('Get message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/messages/[id]
 * 更新訊息（標記已讀/未讀）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
    const { is_read } = body

    // 更新訊息
    const { data: message, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        is_read,
        read_at: is_read ? new Date().toISOString() : null
      })
      .eq('id', id)
      .eq('receiver_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update message:', updateError)
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: message
    })

  } catch (error) {
    console.error('Update message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/messages/[id]
 * 軟刪除訊息
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 驗證用戶
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 查詢訊息
    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('sender_id, receiver_id')
      .eq('id', id)
      .single()

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // 判斷是發送者還是接收者
    let updateData: any = {}
    if (message.sender_id === user.id) {
      updateData.deleted_by_sender = true
    } else if (message.receiver_id === user.id) {
      updateData.deleted_by_receiver = true
    } else {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    // 軟刪除
    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .update(updateData)
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete message:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })

  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

