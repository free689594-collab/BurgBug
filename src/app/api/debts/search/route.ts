import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'

/**
 * 債務查詢 API
 * GET /api/debts/search?firstLetter=A&last5=12345&residence=北北基宜
 * 
 * 功能：
 * 1. 驗證使用者身份和權限（必須是已審核會員）
 * 2. 解析查詢參數（debtor_id_first_letter, debtor_id_last5）
 * 3. 檢查每日查詢配額（初始 20 次/天）
 * 4. 查詢債務記錄（使用遮罩視圖）
 * 5. 記錄審計日誌
 * 6. 返回查詢結果
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

    // 驗證 token 並取得使用者資訊
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '認證令牌無效或已過期'),
        { status: 401 }
      )
    }

    // 2. 檢查會員狀態（必須是已審核會員）
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('id, user_id, status, nickname')
      .eq('user_id', user.id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '找不到會員資料'),
        { status: 403 }
      )
    }

    if (member.status !== 'approved') {
      return NextResponse.json(
        errorResponse(ErrorCodes.FORBIDDEN, '您的帳號尚未通過審核，無法查詢債務資料'),
        { status: 403 }
      )
    }

    // 3. 解析查詢參數
    const { searchParams } = new URL(req.url)
    const firstLetter = searchParams.get('firstLetter')?.toUpperCase()
    const last5 = searchParams.get('last5')
    const residence = searchParams.get('residence')

    // 4. 驗證必填參數
    if (!firstLetter || !last5) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '請提供身分證首字母（firstLetter）和後5碼（last5）'
        ),
        { status: 400 }
      )
    }

    // 5. 驗證參數格式
    // 5.1 首字母驗證（A-Z）
    if (!/^[A-Z]$/.test(firstLetter)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '身分證首字母必須為 A-Z 的英文字母'),
        { status: 400 }
      )
    }

    // 5.2 後5碼驗證（5 位數字）
    if (!/^\d{5}$/.test(last5)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '身分證後5碼必須為 5 位數字'),
        { status: 400 }
      )
    }

    // 5.3 居住地驗證（選填）
    if (residence) {
      const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
      if (!validRegions.includes(residence)) {
        return NextResponse.json(
          errorResponse(
            ErrorCodes.VALIDATION_ERROR,
            `居住地必須為：${validRegions.join('、')}`
          ),
          { status: 400 }
        )
      }
    }

    // 6. 檢查每日查詢配額（初始 20 次/天）
    const today = new Date().toISOString().split('T')[0]

    // 根據 usage_counters 計算今日成功查詢次數（失敗查詢不計）
    let usedQueries = 0
    {
      const { data: quota } = await supabaseAdmin
        .from('usage_counters')
        .select('queries')
        .eq('user_id', user.id)
        .eq('day', today)
        .maybeSingle()
      usedQueries = quota?.queries || 0
    }

    const dailyLimit = 20 // TODO: 從會員設定中讀取

    // 6.1 檢查是否已查詢過相同資料（當日）
    const searchKey = `${firstLetter}${last5}${residence || ''}`
    const { data: existingSearch } = await supabaseAdmin
      .from('activity_point_history')
      .select('id')
      .eq('user_id', user.id)
      .eq('action', 'query')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)
      .contains('metadata', { first_letter: firstLetter, last5: last5 })
      .maybeSingle()

    const isRepeatQuery = !!existingSearch

    // 如果不是重複查詢，才檢查配額
    if (!isRepeatQuery && usedQueries >= dailyLimit) {
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          `您今日的查詢次數已達上限（${dailyLimit} 次），請明天再試`
        ),
        { status: 429 }
      )
    }

    // 7. 查詢債務記錄（使用遮罩視圖）
    let query = supabaseAdmin
      .from('debt_records_masked')
      .select('*')
      .eq('debtor_id_first_letter', firstLetter)
      .eq('debtor_id_last5', last5)

    // 如果有提供居住地篩選
    if (residence) {
      query = query.eq('residence', residence)
    }

    const { data: debtRecords, error: queryError } = await query.order('created_at', { ascending: false })

    if (queryError) {
      console.error('Failed to query debt records:', queryError)
      return NextResponse.json(
        errorResponse(ErrorCodes.DATABASE_ERROR, '查詢失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 8. 查詢上傳者資訊（包含等級和勳章）
    const uploaderIds = [...new Set(debtRecords?.map(r => r.uploaded_by).filter(Boolean))]

    // 查詢上傳者基本資訊
    const { data: uploaders } = await supabaseAdmin
      .from('members')
      .select('user_id, nickname, business_type, business_region')
      .in('user_id', uploaderIds)

    // 查詢上傳者統計資訊（包含等級）
    const { data: uploaderStats } = await supabaseAdmin
      .from('member_statistics')
      .select('user_id, activity_level, activity_points')
      .in('user_id', uploaderIds)

    // 查詢等級配置
    const levelNumbers = [...new Set(uploaderStats?.map(s => s.activity_level).filter(Boolean))]
    const { data: levelConfigs } = await supabaseAdmin
      .from('level_config')
      .select('level, title, title_color')
      .in('level', levelNumbers)

    // 查詢上傳者勳章數量
    const { data: uploaderBadgeCounts } = await supabaseAdmin
      .from('member_badges')
      .select('user_id')
      .in('user_id', uploaderIds)

    // 計算每個上傳者的勳章數量
    const badgeCountMap = uploaderBadgeCounts?.reduce((acc, badge) => {
      acc[badge.user_id] = (acc[badge.user_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // 查詢當前使用者對這些債務記錄的按讚狀態
    const debtRecordIds = debtRecords?.map(r => r.id) || []
    const { data: userLikes } = await supabaseAdmin
      .from('debt_record_likes')
      .select('debt_record_id')
      .eq('liker_id', user.id)
      .in('debt_record_id', debtRecordIds)

    const userLikedSet = new Set(userLikes?.map(l => l.debt_record_id) || [])

    // 9. 合併上傳者資訊和按讚資訊
    const resultsWithUploaders = debtRecords?.map(record => {
      const uploader = uploaders?.find(u => u.user_id === record.uploaded_by)
      const stats = uploaderStats?.find(s => s.user_id === record.uploaded_by)
      const levelConfig = levelConfigs?.find(l => l.level === stats?.activity_level)

      return {
        ...record,
        likes_count: record.likes_count || 0,
        user_has_liked: userLikedSet.has(record.id),
        uploader: uploader ? {
          ...uploader,
          level_info: stats && levelConfig ? {
            current_level: stats.activity_level,
            title: levelConfig.title,
            title_color: levelConfig.title_color,
            activity_points: stats.activity_points
          } : null,
          badge_count: badgeCountMap[uploader.user_id] || 0
        } : null
      }
    })

    // 10. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'DEBT_SEARCH',
        p_resource: 'debt_records',
        p_resource_id: null,
        p_meta: {
          first_letter: firstLetter,
          last5: last5,
          residence: residence || null,
          result_count: resultsWithUploaders?.length || 0,
          searcher_nickname: member.nickname
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞主流程
    }

    // 11. 新增活躍度點數（優化：直接呼叫資料庫函數）
    let activityResult = null
    const hasResults = resultsWithUploaders && resultsWithUploaders.length > 0

    if (hasResults && !isRepeatQuery) {
      try {
        const { data: queryPointsResult, error: queryPointsError } = await supabaseAdmin.rpc('add_query_points', {
          p_user_id: user.id,
          p_metadata: {
            first_letter: firstLetter,
            last5: last5,
            residence: residence || null,
            result_count: resultsWithUploaders.length
          }
        })

        if (!queryPointsError && queryPointsResult && queryPointsResult.success) {
          activityResult = {
            points_added: queryPointsResult.points_added,
            total_points: queryPointsResult.total_points
          }
        }
      } catch (err) {
        console.error('Failed to add activity points:', err)
        // 不阻塞主流程
      }
    }

    // 12. 返回查詢結果
    return NextResponse.json(
      successResponse(
        {
          results: resultsWithUploaders || [],
          total_count: resultsWithUploaders?.length || 0,
          search_params: {
            first_letter: firstLetter,
            last5: last5,
            residence: residence || null
          },
          // 修正：重複查詢不扣點，所以剩餘次數計算要考慮是否重複
          remaining_searches: dailyLimit - usedQueries - (hasResults && !isRepeatQuery ? 1 : 0),
          is_repeat_query: isRepeatQuery,
          // 活躍度點數資訊
          activity: activityResult,
          message: resultsWithUploaders && resultsWithUploaders.length > 0
            ? isRepeatQuery
              ? `找到 ${resultsWithUploaders.length} 筆債務記錄（重複查詢，不扣點數）`
              : `找到 ${resultsWithUploaders.length} 筆債務記錄`
            : '查無債務記錄'
        },
        '查詢成功'
      ),
      { status: 200 }
    )
  } catch (error) {
    console.error('Debt search error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

