/**
 * 執行 Phase 6 所需的資料庫 migrations
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 載入環境變數
require('dotenv').config({ path: '.env.local' })

// Supabase 配置（使用 service role key 以執行 DDL）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

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

async function executeMigration(filePath, fileName) {
  try {
    log(`\n📄 執行 ${fileName}...`, 'yellow')
    
    const sql = fs.readFileSync(filePath, 'utf-8')
    
    // 使用 Supabase 的 rpc 執行 SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // 如果 exec_sql 函數不存在，嘗試直接執行
      log(`⚠️  無法使用 exec_sql，嘗試手動執行...`, 'yellow')
      log(`請在 Supabase SQL Editor 手動執行以下檔案：`, 'cyan')
      log(`${filePath}`, 'cyan')
      return false
    }
    
    log(`✅ ${fileName} 執行成功`, 'green')
    return true
  } catch (error) {
    log(`❌ ${fileName} 執行失敗: ${error.message}`, 'red')
    return false
  }
}

async function main() {
  log('\n🚀 開始執行 Phase 6 Migrations', 'blue')
  log('=' .repeat(60), 'blue')
  
  const migrations = [
    '20251108_add_subscription_id_to_payments.sql',
    '20251108_create_subscription_management_v2.sql',
  ]
  
  let successCount = 0
  let failCount = 0
  
  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), 'supabase', 'migrations', migration)
    
    if (!fs.existsSync(filePath)) {
      log(`❌ 檔案不存在: ${migration}`, 'red')
      failCount++
      continue
    }
    
    const success = await executeMigration(filePath, migration)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }
  
  log('\n' + '='.repeat(60), 'blue')
  log('📊 執行結果', 'blue')
  log('='.repeat(60), 'blue')
  log(`成功: ${successCount}`, 'green')
  log(`失敗: ${failCount}`, 'red')
  
  if (failCount > 0) {
    log('\n⚠️  請手動在 Supabase SQL Editor 執行失敗的 migrations', 'yellow')
    log('\n📝 手動執行步驟：', 'cyan')
    log('1. 前往 Supabase Dashboard', 'cyan')
    log('2. 選擇 SQL Editor', 'cyan')
    log('3. 複製並執行以下檔案的內容：', 'cyan')
    migrations.forEach(m => {
      log(`   - supabase/migrations/${m}`, 'cyan')
    })
  } else {
    log('\n🎉 所有 migrations 執行成功！', 'green')
  }
}

main().catch(error => {
  log(`\n❌ 執行失敗: ${error.message}`, 'red')
  console.error(error)
  process.exit(1)
})

