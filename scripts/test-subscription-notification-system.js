/**
 * 訂閱通知系統測試腳本
 * 測試 Phase 5 的所有功能
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// 載入環境變數
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少必要的環境變數')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 測試統計
let totalTests = 0
let passedTests = 0

function logTest(testName, passed, details = '') {
  totalTests++
  if (passed) {
    passedTests++
    console.log(`✅ ${testName}`)
    if (details) console.log(`   ${details}`)
  } else {
    console.log(`❌ ${testName}`)
    if (details) console.log(`   ${details}`)
  }
}

async function main() {
  console.log('🧪 開始測試訂閱通知系統 (Phase 5)\n')
  console.log('='.repeat(60))

  // 測試 1: 檢查通知函數是否存在
  console.log('\n📋 測試 1: 檢查通知函數')
  try {
    const { data, error } = await supabase.rpc('send_subscription_notifications')
    logTest('send_subscription_notifications 函數存在', !error)
    if (data && data.length > 0) {
      console.log(`   發送通知數: ${data[0].notifications_sent}`)
    }
  } catch (error) {
    logTest('send_subscription_notifications 函數存在', false, error.message)
  }

  try {
    const { data, error } = await supabase.rpc('send_expired_subscription_notifications')
    logTest('send_expired_subscription_notifications 函數存在', !error)
    if (data && data.length > 0) {
      console.log(`   發送通知數: ${data[0].notifications_sent}`)
    }
  } catch (error) {
    logTest('send_expired_subscription_notifications 函數存在', false, error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 測試 2: 檢查輔助函數
  console.log('\n📋 測試 2: 檢查輔助函數')
  try {
    const { data, error } = await supabase.rpc('get_notification_stats')
    logTest('get_notification_stats 函數存在', !error)
    if (data && data.length > 0) {
      const stats = data[0]
      console.log(`   總通知數: ${stats.total_notifications}`)
      console.log(`   今日發送: ${stats.sent_today}`)
      console.log(`   本週發送: ${stats.sent_this_week}`)
      console.log(`   本月發送: ${stats.sent_this_month}`)
      console.log(`   各類型統計:`, stats.by_type)
    }
  } catch (error) {
    logTest('get_notification_stats 函數存在', false, error.message)
  }

  try {
    const { data, error } = await supabase.rpc('get_cron_jobs')
    logTest('get_cron_jobs 函數存在', !error)
    if (data && data.length > 0) {
      console.log(`   找到 ${data.length} 個排程任務:`)
      data.forEach(job => {
        console.log(`   - ${job.jobname}: ${job.schedule} (${job.active ? '啟用' : '停用'})`)
      })
    }
  } catch (error) {
    logTest('get_cron_jobs 函數存在', false, error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 測試 3: 檢查 pg_cron 排程任務
  console.log('\n📋 測試 3: 檢查 pg_cron 排程任務')
  try {
    const { data, error } = await supabase
      .from('cron.job')
      .select('*')
      .like('jobname', '%subscription%')

    if (error) throw error

    logTest('查詢 pg_cron 排程任務', true)
    console.log(`   找到 ${data.length} 個訂閱相關排程:`)
    data.forEach(job => {
      console.log(`   - ${job.jobname}`)
      console.log(`     排程: ${job.schedule}`)
      console.log(`     指令: ${job.command}`)
      console.log(`     狀態: ${job.active ? '啟用' : '停用'}`)
    })
  } catch (error) {
    logTest('查詢 pg_cron 排程任務', false, error.message)
  }

  console.log('\n' + '='.repeat(60))

  // 測試 4: 建立測試訂閱（即將到期）
  console.log('\n📋 測試 4: 建立測試訂閱')
  
  // 先查詢一個測試會員
  const { data: testMember, error: memberError } = await supabase
    .from('members')
    .select('user_id, account, nickname')
    .limit(1)
    .single()

  if (memberError || !testMember) {
    logTest('查詢測試會員', false, '找不到測試會員')
  } else {
    logTest('查詢測試會員', true, `使用會員: ${testMember.account}`)

    // 建立一個 6 天後到期的測試訂閱
    const { data: testSubscription, error: subscriptionError } = await supabase
      .from('member_subscriptions')
      .insert({
        user_id: testMember.user_id,
        plan_id: (await supabase.from('subscription_plans').select('id').eq('plan_name', 'free_trial').single()).data?.id,
        status: 'trial',
        subscription_type: 'free_trial',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 天後
        remaining_upload_quota: 10,
        remaining_query_quota: 10
      })
      .select()
      .single()

    if (subscriptionError) {
      logTest('建立測試訂閱', false, subscriptionError.message)
    } else {
      logTest('建立測試訂閱', true, `訂閱 ID: ${testSubscription.id}`)

      // 測試 5: 手動觸發通知
      console.log('\n' + '='.repeat(60))
      console.log('\n📋 測試 5: 手動觸發通知')
      
      const { data: notificationResult, error: notificationError } = await supabase
        .rpc('send_subscription_notifications')

      if (notificationError) {
        logTest('手動觸發通知', false, notificationError.message)
      } else {
        logTest('手動觸發通知', true)
        if (notificationResult && notificationResult.length > 0) {
          const result = notificationResult[0]
          console.log(`   發送通知數: ${result.notifications_sent}`)
          if (result.notifications_sent > 0) {
            console.log(`   通知詳情:`)
            result.notifications_details.forEach((detail, index) => {
              console.log(`   ${index + 1}. 帳號: ${detail.account}`)
              console.log(`      類型: ${detail.notification_type}`)
              console.log(`      剩餘天數: ${detail.days_remaining}`)
              console.log(`      訊息 ID: ${detail.message_id}`)
            })
          }
        }
      }

      // 測試 6: 檢查通知記錄
      console.log('\n' + '='.repeat(60))
      console.log('\n📋 測試 6: 檢查通知記錄')
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('subscription_notifications')
        .select('*')
        .eq('user_id', testMember.user_id)
        .order('created_at', { ascending: false })

      if (notificationsError) {
        logTest('查詢通知記錄', false, notificationsError.message)
      } else {
        logTest('查詢通知記錄', true, `找到 ${notifications.length} 筆通知記錄`)
        if (notifications.length > 0) {
          notifications.forEach((notification, index) => {
            console.log(`   ${index + 1}. 類型: ${notification.notification_type}`)
            console.log(`      發送時間: ${notification.sent_at}`)
            console.log(`      訊息 ID: ${notification.message_id}`)
          })
        }
      }

      // 測試 7: 檢查站內信
      console.log('\n' + '='.repeat(60))
      console.log('\n📋 測試 7: 檢查站內信')
      
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', testMember.user_id)
        .eq('message_type', 'system')
        .order('created_at', { ascending: false })
        .limit(5)

      if (messagesError) {
        logTest('查詢站內信', false, messagesError.message)
      } else {
        logTest('查詢站內信', true, `找到 ${messages.length} 則系統訊息`)
        if (messages.length > 0) {
          messages.forEach((message, index) => {
            console.log(`   ${index + 1}. 標題: ${message.title}`)
            console.log(`      內容: ${message.content.substring(0, 50)}...`)
            console.log(`      已讀: ${message.is_read ? '是' : '否'}`)
          })
        }
      }

      // 清理測試資料
      console.log('\n' + '='.repeat(60))
      console.log('\n🧹 清理測試資料')
      
      await supabase
        .from('member_subscriptions')
        .delete()
        .eq('id', testSubscription.id)
      
      console.log('✅ 測試訂閱已刪除')
    }
  }

  // 顯示測試結果
  console.log('\n' + '='.repeat(60))
  console.log('\n📊 測試結果總結')
  console.log(`總測試數: ${totalTests}`)
  console.log(`通過: ${passedTests}`)
  console.log(`失敗: ${totalTests - passedTests}`)
  console.log(`通過率: ${((passedTests / totalTests) * 100).toFixed(1)}%`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有測試通過！')
  } else {
    console.log('\n⚠️ 部分測試失敗，請檢查錯誤訊息')
  }
}

main().catch(console.error)

