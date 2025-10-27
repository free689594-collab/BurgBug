import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 審計日誌清理 API
 * GET /api/admin/audit-cleanup - 查看清理排程狀態和歷史
 * POST /api/admin/audit-cleanup - 手動觸發清理
 * 
 * 功能：
 * 1. 驗證管理員權限
 * 2. GET：查看排程狀態、保留天數設定、最近清理記錄
 * 3. POST：手動執行清理函數
 */

/**
 * GET - 查看清理排程狀態
 */
export async function GET(req: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證令牌無效或已過期'),
        { status: 401 }
      )
    }

    // 2. 檢查管理員權限
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 3. 查詢保留天數設定
    const { data: configData } = await supabaseAdmin
      .from('system_config')
      .select('audit_retention_days')
      .eq('id', 1)
      .single()

    const retentionDays = configData?.audit_retention_days || 30

    // 4. 查詢排程狀態
    const { data: cronJob } = await supabaseAdmin.rpc('exec_sql', {
      sql: "SELECT jobid, schedule, command, active, jobname FROM cron.job WHERE jobname = 'cleanup-audit-logs'"
    })

    // 5. 查詢最近的清理記錄
    const { data: cleanupLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action', 'AUDIT_CLEANUP')
      .order('created_at', { ascending: false })
      .limit(10)

    // 6. 查詢審計日誌統計
    const { count: totalLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { count: oldLogs } = await supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    // 7. 返回結果
    return NextResponse.json(
      successResponse(
        {
          config: {
            retention_days: retentionDays,
            cutoff_date: cutoffDate.toISOString()
          },
          schedule: cronJob && cronJob.length > 0 ? {
            job_id: cronJob[0].jobid,
            schedule: cronJob[0].schedule,
            command: cronJob[0].command,
            active: cronJob[0].active,
            job_name: cronJob[0].jobname,
            description: '每天凌晨 2:00 (UTC) 執行'
          } : null,
          statistics: {
            total_logs: totalLogs || 0,
            old_logs: oldLogs || 0,
            logs_to_cleanup: oldLogs || 0
          },
          recent_cleanups: cleanupLogs || []
        },
        '查詢成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Audit cleanup status error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

/**
 * POST - 手動觸發清理
 */
export async function POST(req: NextRequest) {
  try {
    // 1. 驗證使用者身份
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證令牌'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證令牌無效或已過期'),
        { status: 401 }
      )
    }

    // 2. 檢查管理員權限
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '需要管理員權限'),
        { status: 403 }
      )
    }

    // 3. 執行清理函數
    const { error: cleanupError } = await supabaseAdmin.rpc('cleanup_old_audit_logs')

    if (cleanupError) {
      console.error('Failed to cleanup audit logs:', cleanupError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '清理失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 4. 查詢最新的清理記錄
    const { data: latestCleanup } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('action', 'AUDIT_CLEANUP')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 5. 記錄管理員手動清理操作
    await supabaseAdmin.rpc('log_audit', {
      p_action: 'MANUAL_AUDIT_CLEANUP',
      p_resource: 'audit_logs',
      p_resource_id: null,
      p_meta: {
        admin_id: user.id,
        cleanup_result: latestCleanup?.meta || {}
      }
    })

    // 6. 返回結果
    return NextResponse.json(
      successResponse(
        {
          message: '清理完成',
          cleanup_result: latestCleanup?.meta || { deleted_count: 0 }
        },
        '清理成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Manual audit cleanup error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

