import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET /api/admin/debts/[id]
 * 管理員查詢單筆債務詳情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. 驗證管理員權限
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權：無效token' }, { status: 401 })
    }

    // 檢查是否為管理員
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: '權限不足：需要管理員權限' }, { status: 403 })
    }

    // 2. 查詢債務記錄
    const { data: record, error } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '債務記錄不存在' }, { status: 404 })
      }
      console.error('Failed to fetch debt record:', error)
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 })
    }

    // 2.1 查詢上傳者資訊
    const { data: uploader } = await supabaseAdmin
      .from('members')
      .select('id, user_id, account, nickname, business_type, business_region, status')
      .eq('user_id', record.uploaded_by)
      .single()

    // 2.2 查詢編輯者資訊（如果有）
    let editor = null
    if (record.admin_edited_by) {
      const { data: editorData } = await supabaseAdmin
        .from('members')
        .select('id, user_id, account, nickname')
        .eq('user_id', record.admin_edited_by)
        .single()
      editor = editorData
    }

    // 2.3 組合資料
    const recordWithRelations = {
      ...record,
      uploader,
      editor
    }

    // 3. 查詢相關的修改申請
    const { data: modificationRequests } = await supabaseAdmin
      .from('debt_modification_requests')
      .select('*')
      .eq('debt_record_id', id)
      .order('created_at', { ascending: false })

    // 3.1 查詢申請者和審核者資訊
    const requesterIds = [...new Set(modificationRequests?.map(r => r.user_id) || [])]
    const reviewerIds = [...new Set(modificationRequests?.filter(r => r.admin_id).map(r => r.admin_id) || [])]
    const allUserIds = [...new Set([...requesterIds, ...reviewerIds])]

    const { data: users } = await supabaseAdmin
      .from('members')
      .select('user_id, nickname, account')
      .in('user_id', allUserIds)

    const modificationRequestsWithUsers = modificationRequests?.map(req => ({
      ...req,
      requester: users?.find(u => u.user_id === req.user_id) || null,
      reviewer: req.admin_id ? users?.find(u => u.user_id === req.admin_id) || null : null
    })) || []

    // 4. 查詢按讚記錄
    const { data: likes, count: likesCount } = await supabaseAdmin
      .from('debt_record_likes')
      .select('*', { count: 'exact' })
      .eq('debt_record_id', id)
      .order('created_at', { ascending: false })

    // 4.1 查詢按讚者資訊
    const likerIds = [...new Set(likes?.map(l => l.liker_id) || [])]
    const { data: likers } = await supabaseAdmin
      .from('members')
      .select('user_id, nickname, account')
      .in('user_id', likerIds)

    const likesWithUsers = likes?.map(like => ({
      ...like,
      liker: likers?.find(u => u.user_id === like.liker_id) || null
    })) || []

    return NextResponse.json({
      success: true,
      data: {
        record: recordWithRelations,
        modification_requests: modificationRequestsWithUsers,
        likes: likesWithUsers,
        likes_count: likesCount || 0
      }
    })
  } catch (error) {
    console.error('Error in GET /api/admin/debts/[id]:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/debts/[id]
 * 管理員編輯債務記錄
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. 驗證管理員權限
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權：無效token' }, { status: 401 })
    }

    // 檢查是否為管理員
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: '權限不足：需要管理員權限' }, { status: 403 })
    }

    // 2. 解析請求資料
    const body = await request.json()
    const { edit_reason, ...updateData } = body

    if (!edit_reason) {
      return NextResponse.json({ error: '請提供編輯原因' }, { status: 400 })
    }

    // 3. 查詢原始記錄
    const { data: originalRecord } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('id', id)
      .single()

    if (!originalRecord) {
      return NextResponse.json({ error: '債務記錄不存在' }, { status: 404 })
    }

    // 4. 更新債務記錄
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('debt_records')
      .update({
        ...updateData,
        admin_edited_by: user.id,
        admin_edit_reason: edit_reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update debt record:', updateError)
      return NextResponse.json({ error: '更新失敗' }, { status: 500 })
    }

    // 5. 記錄審計日誌
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'DEBT_UPDATE',
      table_name: 'debt_records',
      record_id: id,
      old_data: originalRecord,
      new_data: updatedRecord,
      reason: edit_reason
    })

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: '債務記錄已更新'
    })
  } catch (error) {
    console.error('Error in PATCH /api/admin/debts/[id]:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/debts/[id]
 * 管理員刪除債務記錄（硬刪除）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. 驗證管理員權限
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: '未授權：缺少token' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '未授權：無效token' }, { status: 401 })
    }

    // 檢查是否為管理員
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!roleData || !['super_admin', 'admin'].includes(roleData.role)) {
      return NextResponse.json({ error: '權限不足：需要管理員權限' }, { status: 403 })
    }

    // 2. 解析刪除原因
    const body = await request.json()
    const { delete_reason } = body

    if (!delete_reason) {
      return NextResponse.json({ error: '請提供刪除原因' }, { status: 400 })
    }

    // 3. 查詢原始記錄
    const { data: originalRecord } = await supabaseAdmin
      .from('debt_records')
      .select('*')
      .eq('id', id)
      .single()

    if (!originalRecord) {
      return NextResponse.json({ error: '債務記錄不存在' }, { status: 404 })
    }

    // 4. 刪除債務記錄
    const { error: deleteError } = await supabaseAdmin
      .from('debt_records')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Failed to delete debt record:', deleteError)
      return NextResponse.json({ error: '刪除失敗' }, { status: 500 })
    }

    // 5. 記錄審計日誌
    await supabaseAdmin.from('audit_logs').insert({
      user_id: user.id,
      action: 'DEBT_DELETE',
      table_name: 'debt_records',
      record_id: id,
      old_data: originalRecord,
      reason: delete_reason
    })

    return NextResponse.json({
      success: true,
      message: '債務記錄已刪除'
    })
  } catch (error) {
    console.error('Error in DELETE /api/admin/debts/[id]:', error)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}

