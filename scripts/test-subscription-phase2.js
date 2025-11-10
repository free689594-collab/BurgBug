/**
 * Phase 2 訂閱系統測試腳本
 * 測試所有 API 整合和功能
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 測試用戶 ID（使用 a689594 的 user_id）
let testUserId = null

async function runTests() {
  console.log('🚀 開始 Phase 2 測試...\n')

  let passedTests = 0
  let totalTests = 0

  // 1. 取得測試用戶
  console.log('📋 測試 1: 取得測試用戶')
  totalTests++
  try {
    const { data: member } = await supabase
      .from('members')
      .select('user_id')
      .eq('account', 'a689594')
      .single()

    if (member) {
      testUserId = member.user_id
      console.log(`✅ 測試用戶 ID: ${testUserId}`)
      passedTests++
    } else {
      console.log('❌ 找不到測試用戶')
    }
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  if (!testUserId) {
    console.log('\n❌ 無法繼續測試，找不到測試用戶')
    return
  }

  console.log('\n' + '='.repeat(60))

  // 2. 測試訂閱狀態查詢
  console.log('\n📋 測試 2: 訂閱狀態查詢 (check_subscription_status)')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('check_subscription_status', { p_user_id: testUserId })
      .single()

    if (error) throw error

    console.log('✅ 訂閱狀態:')
    console.log(`   - 訂閱類型: ${data.subscription_type}`)
    console.log(`   - 是否有效: ${data.is_active}`)
    console.log(`   - 剩餘天數: ${data.days_remaining}`)
    console.log(`   - 上傳額度: ${data.upload_used}/${data.upload_limit}`)
    console.log(`   - 查詢額度: ${data.query_used}/${data.query_limit}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 3. 測試額度檢查（上傳）
  console.log('\n📋 測試 3: 檢查上傳額度 (check_usage_quota)')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('check_usage_quota', {
        p_user_id: testUserId,
        p_action_type: 'upload'
      })
      .single()

    if (error) throw error

    console.log('✅ 上傳額度檢查:')
    console.log(`   - 有剩餘額度: ${data.has_quota}`)
    console.log(`   - 剩餘次數: ${data.remaining}`)
    console.log(`   - 額度類型: ${data.quota_type}`)
    console.log(`   - 總額度: ${data.quota_limit}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 4. 測試額度檢查（查詢）
  console.log('\n📋 測試 4: 檢查查詢額度 (check_usage_quota)')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('check_usage_quota', {
        p_user_id: testUserId,
        p_action_type: 'query'
      })
      .single()

    if (error) throw error

    console.log('✅ 查詢額度檢查:')
    console.log(`   - 有剩餘額度: ${data.has_quota}`)
    console.log(`   - 剩餘次數: ${data.remaining}`)
    console.log(`   - 額度類型: ${data.quota_type}`)
    console.log(`   - 總額度: ${data.quota_limit}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 5. 測試扣除上傳額度
  console.log('\n📋 測試 5: 扣除上傳額度 (deduct_usage_quota)')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('deduct_usage_quota', {
        p_user_id: testUserId,
        p_action_type: 'upload'
      })
      .single()

    if (error) throw error

    console.log('✅ 扣除上傳額度:')
    console.log(`   - 扣除成功: ${data.success}`)
    console.log(`   - 剩餘次數: ${data.remaining}`)
    console.log(`   - 訊息: ${data.message}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 6. 測試扣除查詢額度
  console.log('\n📋 測試 6: 扣除查詢額度 (deduct_usage_quota)')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('deduct_usage_quota', {
        p_user_id: testUserId,
        p_action_type: 'query'
      })
      .single()

    if (error) throw error

    console.log('✅ 扣除查詢額度:')
    console.log(`   - 扣除成功: ${data.success}`)
    console.log(`   - 剩餘次數: ${data.remaining}`)
    console.log(`   - 訊息: ${data.message}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 7. 測試訂閱統計
  console.log('\n📋 測試 7: 訂閱統計查詢')
  totalTests++
  try {
    // 總訂閱數
    const { count: totalSubs } = await supabase
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })

    // 活躍訂閱數
    const { count: activeSubs } = await supabase
      .from('member_subscriptions')
      .select('*', { count: 'exact', head: true })
      .in('status', ['trial', 'active'])
      .gte('end_date', new Date().toISOString())

    console.log('✅ 訂閱統計:')
    console.log(`   - 總訂閱數: ${totalSubs}`)
    console.log(`   - 活躍訂閱數: ${activeSubs}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 8. 測試訂閱配置
  console.log('\n📋 測試 8: 訂閱配置查詢')
  totalTests++
  try {
    const { data: config, error } = await supabase
      .from('subscription_config')
      .select('*')
      .single()

    if (error) throw error

    console.log('✅ 訂閱配置:')
    console.log(`   - 試用天數: ${config.trial_days}`)
    console.log(`   - 月費金額: ${config.monthly_price}`)
    console.log(`   - 免費上傳額度: ${config.free_upload_quota}`)
    console.log(`   - 免費查詢額度: ${config.free_query_quota}`)
    console.log(`   - VIP 每日上傳: ${config.vip_upload_daily}`)
    console.log(`   - VIP 每日查詢: ${config.vip_query_daily}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 9. 測試重置額度（測試用）
  console.log('\n📋 測試 9: 重置測試用戶額度')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('reset_member_quota_test', { p_user_id: testUserId })
      .single()

    if (error) throw error

    console.log('✅ 額度重置成功')
    console.log(`   - 訊息: ${data.message}`)
    passedTests++
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 10. 驗證重置後的額度
  console.log('\n📋 測試 10: 驗證重置後的額度')
  totalTests++
  try {
    const { data, error } = await supabase
      .rpc('check_subscription_status', { p_user_id: testUserId })
      .single()

    if (error) throw error

    const isReset = data.upload_used === 0 && data.query_used === 0

    if (isReset) {
      console.log('✅ 額度已正確重置:')
      console.log(`   - 上傳額度: ${data.upload_used}/${data.upload_limit}`)
      console.log(`   - 查詢額度: ${data.query_used}/${data.query_limit}`)
      passedTests++
    } else {
      console.log('❌ 額度未正確重置')
    }
  } catch (error) {
    console.log('❌ 錯誤:', error.message)
  }

  // 總結
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 測試總結')
  console.log(`✅ 通過: ${passedTests}/${totalTests}`)
  console.log(`❌ 失敗: ${totalTests - passedTests}/${totalTests}`)
  console.log(`📈 通過率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)

  if (passedTests === totalTests) {
    console.log('\n🎉 所有測試通過！Phase 2 完成！')
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查錯誤訊息')
  }
}

runTests().catch(console.error)

