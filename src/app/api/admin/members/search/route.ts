import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

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

export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('access_token')?.value

    if (!token) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證令牌'),
        { status: 401 }
      )
    }

    // 檢查管理員權限
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'super_admin')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 獲取搜尋關鍵字
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''

    if (!query || query.length < 2) {
      return NextResponse.json(successResponse([]))
    }

    // 搜尋會員（帳號、暱稱、業務類型）
    const { data: members, error } = await supabaseAdmin
      .from('members')
      .select('id, account, nickname, business_type, business_region, status')
      .or(`account.ilike.%${query}%,nickname.ilike.%${query}%,business_type.ilike.%${query}%`)
      .limit(10)

    if (error) {
      console.error('Search members error:', error)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '搜尋會員失敗'),
        { status: 500 }
      )
    }

    return NextResponse.json(successResponse(members || []))

  } catch (error) {
    console.error('Search members error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '伺服器錯誤'),
      { status: 500 }
    )
  }
}

