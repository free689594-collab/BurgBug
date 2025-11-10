/**
 * Phase 1 測試腳本：訂閱系統資料庫測試
 * 
 * 此腳本會：
 * 1. 執行所有 migration 檔案
 * 2. 執行所有測試案例
 * 3. 產生測試報告
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 載入環境變數
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
}

// 記錄測試結果
function logTest(name, passed, message = '') {
  testResults.total++
  if (passed) {
    testResults.passed++
    console.log(`✅ ${name}`)
  } else {
    testResults.failed++
    console.log(`❌ ${name}`)
    if (message) console.log(`   ${message}`)
  }
  testResults.details.push({ name, passed, message })
}

// 執行 SQL 檔案
async function executeSqlFile(filePath) {
  console.log(`\n📄 執行 ${path.basename(filePath)}...`)
  
  try {
    const sql = fs.readFileSync(filePath, 'utf8')
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // 如果 exec_sql 函數不存在，直接執行 SQL
      // 注意：Supabase 的 JS 客戶端不支援直接執行任意 SQL
      // 我們需要使用 Postgres 連線或 Supabase Management API
      console.log('⚠️  無法透過 RPC 執行，請手動在 Supabase Dashboard 執行此檔案')
      return { error: null }
    })
    
    if (error) {
      console.error(`❌ 執行失敗: ${error.message}`)
      return false
    }
    
    console.log(`✅ 執行成功`)
    return true
  } catch (err) {
    console.error(`❌ 讀取檔案失敗: ${err.message}`)
    return false
  }
}

// 測試 1: 檢查資料表是否存在
async function test1_checkTables() {
  console.log('\n🧪 測試 1: 檢查資料表是否建立成功')
  
  const tables = [
    'subscription_plans',
    'payments',
    'member_subscriptions',
    'daily_usage_quotas',
    'subscription_notifications'
  ]
  
  for (const tableName of tables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    logTest(
      `資料表 ${tableName} 存在`,
      !error,
      error ? error.message : ''
    )
  }
}

// 測試 2: 檢查訂閱計畫資料
async function test2_checkPlans() {
  console.log('\n🧪 測試 2: 檢查訂閱計畫資料')
  
  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price')
  
  if (error) {
    logTest('查詢訂閱計畫', false, error.message)
    return
  }
  
  logTest('查詢訂閱計畫', true)
  logTest('免費試用計畫存在', plans.some(p => p.plan_name === 'free_trial'))
  logTest('VIP 月費計畫存在', plans.some(p => p.plan_name === 'vip_monthly'))
  
  const freePlan = plans.find(p => p.plan_name === 'free_trial')
  if (freePlan) {
    logTest('免費試用：價格為 0', freePlan.price === '0.00' || freePlan.price === 0)
    logTest('免費試用：總上傳次數為 10', freePlan.upload_quota_total === 10)
    logTest('免費試用：總查詢次數為 10', freePlan.query_quota_total === 10)
  }
  
  const vipPlan = plans.find(p => p.plan_name === 'vip_monthly')
  if (vipPlan) {
    logTest('VIP 月費：價格為 1500', vipPlan.price === '1500.00' || vipPlan.price === 1500)
    logTest('VIP 月費：每日上傳次數為 20', vipPlan.upload_quota_daily === 20)
    logTest('VIP 月費：每日查詢次數為 30', vipPlan.query_quota_daily === 30)
  }
  
  console.log('\n📊 訂閱計畫資料:')
  console.table(plans.map(p => ({
    計畫名稱: p.display_name,
    價格: p.price,
    天數: p.duration_days,
    總上傳: p.upload_quota_total || '-',
    總查詢: p.query_quota_total || '-',
    日上傳: p.upload_quota_daily || '-',
    日查詢: p.query_quota_daily || '-'
  })))
}

// 測試 3: 為現有會員建立試用訂閱
async function test3_createTrialForExisting() {
  console.log('\n🧪 測試 3: 為現有會員建立試用訂閱')
  
  // 先檢查有多少已審核的會員
  const { data: members, error: membersError } = await supabase
    .from('members')
    .select('user_id, account, status')
    .eq('status', 'approved')
  
  if (membersError) {
    logTest('查詢已審核會員', false, membersError.message)
    return
  }
  
  console.log(`📊 找到 ${members.length} 位已審核會員`)
  
  // 執行建立試用訂閱函數
  const { data: results, error } = await supabase
    .rpc('create_trial_for_existing_members')
  
  if (error) {
    logTest('執行 create_trial_for_existing_members', false, error.message)
    return
  }
  
  logTest('執行 create_trial_for_existing_members', true)
  
  if (results && results.length > 0) {
    console.log(`✅ 成功為 ${results.length} 位會員建立試用訂閱`)
    console.table(results.map(r => ({
      帳號: r.account,
      訂閱ID: r.subscription_id.substring(0, 8) + '...',
      到期日: new Date(r.end_date).toLocaleDateString('zh-TW')
    })))
  } else {
    console.log('ℹ️  所有會員都已有訂閱記錄')
  }
}

// 測試 4: 檢查會員訂閱狀態
async function test4_checkMemberSubscriptions() {
  console.log('\n🧪 測試 4: 檢查會員訂閱狀態')
  
  const { data: members, error } = await supabase
    .from('members')
    .select(`
      user_id,
      account,
      nickname,
      is_vip,
      current_subscription_id,
      member_subscriptions!current_subscription_id (
        id,
        status,
        subscription_type,
        start_date,
        end_date,
        remaining_upload_quota,
        remaining_query_quota
      )
    `)
    .eq('status', 'approved')
    .limit(10)
  
  if (error) {
    logTest('查詢會員訂閱狀態', false, error.message)
    return
  }
  
  logTest('查詢會員訂閱狀態', true)
  
  const membersWithSub = members.filter(m => m.current_subscription_id)
  logTest(
    '所有會員都有訂閱記錄',
    membersWithSub.length === members.length,
    `${membersWithSub.length}/${members.length} 位會員有訂閱`
  )
  
  console.log('\n📊 會員訂閱狀態:')
  console.table(members.slice(0, 5).map(m => {
    const sub = m.member_subscriptions
    return {
      帳號: m.account,
      暱稱: m.nickname,
      VIP: m.is_vip ? '是' : '否',
      狀態: sub?.status || '-',
      類型: sub?.subscription_type || '-',
      剩餘上傳: sub?.remaining_upload_quota ?? '-',
      剩餘查詢: sub?.remaining_query_quota ?? '-'
    }
  }))
  
  return members[0]?.user_id // 返回第一個會員的 ID 供後續測試使用
}

// 測試 5: 測試訂閱狀態檢查函數
async function test5_checkSubscriptionStatus(userId) {
  console.log('\n🧪 測試 5: 測試訂閱狀態檢查函數')
  
  if (!userId) {
    console.log('⚠️  跳過測試（沒有可用的 user_id）')
    return
  }
  
  const { data, error } = await supabase
    .rpc('check_subscription_status', { p_user_id: userId })
  
  if (error) {
    logTest('執行 check_subscription_status', false, error.message)
    return
  }
  
  logTest('執行 check_subscription_status', true)
  
  if (data && data.length > 0) {
    const status = data[0]
    console.log('\n📊 訂閱狀態詳情:')
    console.table([{
      是否有效: status.is_active ? '是' : '否',
      訂閱類型: status.subscription_type,
      狀態: status.status,
      剩餘天數: status.days_remaining,
      是否過期: status.is_expired ? '是' : '否',
      是否VIP: status.is_vip ? '是' : '否'
    }])
    
    logTest('訂閱狀態為有效', status.is_active === true)
    logTest('訂閱類型為免費試用', status.subscription_type === 'free_trial')
  }
  
  return userId
}

// 測試 6: 測試額度檢查函數
async function test6_checkUsageQuota(userId) {
  console.log('\n🧪 測試 6: 測試額度檢查函數')
  
  if (!userId) {
    console.log('⚠️  跳過測試（沒有可用的 user_id）')
    return
  }
  
  // 檢查上傳額度
  const { data: uploadQuota, error: uploadError } = await supabase
    .rpc('check_usage_quota', { 
      p_user_id: userId,
      p_action_type: 'upload'
    })
  
  if (uploadError) {
    logTest('檢查上傳額度', false, uploadError.message)
  } else {
    logTest('檢查上傳額度', true)
    if (uploadQuota && uploadQuota.length > 0) {
      const quota = uploadQuota[0]
      logTest('有上傳額度', quota.has_quota === true)
      logTest('上傳額度為 10', quota.limit_value === 10)
      logTest('額度類型為總量', quota.quota_type === 'total')
    }
  }
  
  // 檢查查詢額度
  const { data: queryQuota, error: queryError } = await supabase
    .rpc('check_usage_quota', { 
      p_user_id: userId,
      p_action_type: 'query'
    })
  
  if (queryError) {
    logTest('檢查查詢額度', false, queryError.message)
  } else {
    logTest('檢查查詢額度', true)
    if (queryQuota && queryQuota.length > 0) {
      const quota = queryQuota[0]
      logTest('有查詢額度', quota.has_quota === true)
      logTest('查詢額度為 10', quota.limit_value === 10)
    }
  }
  
  console.log('\n📊 額度詳情:')
  if (uploadQuota && uploadQuota.length > 0) {
    console.table([
      {
        類型: '上傳',
        有額度: uploadQuota[0].has_quota ? '是' : '否',
        剩餘: uploadQuota[0].remaining,
        限額: uploadQuota[0].limit_value,
        額度類型: uploadQuota[0].quota_type
      },
      {
        類型: '查詢',
        有額度: queryQuota[0].has_quota ? '是' : '否',
        剩餘: queryQuota[0].remaining,
        限額: queryQuota[0].limit_value,
        額度類型: queryQuota[0].quota_type
      }
    ])
  }
  
  return userId
}

// 測試 7: 測試額度扣除
async function test7_deductQuota(userId) {
  console.log('\n🧪 測試 7: 測試額度扣除')
  
  if (!userId) {
    console.log('⚠️  跳過測試（沒有可用的 user_id）')
    return
  }
  
  // 先檢查初始額度
  const { data: beforeQuota } = await supabase
    .rpc('check_usage_quota', { 
      p_user_id: userId,
      p_action_type: 'upload'
    })
  
  const beforeRemaining = beforeQuota?.[0]?.remaining || 0
  
  // 扣除一次上傳額度
  const { data: deductResult, error } = await supabase
    .rpc('deduct_usage_quota', {
      p_user_id: userId,
      p_action_type: 'upload'
    })
  
  if (error) {
    logTest('扣除上傳額度', false, error.message)
    return
  }
  
  logTest('扣除上傳額度', deductResult === true)
  
  // 再次檢查額度
  const { data: afterQuota } = await supabase
    .rpc('check_usage_quota', { 
      p_user_id: userId,
      p_action_type: 'upload'
    })
  
  const afterRemaining = afterQuota?.[0]?.remaining || 0
  
  logTest(
    '額度正確減少',
    afterRemaining === beforeRemaining - 1,
    `扣除前: ${beforeRemaining}, 扣除後: ${afterRemaining}`
  )
  
  console.log(`\n📊 額度變化: ${beforeRemaining} → ${afterRemaining}`)
  
  return userId
}

// 測試 8: 手動設定 VIP
async function test8_setVIP(userId) {
  console.log('\n🧪 測試 8: 手動設定測試帳號為 VIP')
  
  if (!userId) {
    console.log('⚠️  跳過測試（沒有可用的 user_id）')
    return
  }
  
  const { data, error } = await supabase
    .rpc('set_member_as_vip_test', {
      p_user_id: userId,
      p_days: 30
    })
  
  if (error) {
    logTest('設定為 VIP', false, error.message)
    return
  }
  
  logTest('設定為 VIP', data?.[0]?.success === true)
  
  if (data && data.length > 0) {
    console.log(`\n✅ ${data[0].message}`)
    console.log(`📅 到期日: ${new Date(data[0].end_date).toLocaleDateString('zh-TW')}`)
  }
  
  // 驗證 VIP 狀態
  const { data: detail } = await supabase
    .rpc('get_member_subscription_detail', { p_user_id: userId })
  
  if (detail && detail.length > 0) {
    const sub = detail[0]
    logTest('訂閱類型為 paid', sub.subscription_type === 'paid')
    logTest('是 VIP 會員', sub.is_vip === true)
    logTest('額度類型為每日', sub.quota_type === 'daily')
    logTest('每日上傳限額為 20', sub.upload_limit === 20)
    logTest('每日查詢限額為 30', sub.query_limit === 30)
    
    console.log('\n📊 VIP 訂閱詳情:')
    console.table([{
      計畫: sub.display_name,
      狀態: sub.status,
      類型: sub.subscription_type,
      VIP: sub.is_vip ? '是' : '否',
      剩餘天數: sub.days_remaining,
      上傳限額: `${sub.upload_remaining}/${sub.upload_limit}`,
      查詢限額: `${sub.query_remaining}/${sub.query_limit}`
    }])
  }
  
  return userId
}

// 測試 9: 重置額度
async function test9_resetQuota(userId) {
  console.log('\n🧪 測試 9: 測試重置額度')
  
  if (!userId) {
    console.log('⚠️  跳過測試（沒有可用的 user_id）')
    return
  }
  
  const { data, error } = await supabase
    .rpc('reset_member_quota_test', { p_user_id: userId })
  
  if (error) {
    logTest('重置額度', false, error.message)
    return
  }
  
  logTest('重置額度', data?.[0]?.success === true)
  
  if (data && data.length > 0) {
    console.log(`\n✅ ${data[0].message}`)
  }
  
  // 驗證額度已重置
  const { data: quota } = await supabase
    .rpc('check_usage_quota', { 
      p_user_id: userId,
      p_action_type: 'upload'
    })
  
  if (quota && quota.length > 0) {
    logTest(
      '額度已恢復',
      quota[0].remaining === quota[0].limit_value,
      `剩餘: ${quota[0].remaining}, 限額: ${quota[0].limit_value}`
    )
  }
}

// 測試 10: 檢查系統設定
async function test10_checkSystemConfig() {
  console.log('\n🧪 測試 10: 檢查系統設定')
  
  const { data: configs, error } = await supabase
    .from('system_config')
    .select('*')
    .in('category', ['subscription', 'payment'])
    .order('category, config_key')
  
  if (error) {
    logTest('查詢系統設定', false, error.message)
    return
  }
  
  logTest('查詢系統設定', true)
  
  const expectedKeys = [
    'subscription_trial_days',
    'subscription_monthly_price',
    'subscription_free_upload_quota',
    'subscription_free_query_quota',
    'subscription_vip_upload_daily',
    'subscription_vip_query_daily',
    'ecpay_merchant_id',
    'ecpay_test_mode'
  ]
  
  for (const key of expectedKeys) {
    const exists = configs.some(c => c.config_key === key)
    logTest(`設定 ${key} 存在`, exists)
  }
  
  console.log('\n📊 系統設定:')
  console.table(configs.map(c => ({
    分類: c.category,
    設定鍵: c.config_key,
    值: c.config_value,
    說明: c.description
  })))
}

// 主測試流程
async function runAllTests() {
  console.log('🚀 開始執行 Phase 1 測試...\n')
  console.log('=' .repeat(60))
  
  try {
    // 注意：Migration 需要手動在 Supabase Dashboard 執行
    console.log('\n⚠️  請先在 Supabase Dashboard 手動執行以下 migration 檔案:')
    console.log('   1. supabase/migrations/20250207_create_subscription_system_part1.sql')
    console.log('   2. supabase/migrations/20250207_create_subscription_system_part2.sql')
    console.log('   3. supabase/migrations/20250207_create_subscription_system_part3.sql')
    console.log('\n按 Enter 繼續測試...')
    
    // 執行測試
    await test1_checkTables()
    await test2_checkPlans()
    await test3_createTrialForExisting()
    const userId = await test4_checkMemberSubscriptions()
    await test5_checkSubscriptionStatus(userId)
    await test6_checkUsageQuota(userId)
    await test7_deductQuota(userId)
    await test8_setVIP(userId)
    await test9_resetQuota(userId)
    await test10_checkSystemConfig()
    
    // 輸出測試報告
    console.log('\n' + '='.repeat(60))
    console.log('📊 測試報告')
    console.log('='.repeat(60))
    console.log(`✅ 通過: ${testResults.passed}`)
    console.log(`❌ 失敗: ${testResults.failed}`)
    console.log(`📝 總計: ${testResults.total}`)
    console.log(`📈 通過率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`)
    
    if (testResults.failed > 0) {
      console.log('\n❌ 失敗的測試:')
      testResults.details
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`   - ${t.name}`)
          if (t.message) console.log(`     ${t.message}`)
        })
    }
    
    console.log('\n' + '='.repeat(60))
    
    if (testResults.failed === 0) {
      console.log('🎉 所有測試通過！Phase 1 完成！')
      console.log('✅ 可以進入 Phase 2: 後端 API 開發')
    } else {
      console.log('⚠️  有測試失敗，請檢查並修復問題')
    }
    
  } catch (err) {
    console.error('\n❌ 測試過程發生錯誤:', err)
  }
}

// 執行測試
runAllTests()

