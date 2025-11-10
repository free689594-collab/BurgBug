const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://gwbmahlclpysbqeqkhez.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3Ym1haGxjbHB5c2JxZXFraGV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkyMzE5NSwiZXhwIjoyMDc1NDk5MTk1fQ.vrmfgx3gp8K9PT2pPACkXmXKjDu7id-zXQAp7bfx5Rg'
)

async function test() {
  console.log('🧪 測試 Supabase 連線...\n')
  
  // 檢查 subscription_plans 表是否存在
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
  
  if (error) {
    console.log('❌ subscription_plans 表不存在')
    console.log('請先在 Supabase Dashboard 執行 migration 檔案')
    console.log('\n請按照以下步驟操作:')
    console.log('1. 前往 https://supabase.com/dashboard')
    console.log('2. 選擇專案 GoGoMay')
    console.log('3. 點選 SQL Editor')
    console.log('4. 依序執行以下檔案:')
    console.log('   - supabase/migrations/20250207_create_subscription_system_part1.sql')
    console.log('   - supabase/migrations/20250207_create_subscription_system_part2.sql')
    console.log('   - supabase/migrations/20250207_create_subscription_system_part3.sql')
  } else {
    console.log('✅ subscription_plans 表已存在')
    console.log(`📊 找到 ${data.length} 個訂閱計畫\n`)
    
    if (data.length > 0) {
      console.table(data.map(p => ({
        計畫名稱: p.display_name,
        價格: p.price,
        天數: p.duration_days,
        總上傳: p.upload_quota_total || '-',
        總查詢: p.query_quota_total || '-',
        日上傳: p.upload_quota_daily || '-',
        日查詢: p.query_quota_daily || '-'
      })))
    }
  }
}

test().catch(console.error)

