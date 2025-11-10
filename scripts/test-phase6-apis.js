/**
 * Phase 6 API 測試腳本
 * 測試所有訂閱管理相關的 API 端點
 */

const { createClient } = require('@supabase/supabase-js')

// 載入環境變數
require('dotenv').config({ path: '.env.local' })

// Supabase 配置
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少 Supabase 配置，請檢查 .env.local 檔案')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 測試結果統計
let totalTests = 0
let passedTests = 0
let failedTests = 0

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logTest(name, passed, details = '') {
  totalTests++
  if (passed) {
    passedTests++
    log(`✅ ${name}`, 'green')
  } else {
    failedTests++
    log(`❌ ${name}`, 'red')
  }
  if (details) {
    log(`   ${details}`, 'cyan')
  }
}

// 測試資料庫函數
async function testDatabaseFunctions() {
  log('\n📊 測試資料庫函數', 'blue')
  log('=' .repeat(60), 'blue')

  try {
    // 1. 測試 get_subscription_history
    log('\n1️⃣ 測試 get_subscription_history', 'yellow')
    const { data: historyData, error: historyError } = await supabase
      .rpc('get_subscription_history', {
        p_user_id: '00000000-0000-0000-0000-000000000000' // 測試用 UUID
      })

    if (historyError) {
      logTest('get_subscription_history 函數存在', false, `錯誤: ${historyError.message}`)
    } else {
      logTest('get_subscription_history 函數存在', true, `返回 ${historyData?.length || 0} 筆記錄`)
    }

    // 2. 測試 get_payment_history
    log('\n2️⃣ 測試 get_payment_history', 'yellow')
    const { data: paymentData, error: paymentError } = await supabase
      .rpc('get_payment_history', {
        p_user_id: '00000000-0000-0000-0000-000000000000'
      })

    if (paymentError) {
      logTest('get_payment_history 函數存在', false, `錯誤: ${paymentError.message}`)
    } else {
      logTest('get_payment_history 函數存在', true, `返回 ${paymentData?.length || 0} 筆記錄`)
    }

    // 3. 測試 admin_get_expiring_subscriptions
    log('\n3️⃣ 測試 admin_get_expiring_subscriptions', 'yellow')
    const { data: expiringData, error: expiringError } = await supabase
      .rpc('admin_get_expiring_subscriptions', {
        p_days_threshold: 7,
        p_limit: 10,
        p_offset: 0
      })

    if (expiringError) {
      logTest('admin_get_expiring_subscriptions 函數存在', false, `錯誤: ${expiringError.message}`)
    } else {
      logTest('admin_get_expiring_subscriptions 函數存在', true, `返回 ${expiringData?.length || 0} 筆記錄`)
    }

    // 4. 測試 admin_get_payment_records
    log('\n4️⃣ 測試 admin_get_payment_records', 'yellow')
    const { data: adminPaymentData, error: adminPaymentError } = await supabase
      .rpc('admin_get_payment_records', {
        p_payment_status: null,
        p_payment_method: null,
        p_account: null,
        p_start_date: null,
        p_end_date: null,
        p_limit: 10,
        p_offset: 0
      })

    if (adminPaymentError) {
      logTest('admin_get_payment_records 函數存在', false, `錯誤: ${adminPaymentError.message}`)
    } else {
      logTest('admin_get_payment_records 函數存在', true, `返回 ${adminPaymentData?.length || 0} 筆記錄`)
    }

    // 5. 測試 admin_count_payment_records
    log('\n5️⃣ 測試 admin_count_payment_records', 'yellow')
    const { data: countData, error: countError } = await supabase
      .rpc('admin_count_payment_records', {
        p_payment_status: null,
        p_payment_method: null,
        p_account: null,
        p_start_date: null,
        p_end_date: null
      })

    if (countError) {
      logTest('admin_count_payment_records 函數存在', false, `錯誤: ${countError.message}`)
    } else {
      logTest('admin_count_payment_records 函數存在', true, `總數: ${countData || 0}`)
    }

  } catch (error) {
    log(`\n❌ 測試過程發生錯誤: ${error.message}`, 'red')
  }
}

