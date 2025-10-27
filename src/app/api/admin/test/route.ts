import { NextRequest, NextResponse } from 'next/server'
import { successResponse } from '@/lib/api/response'
import { requireAdmin } from '@/lib/api/middleware'

/**
 * 測試管理員 API
 * GET /api/admin/test
 */
export async function GET(req: NextRequest) {
  const handler = await requireAdmin(async (req: NextRequest, admin: any) => {
    return NextResponse.json(
      successResponse({
        message: '管理員 API 測試成功',
        admin: {
          id: admin.id,
          account: admin.account,
          role: admin.role
        }
      })
    )
  })
  return handler(req)
}

