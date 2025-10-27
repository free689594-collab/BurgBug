import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function POST(req: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    // 2. 建立 Supabase 客戶端並驗證 token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 3. 登出（撤銷 token）
    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      console.error('Sign out error:', signOutError)
      // 繼續執行，不阻塞流程
    }

    // 4. 清除 active_sessions
    const { error: sessionError } = await supabaseAdmin
      .from('active_sessions')
      .delete()
      .eq('user_id', user.id)

    if (sessionError) {
      console.error('Failed to delete active_sessions:', sessionError)
      // 不阻塞登出流程
    }

    // 5. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'LOGOUT',
        p_resource: 'auth',
        p_resource_id: user.id,
        p_meta: null
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
    }

    // 6. 回傳成功響應
    return NextResponse.json(
      successResponse(null, '登出成功')
    )

  } catch (error: any) {
    console.error('Logout error:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '登出過程發生錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

