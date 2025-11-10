/**
 * Phase 7 API 測試腳本
 * 測試所有報表與分析 API
 */

const { createClient } = require('@supabase/supabase-js')

// 載入環境變數
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 測試結果統計
let totalTests = 0
let passedTests = 0
let failedTests = 0

// 測試函數
async function test(name, fn) {
  totalTests++
  try {
    await fn()
    passedTests++
    console.log(`✅ ${name}`)
    return true
  } catch (error) {
    failedTests++
    console.error(`❌ ${name}`)
    console.error(`   錯誤: ${error.message}`)
    return false
  }
}

// 主測試函數
async function runTests() {
  console.log('\n🧪 開始測試 Phase 7 API...\n')
  console.log('=' .repeat(60))

  // =====================================================
  // 1. 測試資料庫函數
  // =====================================================
  console.log('\n📊 測試資料庫函數\n')

  await test('get_subscription_stats() 函數存在且可執行', async () => {
    const { data, error } = await supabase.rpc('get_subscription_stats')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('函數返回空資料')
  })

  await test('get_subscription_trends() 函數存在且可執行', async () => {
    const { data, error } = await supabase.rpc('get_subscription_trends', {
      p_period: 'day'
    })
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('函數應返回陣列')
  })

  await test('get_revenue_stats() 函數存在且可執行', async () => {
    const { data, error } = await supabase.rpc('get_revenue_stats')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('函數返回空資料')
  })

  await test('get_revenue_trends() 函數存在且可執行', async () => {
    const { data, error } = await supabase.rpc('get_revenue_trends', {
      p_period: 'day'
    })
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('函數應返回陣列')
  })

  await test('get_user_activity_stats() 函數存在且可執行', async () => {
    const { data, error } = await supabase.rpc('get_user_activity_stats')
    if (error) throw error
    if (!data || data.length === 0) throw new Error('函數返回空資料')
  })

  // =====================================================
  // 2. 測試資料庫函數返回值結構
  // =====================================================
  console.log('\n📋 測試函數返回值結構\n')

  await test('get_subscription_stats() 返回正確的欄位', async () => {
    const { data, error } = await supabase.rpc('get_subscription_stats')
    if (error) throw error
    
    const stats = data[0]
    const requiredFields = [
      'total_subscriptions',
      'active_subscriptions',
      'trial_subscriptions',
      'expired_subscriptions',
      'cancelled_subscriptions',
      'trial_to_vip_conversion_rate',
      'total_vip_members'
    ]
    
    for (const field of requiredFields) {
      if (!(field in stats)) {
        throw new Error(`缺少欄位: ${field}`)
      }
    }
  })

  await test('get_revenue_stats() 返回正確的欄位', async () => {
    const { data, error } = await supabase.rpc('get_revenue_stats')
    if (error) throw error
    
    const stats = data[0]
    const requiredFields = [
      'total_revenue',
      'completed_payments',
      'pending_payments',
      'failed_payments',
      'average_order_amount',
      'atm_revenue',
      'barcode_revenue',
      'cvs_revenue'
    ]
    
    for (const field of requiredFields) {
      if (!(field in stats)) {
        throw new Error(`缺少欄位: ${field}`)
      }
    }
  })

  await test('get_user_activity_stats() 返回正確的欄位', async () => {
    const { data, error } = await supabase.rpc('get_user_activity_stats')
    if (error) throw error
    
    const stats = data[0]
    const requiredFields = [
      'total_members',
      'active_members',
      'vip_members',
      'vip_percentage',
      'total_uploads',
      'total_queries',
      'average_uploads_per_user',
      'average_queries_per_user'
    ]
    
    for (const field of requiredFields) {
      if (!(field in stats)) {
        throw new Error(`缺少欄位: ${field}`)
      }
    }
  })

  // =====================================================
  // 3. 測試 API 檔案存在
  // =====================================================
  console.log('\n📁 測試 API 檔案\n')

  const fs = require('fs')
  const path = require('path')

  const apiFiles = [
    'src/app/api/admin/analytics/subscription-stats/route.ts',
    'src/app/api/admin/analytics/subscription-trends/route.ts',
    'src/app/api/admin/analytics/revenue-stats/route.ts',
    'src/app/api/admin/analytics/revenue-trends/route.ts',
    'src/app/api/admin/analytics/user-activity/route.ts'
  ]

  for (const file of apiFiles) {
    await test(`API 檔案存在: ${file}`, async () => {
      const filePath = path.join(process.cwd(), file)
      if (!fs.existsSync(filePath)) {
        throw new Error(`檔案不存在: ${filePath}`)
      }
    })
  }

  // =====================================================
  // 4. 測試前端頁面檔案
  // =====================================================
  console.log('\n🎨 測試前端頁面\n')

  await test('報表頁面檔案存在: src/app/admin/analytics/page.tsx', async () => {
    const filePath = path.join(process.cwd(), 'src/app/admin/analytics/page.tsx')
    if (!fs.existsSync(filePath)) {
      throw new Error(`檔案不存在: ${filePath}`)
    }
  })

  // =====================================================
  // 5. 測試資料庫函數的參數處理
  // =====================================================
  console.log('\n⚙️ 測試函數參數處理\n')

  await test('get_subscription_trends() 支援不同週期參數', async () => {
    const periods = ['day', 'week', 'month']
    for (const period of periods) {
      const { data, error } = await supabase.rpc('get_subscription_trends', {
        p_period: period
      })
      if (error) throw new Error(`週期 ${period} 測試失敗: ${error.message}`)
    }
  })

  await test('get_revenue_trends() 支援不同週期參數', async () => {
    const periods = ['day', 'week', 'month']
    for (const period of periods) {
      const { data, error } = await supabase.rpc('get_revenue_trends', {
        p_period: period
      })
      if (error) throw new Error(`週期 ${period} 測試失敗: ${error.message}`)
    }
  })

  await test('函數支援自訂日期範圍', async () => {
    const startDate = new Date('2025-10-01').toISOString()
    const endDate = new Date('2025-11-01').toISOString()
    
    const { data, error } = await supabase.rpc('get_subscription_stats', {
      p_start_date: startDate,
      p_end_date: endDate
    })
    if (error) throw error
  })

  // =====================================================
  // 測試總結
  // =====================================================
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 測試結果總結\n')
  console.log(`總測試數: ${totalTests}`)
  console.log(`✅ 通過: ${passedTests}`)
  console.log(`❌ 失敗: ${failedTests}`)
  console.log(`通過率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (failedTests === 0) {
    console.log('\n🎉 所有測試通過！Phase 7 功能正常運作！\n')
  } else {
    console.log('\n⚠️ 有測試失敗，請檢查上方錯誤訊息\n')
  }

  process.exit(failedTests > 0 ? 1 : 0)
}

// 執行測試
runTests().catch(error => {
  console.error('\n💥 測試執行失敗:', error)
  process.exit(1)
})

