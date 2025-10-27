/**
 * 建立壓力測試用的測試帳號
 *
 * 這個腳本會建立 20 個已核准的測試帳號供壓力測試使用
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入環境變數
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境變數未設定！')
  console.error('請確認 .env.local 檔案中有以下變數：')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// 測試帳號資料 - 建立 20 個測試帳號
const businessTypes = ['當鋪', '融資公司', '代書', '資產管理公司']
const businessRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東', '全台灣']

const testUsers = Array.from({ length: 20 }, (_, i) => {
  const userNum = i + 1
  return {
    account: `testuser${userNum}`,
    password: 'Test1234',
    nickname: `測試用戶${userNum}`,
    businessType: businessTypes[i % businessTypes.length],
    businessRegion: businessRegions[i % businessRegions.length],
    phone: `09123450${String(userNum).padStart(2, '0')}`,
  }
})

async function createTestUsers() {
  console.log('🚀 開始建立壓力測試用的測試帳號...\n')

  for (const user of testUsers) {
    try {
      console.log(`📝 建立帳號: ${user.account}`)

      // 1. 檢查帳號是否已存在
      const { data: existingMember } = await supabase
        .from('members')
        .select('account, status')
        .eq('account', user.account)
        .single()

      if (existingMember) {
        console.log(`   ⚠️  帳號已存在，狀態: ${existingMember.status}`)
        
        // 如果是 pending，更新為 approved
        if (existingMember.status === 'pending') {
          const { data: memberData } = await supabase
            .from('members')
            .select('user_id')
            .eq('account', user.account)
            .single()

          if (memberData) {
            await supabase
              .from('members')
              .update({
                status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'system',
              })
              .eq('user_id', memberData.user_id)

            console.log(`   ✅ 已更新為 approved 狀態`)
          }
        } else {
          console.log(`   ✅ 帳號已是 ${existingMember.status} 狀態`)
        }
        continue
      }

      // 2. 使用 Supabase Auth Admin API 建立使用者
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: `${user.account}@auth.local`,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          account: user.account,
          created_via: 'load_test_setup'
        },
        // 強制設定密碼（不使用臨時密碼）
        app_metadata: {
          provider: 'email',
          providers: ['email']
        }
      })

      if (authError) {
        // 如果是因為使用者已存在，嘗試取得現有使用者
        if (authError.message.includes('already been registered')) {
          console.log(`   ⚠️  Auth 使用者已存在，嘗試取得現有使用者...`)

          // 查詢現有使用者
          const { data: users } = await supabase.auth.admin.listUsers()
          const existingUser = users?.users?.find(u => u.email === `${user.account}@auth.local`)

          if (!existingUser) {
            console.error(`   ❌ 無法找到現有使用者`)
            continue
          }

          console.log(`   ✅ 找到現有使用者: ${existingUser.id}`)

          // 檢查 members 表中是否有記錄
          const { data: memberData } = await supabase
            .from('members')
            .select('user_id, status')
            .eq('user_id', existingUser.id)
            .single()

          if (memberData) {
            console.log(`   ✅ 會員記錄已存在，狀態: ${memberData.status}`)

            // 如果不是 approved，更新為 approved
            if (memberData.status !== 'approved') {
              const { data: adminData } = await supabase
                .from('members')
                .select('user_id')
                .eq('account', 'q689594')
                .single()

              await supabase
                .from('members')
                .update({
                  status: 'approved',
                  approved_at: new Date().toISOString(),
                  approved_by: adminData?.user_id || null,
                })
                .eq('user_id', existingUser.id)

              console.log(`   ✅ 已更新為 approved 狀態`)
            }
            continue
          }

          // 如果 members 表中沒有記錄，建立一個
          const { data: adminData } = await supabase
            .from('members')
            .select('user_id')
            .eq('account', 'q689594')
            .single()

          const { error: memberError } = await supabase
            .from('members')
            .insert({
              user_id: existingUser.id,
              account: user.account,
              nickname: user.nickname,
              business_type: user.businessType,
              business_region: user.businessRegion,
              phone: user.phone,
              status: 'approved',
              approved_at: new Date().toISOString(),
              approved_by: adminData?.user_id || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          if (memberError) {
            console.error(`   ❌ 建立會員記錄失敗: ${memberError.message}`)
            continue
          }

          console.log(`   ✅ 會員記錄已建立（已核准）`)

          // 設定角色
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({
              user_id: existingUser.id,
              role: 'user',
            })

          if (!roleError) {
            console.log(`   ✅ 角色已設定: user`)
          }

          console.log(`   🎉 帳號 ${user.account} 設定完成！\n`)
          continue
        }

        console.error(`   ❌ 建立 Auth 使用者失敗: ${authError.message}`)
        continue
      }

      console.log(`   ✅ Auth 使用者已建立: ${authData.user.id}`)

      // 3. 在 members 表中建立會員記錄（直接設為 approved）
      // 取得管理員 user_id（如果有的話）
      const { data: adminData } = await supabase
        .from('members')
        .select('user_id')
        .eq('account', 'q689594')
        .single()

      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: authData.user.id,
          account: user.account,
          nickname: user.nickname,
          business_type: user.businessType,
          business_region: user.businessRegion,
          phone: user.phone,
          status: 'approved', // 直接核准
          approved_at: new Date().toISOString(),
          approved_by: adminData?.user_id || null, // 使用管理員 UUID 或 null
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (memberError) {
        console.error(`   ❌ 建立會員記錄失敗: ${memberError.message}`)
        // 刪除已建立的 Auth 使用者
        await supabase.auth.admin.deleteUser(authData.user.id)
        continue
      }

      console.log(`   ✅ 會員記錄已建立（已核准）`)

      // 4. 設定使用者角色
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'user',
        })

      if (roleError) {
        console.error(`   ❌ 設定角色失敗: ${roleError.message}`)
      } else {
        console.log(`   ✅ 角色已設定: user`)
      }

      console.log(`   🎉 帳號 ${user.account} 建立完成！\n`)

    } catch (error) {
      console.error(`   ❌ 建立帳號 ${user.account} 時發生錯誤:`, error)
    }
  }

  console.log('✅ 所有測試帳號建立完成！')
  console.log('\n測試帳號清單:')
  testUsers.forEach(user => {
    console.log(`  - 帳號: ${user.account}, 密碼: ${user.password}`)
  })
}

// 執行
createTestUsers()
  .then(() => {
    console.log('\n✅ 腳本執行完成')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 腳本執行失敗:', error)
    process.exit(1)
  })

