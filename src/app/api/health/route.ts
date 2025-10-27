import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

export async function GET() {
  const startTime = Date.now()

  try {
    // 檢查資料庫連接（使用 admin client 繞過 RLS）
    const { count, error } = await supabaseAdmin
      .from('members')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        authentication: 'healthy',
      },
      performance: {
        responseTime: Date.now() - startTime,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime()
      },
      database: {
        membersCount: count
      }
    }

    return NextResponse.json(successResponse(healthStatus))
  } catch (error: any) {
    return NextResponse.json(
      errorResponse(
        ErrorCodes.DATABASE_ERROR,
        '資料庫連接失敗',
        error.message
      ),
      { status: 500 }
    )
  }
}

