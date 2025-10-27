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
 * GET /api/admin/messages/unread-count
 * 取得管理員未讀訊息數量
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

    // 3. 查詢未讀訊息數量
    const { count, error: countError } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    if (countError) {
      console.error('Count unread messages error:', countError)
      return NextResponse.json(
        errorResponse('查詢未讀訊息數量失敗', 'INTERNAL_ERROR'),
        { status: 500 }
      )
    }

    // 4. 回傳結果
    return NextResponse.json(
      successResponse({ count: count || 0 }, '查詢成功')
    )

  } catch (error: any) {
    console.error('Get unread count error:', error)
    return NextResponse.json(
      errorResponse('系統錯誤，請稍後再試', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