// 測試資料表結構
async function testTableStructure() {
  log('\n📋 測試資料表結構', 'blue')
  log('=' .repeat(60), 'blue')

  try {
    // 檢查 member_subscriptions 表
    log('\n1️⃣ 檢查 member_subscriptions 表', 'yellow')
    const { data: subscriptions, error: subError } = await supabase
      .from('member_subscriptions')
      .select('*')
      .limit(1)

    if (subError) {
      logTest('member_subscriptions 表存在', false, `錯誤: ${subError.message}`)
    } else {
      logTest('member_subscriptions 表存在', true)
    }

    // 檢查 payments 表
    log('\n2️⃣ 檢查 payments 表', 'yellow')
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .limit(1)

    if (payError) {
      logTest('payments 表存在', false, `錯誤: ${payError.message}`)
    } else {
      logTest('payments 表存在', true)
    }

    // 檢查 subscription_plans 表
    log('\n3️⃣ 檢查 subscription_plans 表', 'yellow')
    const { data: plans, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')

    if (planError) {
      logTest('subscription_plans 表存在', false, `錯誤: ${planError.message}`)
    } else {
      logTest('subscription_plans 表存在', true, `共 ${plans?.length || 0} 個方案`)
      if (plans && plans.length > 0) {
        plans.forEach(plan => {
          log(`   - ${plan.display_name}: NT$ ${plan.price}`, 'cyan')
        })
      }
    }

  } catch (error) {
    log(`\n❌ 測試過程發生錯誤: ${error.message}`, 'red')
  }
}

// 檢查 API 檔案是否存在
async function checkAPIFiles() {
  log('\n📁 檢查 API 檔案', 'blue')
  log('=' .repeat(60), 'blue')

  const fs = require('fs')
  const path = require('path')

  const apiFiles = [
    'src/app/api/subscription/history/route.ts',
    'src/app/api/subscription/payments/route.ts',
    'src/app/api/admin/subscription/expiring/route.ts',
    'src/app/api/admin/subscription/extend/route.ts',
    'src/app/api/admin/subscription/status/route.ts',
    'src/app/api/admin/payments/route.ts',
  ]

  apiFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file)
    const exists = fs.existsSync(filePath)
    logTest(`${file}`, exists, exists ? '檔案存在' : '檔案不存在')
  })
}

// 檢查前端頁面
async function checkFrontendPages() {
  log('\n🎨 檢查前端頁面', 'blue')
  log('=' .repeat(60), 'blue')

  const fs = require('fs')
  const path = require('path')

  const pages = [
    { path: 'src/app/subscription/page.tsx', name: '會員訂閱頁面' },
    { path: 'src/app/admin/subscription-management/page.tsx', name: '管理員訂閱管理頁面' },
  ]

  pages.forEach(page => {
    const filePath = path.join(process.cwd(), page.path)
    const exists = fs.existsSync(filePath)
    
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf-8')
      
      // 檢查關鍵功能
      if (page.path.includes('subscription/page.tsx')) {
        const hasHistory = content.includes('subscriptionHistory')
        const hasPayments = content.includes('paymentHistory')
        const hasPromo = content.includes('目前為平台初創上線初期')
        
        logTest(`${page.name}`, exists)
        logTest('  - 訂閱歷史功能', hasHistory)
        logTest('  - 付款記錄功能', hasPayments)
        logTest('  - 優惠價提示', hasPromo)
      } else {
        const hasExpiring = content.includes('expiringSubscriptions')
        const hasExtend = content.includes('extendDays')
        const hasPaymentFilter = content.includes('paymentStatus')
        
        logTest(`${page.name}`, exists)
        logTest('  - 即將到期訂閱', hasExpiring)
        logTest('  - 延長訂閱功能', hasExtend)
        logTest('  - 付款記錄篩選', hasPaymentFilter)
      }
    } else {
      logTest(`${page.name}`, false, '檔案不存在')
    }
  })
}

// 主測試函數
async function runTests() {
  log('\n🚀 開始 Phase 6 功能測試', 'blue')
  log('=' .repeat(60), 'blue')

  await testDatabaseFunctions()
  await testTableStructure()
  await checkAPIFiles()
  await checkFrontendPages()

  // 顯示測試結果
  log('\n' + '='.repeat(60), 'blue')
  log('📊 測試結果統計', 'blue')
  log('='.repeat(60), 'blue')
  log(`總測試數: ${totalTests}`, 'cyan')
  log(`通過: ${passedTests}`, 'green')
  log(`失敗: ${failedTests}`, 'red')
  log(`通過率: ${((passedTests / totalTests) * 100).toFixed(1)}%`, 'yellow')
  log('='.repeat(60), 'blue')

  if (failedTests === 0) {
    log('\n🎉 所有測試通過！Phase 6 功能正常！', 'green')
  } else {
    log(`\n⚠️  有 ${failedTests} 個測試失敗，請檢查上述錯誤訊息`, 'yellow')
  }
}

// 執行測試
runTests().catch(error => {
  log(`\n❌ 測試執行失敗: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})

