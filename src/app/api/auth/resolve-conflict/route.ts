import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

function parseJwt(token: string): any {
  try {
    const payload = token.split('.')[1]
    const json = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json()
    const token = req.cookies.get('access_token')?.value

    if (!token) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: '未登入或 Cookie 遺失' } }, { status: 401 })
    }

    const payload = parseJwt(token)
    if (!payload) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token 無法解析' } }, { status: 400 })
    }

    const userId: string = payload.sub
    let sessionId: string = payload.session_id || token.substring(0, 36)

    if (action === 'takeover') {
      const { error } = await supabaseAdmin
        .from('active_sessions')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' })

      if (error) {
        console.error('resolve-conflict takeover error:', error)
        return NextResponse.json({ success: false, error: { code: 'DB_ERROR', message: '更新會話失敗' } }, { status: 500 })
      }

      // 成功接管：直接回覆 OK，由前端決定導向
      return NextResponse.json({ success: true, data: { action: 'takeover' } })
    }

    if (action === 'cancel') {
      const res = NextResponse.json({ success: true, data: { action: 'cancel' } })
      // 清除 HttpOnly Cookie
      res.cookies.set('access_token', '', { httpOnly: true, path: '/', maxAge: 0 })
      res.cookies.set('refresh_token', '', { httpOnly: true, path: '/', maxAge: 0 })
      return res
    }

    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: '未知的操作' } }, { status: 400 })
  } catch (err: any) {
    console.error('resolve-conflict error:', err)
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err?.message || '伺服器錯誤' } }, { status: 500 })
  }
}

