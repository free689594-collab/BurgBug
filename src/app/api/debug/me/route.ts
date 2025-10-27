import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    // 取得 token
    const cookieToken = req.cookies.get('access_token')?.value
    const headerToken = req.headers.get('authorization')?.replace('Bearer ', '')
    const token = cookieToken || headerToken

    const result: any = {
      hasCookieToken: !!cookieToken,
      hasHeaderToken: !!headerToken,
      token: token ? `${token.substring(0, 20)}...` : null,
      user: null,
      member: null,
      role: null,
      error: null
    }

    if (!token) {
      result.error = '沒有找到 token'
      return NextResponse.json(result)
    }

    // 使用 Supabase 驗證
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError) {
      result.error = `Auth error: ${authError.message}`
      return NextResponse.json(result)
    }

    result.user = {
      id: user?.id,
      email: user?.email
    }

    if (user) {
      // 查詢 member
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('account, status')
        .eq('user_id', user.id)
        .single()

      if (memberError) {
        result.error = `Member error: ${memberError.message}`
      } else {
        result.member = member
      }

      // 查詢 role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (roleError) {
        result.error = result.error ? `${result.error}; Role error: ${roleError.message} (${roleError.code})` : `Role error: ${roleError.message} (${roleError.code})`
        result.roleErrorDetails = roleError
      } else {
        result.role = roleData?.role
      }

      // 測試：使用 admin client 直接查詢（繞過 RLS）
      const { data: roleDataAdmin, error: roleErrorAdmin } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()

      result.roleFromAdmin = roleDataAdmin?.role
      result.roleErrorAdmin = roleErrorAdmin?.message
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

