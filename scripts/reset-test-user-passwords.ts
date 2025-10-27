import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入環境變數
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 測試帳號
const testUsers = ['testuser1', 'testuser2', 'testuser3']
const newPassword = 'Test1234'

async function resetPasswords() {
  console.log('🔑 開始重設測試帳號密碼...\n')

  for (const account of testUsers) {
    try {
      console.log(`📝 重設帳號: ${account}`)

      // 1. 取得使用者
      const { data: users } = await supabase.auth.admin.listUsers()
      const user = users?.users?.find(u => u.email === `${account}@auth.local`)

      if (!user) {
        console.log(`   ❌ 找不到使用者: ${account}`)
        continue
      }

      // 2. 重設密碼
      const { data, error } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (error) {
        console.log(`   ❌ 重設密碼失敗: ${error.message}`)
        continue
      }

      console.log(`   ✅ 密碼已重設為: ${newPassword}`)
      console.log(`   🎉 帳號 ${account} 密碼重設完成！\n`)

    } catch (error) {
      console.error(`   ❌ 處理帳號 ${account} 時發生錯誤:`, error)
    }
  }

  console.log('✅ 所有測試帳號密碼重設完成！')
  console.log('\n測試帳號清單:')
  testUsers.forEach(account => {
    console.log(`  - 帳號: ${account}, 密碼: ${newPassword}`)
  })
}

// 執行
resetPasswords()
  .then(() => {
    console.log('\n✅ 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ 腳本執行失敗:', error)
    process.exit(1)
  })

