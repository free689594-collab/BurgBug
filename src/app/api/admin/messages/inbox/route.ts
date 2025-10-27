import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse } from '@/lib/api/response'

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
 * GET /api/admin/messages/inbox
 * 取得管理員收件箱訊息列表
 * 
 * Query Parameters:
 * - status: 篩選狀態（unread, read, all，預設 all）
 * - limit: 每頁筆數（預設 20）
 * - offset: 偏移量（預設 0）
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證管理員權限
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('未提供認證令牌', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('認證失敗', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    // 2. 檢查是否為管理員
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'super_admin')) {
      return NextResponse.json(
        errorResponse('權限不足', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // 3. 取得查詢參數
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 4. 建立查詢（不使用外鍵關聯，因為 sender_id 可能是系統）
    let query = supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 5. 套用狀態篩選
    if (status === 'unread') {
      query = query.eq('is_read', false)
    } else if (status === 'read') {
      query = query.eq('is_read', true)
    }

    const { data: messages, error: messagesError, count } = await query

    if (messagesError) {
      console.error('Messages query error:', messagesError)
      return NextResponse.json(
        errorResponse('查詢訊息失敗', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // 6. 取得所有發送者的資訊
    const senderIds = [...new Set(messages?.map(m => m.sender_id).filter(Boolean) || [])]
    let sendersMap: Record<string, any> = {}

    if (senderIds.length > 0) {
      const { data: senders } = await supabaseAdmin
        .from('members')
        .select('user_id, account, nickname')
        .in('user_id', senderIds)

      if (senders) {
        sendersMap = senders.reduce((acc, sender) => {
          acc[sender.user_id] = sender
          return acc
        }, {} as Record<string, any>)
      }
    }

    // 7. 格式化訊息資料
    const formattedMessages = (messages || []).map(msg => ({
      id: msg.id,
      subject: msg.subject,
      content: msg.content,
      message_type: msg.message_type,
      is_read: msg.is_read,
      created_at: msg.created_at,
      sender_id: msg.sender_id,
      sender: msg.sender_type === 'system' ? null : (sendersMap[msg.sender_id] || null)
    }))

    // 8. 回傳結果
    return NextResponse.json(
      successResponse({
        messages: formattedMessages,
        pagination: {
          total: count || 0,
          limit,
          offset,
          hasMore: (count || 0) > offset + limit
        }
      }, '查詢成功')
    )

  } catch (error: any) {
    console.error('Get inbox error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/messages/inbox
 * 標記訊息為已讀/未讀
 * 
 * Body:
 * - message_ids: 訊息 ID 陣列
 * - is_read: 是否已讀（true/false）
 */
export async function PATCH(req: NextRequest) {
  try {
    // 1. 驗證管理員權限
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse('未提供認證令牌', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse('認證失敗', 'UNAUTHORIZED'),
        { status: 401 }
      )
    }

    // 2. 檢查是否為管理員
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || (userRole.role !== 'admin' && userRole.role !== 'super_admin')) {
      return NextResponse.json(
        errorResponse('權限不足', 'FORBIDDEN'),
        { status: 403 }
      )
    }

    // 3. 取得請求資料
    const body = await req.json()
    const { message_ids, is_read } = body

    if (!message_ids || !Array.isArray(message_ids) || message_ids.length === 0) {
      return NextResponse.json(
        errorResponse('請提供訊息 ID', 'INVALID_INPUT'),
        { status: 400 }
      )
    }

    if (typeof is_read !== 'boolean') {
      return NextResponse.json(
        errorResponse('請提供有效的已讀狀態', 'INVALID_INPUT'),
        { status: 400 }
      )
    }

    // 4. 更新訊息狀態
    const { error: updateError } = await supabaseAdmin
      .from('messages')
      .update({ is_read, read_at: is_read ? new Date().toISOString() : null })
      .in('id', message_ids)
      .eq('receiver_id', user.id)

    if (updateError) {
      console.error('Update messages error:', updateError)
      return NextResponse.json(
        errorResponse('更新訊息狀態失敗', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // 5. 回傳結果
    return NextResponse.json(
      successResponse({ updated: message_ids.length }, '更新成功')
    )

  } catch (error: any) {
    console.error('Update messages error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

