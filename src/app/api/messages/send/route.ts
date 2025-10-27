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
 * POST /api/messages/send
 * 發送站內信
 * 
 * Body:
 * - receiver_id: 接收者 user_id（個人訊息）或 'all'（系統公告）
 * - subject: 主旨
 * - content: 內容
 * - message_type: 'personal' | 'system' | 'announcement'
 */
export async function POST(request: NextRequest) {
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
    const { receiver_id, receiver_type, subject, content, message_type = 'personal' } = body

    // 驗證必填欄位
    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      )
    }

    // 如果是會員發送給管理員
    if (receiver_type === 'admin') {
      // 取得所有管理員
      const { data: admins } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin'])

      if (!admins || admins.length === 0) {
        return NextResponse.json(
          { error: 'No admins found' },
          { status: 404 }
        )
      }

      // 批量插入訊息給所有管理員
      const messages = admins.map(admin => ({
        sender_id: user.id,
        sender_type: 'member',
        receiver_id: admin.user_id,
        subject,
        content,
        message_type: 'personal'
      }))

      const { error: insertError } = await supabaseAdmin
        .from('messages')
        .insert(messages)

      if (insertError) {
        console.error('Failed to send messages to admins:', insertError)
        return NextResponse.json(
          { error: 'Failed to send messages' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `訊息已發送給 ${admins.length} 位管理員`
      })
    }

    // 如果是系統訊息或公告，檢查管理員權限
    if (message_type === 'system' || message_type === 'announcement') {
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
        return NextResponse.json(
          { error: 'Only admins can send system messages' },
          { status: 403 }
        )
      }

      // 如果是發送給所有人
      if (receiver_id === 'all') {
        // 取得所有已審核的會員
        const { data: members } = await supabaseAdmin
          .from('members')
          .select('user_id')
          .eq('status', 'approved')

        if (!members || members.length === 0) {
          return NextResponse.json(
            { error: 'No approved members found' },
            { status: 404 }
          )
        }

        // 批量插入訊息
        const messages = members.map(member => ({
          sender_id: user.id,
          sender_type: 'system',
          receiver_id: member.user_id,
          subject,
          content,
          message_type
        }))

        const { error: insertError } = await supabaseAdmin
          .from('messages')
          .insert(messages)

        if (insertError) {
          console.error('Failed to send messages:', insertError)
          return NextResponse.json(
            { error: 'Failed to send messages' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Successfully sent to ${members.length} members`
        })
      }
    }

    // 發送個人訊息
    if (!receiver_id || receiver_id === 'all') {
      return NextResponse.json(
        { error: 'Receiver ID is required for personal messages' },
        { status: 400 }
      )
    }

    // 驗證接收者存在
    const { data: receiver } = await supabaseAdmin
      .from('members')
      .select('user_id')
      .eq('user_id', receiver_id)
      .single()

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      )
    }

    // 插入訊息
    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id: user.id,
        sender_type: message_type === 'personal' ? 'member' : 'system',
        receiver_id,
        subject,
        content,
        message_type
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to send message:', insertError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      data: message
    })

  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

