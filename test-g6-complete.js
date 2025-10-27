/**
 * 階段 G.6 完整測試腳本
 * 測試管理員配置介面功能
 */

const BASE_URL = 'http://localhost:3000'

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
  cyan: '\x1b[36m'
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

// 登入並取得 token
async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: 'q689594',
        password: 'q6969520'
      })
    })

    const data = await response.json()

    if (!response.ok || !data.data?.session?.access_token) {
      console.error('登入回應:', data)
      throw new Error('登入失敗')
    }

    return data.data.session.access_token
  } catch (error) {
    log(`登入失敗: ${error.message}`, 'red')
    console.error('錯誤詳情:', error)
    process.exit(1)
  }
}

// 測試 1：取得所有等級配置
async function testGetLevelConfig(token) {
  log('\n📋 測試 1：取得所有等級配置', 'yellow')

  try {
    const response = await fetch(`${BASE_URL}/api/admin/level-config`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await response.json()

    logTest(
      '取得等級配置 API',
      response.ok && data.success,
      response.ok ? `取得 ${data.data?.length || 0} 個等級配置` : data.error?.message
    )

    if (response.ok && data.data) {
      logTest(
        '等級配置包含 LV1',
        data.data.some(l => l.level === 1),
        data.data.find(l => l.level === 1)?.title || '未找到'
      )

      logTest(
        '等級配置包含 LV99',
        data.data.some(l => l.level === 99),
        data.data.find(l => l.level === 99)?.title || '未找到'
      )

      const lv1 = data.data.find(l => l.level === 1)
      if (lv1) {
        logTest(
          'LV1 配置正確',
          lv1.title && lv1.title_color && lv1.required_points === 0,
          `稱號：${lv1.title}，顏色：${lv1.title_color}，所需點數：${lv1.required_points}`
        )
      }
    }

    return data.data
  } catch (error) {
    logTest('取得等級配置 API', false, error.message)
    return null
  }
}

// 測試 2：更新等級配置
async function testUpdateLevelConfig(token) {
  log('\n📝 測試 2：更新等級配置', 'yellow')

  try {
    // 更新 LV2 的稱號
    const response = await fetch(`${BASE_URL}/api/admin/level-config`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        level: 2,
        title: '嶄露頭角（測試）',
        title_color: '#10B981',
        required_points: 100,
        upload_quota_bonus: 0,
        query_quota_bonus: 0
      })
    })

    const data = await response.json()

    logTest(
      '更新等級配置 API',
      response.ok && data.success,
      response.ok ? `更新成功：${data.data?.title}` : data.error?.message
    )

    // 恢復原始稱號
    if (response.ok) {
      await fetch(`${BASE_URL}/api/admin/level-config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: 2,
          title: '嶄露頭角',
          title_color: '#10B981',
          required_points: 100,
          upload_quota_bonus: 0,
          query_quota_bonus: 0
        })
      })
      log('   已恢復原始稱號', 'cyan')
    }
  } catch (error) {
    logTest('更新等級配置 API', false, error.message)
  }
}

// 測試 3：取得所有活躍度規則
async function testGetActivityRules(token) {
  log('\n📋 測試 3：取得所有活躍度規則', 'yellow')

  try {
    const response = await fetch(`${BASE_URL}/api/admin/activity-rules`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const data = await response.json()

    logTest(
      '取得活躍度規則 API',
      response.ok && data.success,
      response.ok ? `取得 ${data.data?.length || 0} 個規則` : data.error?.message
    )

    if (response.ok && data.data) {
      const actions = ['upload', 'query', 'daily_login', 'like_given', 'like_received']
      
      actions.forEach(action => {
        const rule = data.data.find(r => r.action === action)
        logTest(
          `規則包含 ${action}`,
          !!rule,
          rule ? `點數：+${rule.points}，上限：${rule.max_daily_count === -1 ? '無限制' : rule.max_daily_count}` : '未找到'
        )
      })
    }

    return data.data
  } catch (error) {
    logTest('取得活躍度規則 API', false, error.message)
    return null
  }
}

// 測試 4：更新活躍度規則
async function testUpdateActivityRule(token) {
  log('\n📝 測試 4：更新活躍度規則', 'yellow')

  try {
    // 更新 upload 規則的點數
    const response = await fetch(`${BASE_URL}/api/admin/activity-rules`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'upload',
        points: 3,
        max_daily_count: 10,
        cooldown_seconds: 0,
        description: '上傳債務資料（測試）'
      })
    })

    const data = await response.json()

    logTest(
      '更新活躍度規則 API',
      response.ok && data.success,
      response.ok ? `更新成功：${data.data?.action}，點數：+${data.data?.points}` : data.error?.message
    )

    // 恢復原始設定
    if (response.ok) {
      await fetch(`${BASE_URL}/api/admin/activity-rules`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'upload',
          points: 2,
          max_daily_count: 10,
          cooldown_seconds: 0,
          description: '上傳債務資料'
        })
      })
      log('   已恢復原始設定', 'cyan')
    }
  } catch (error) {
    logTest('更新活躍度規則 API', false, error.message)
  }
}

// 測試 5：權限驗證
async function testPermissions() {
  log('\n🔒 測試 5：權限驗證', 'yellow')

  try {
    // 嘗試不帶 token 訪問
    const response1 = await fetch(`${BASE_URL}/api/admin/level-config`)
    logTest(
      '無 token 訪問被拒絕',
      response1.status === 401,
      `狀態碼：${response1.status}`
    )

    // 嘗試使用會員 token 訪問
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: 'member001',
        password: 'Test1234!'
      })
    })

    const loginData = await loginResponse.json()

    if (loginResponse.ok && loginData.data?.session?.access_token) {
      const response2 = await fetch(`${BASE_URL}/api/admin/level-config`, {
        headers: { 'Authorization': `Bearer ${loginData.data.session.access_token}` }
      })

      logTest(
        '會員 token 訪問被拒絕',
        response2.status === 403,
        `狀態碼：${response2.status}`
      )
    }
  } catch (error) {
    logTest('權限驗證', false, error.message)
  }
}

// 主測試函數
async function runTests() {
  log('='.repeat(60), 'blue')
  log('階段 G.6 完整測試', 'blue')
  log('='.repeat(60), 'blue')

  log('\n🔐 登入管理員帳號...', 'yellow')
  const token = await login()
  log('✅ 登入成功', 'green')

  await testGetLevelConfig(token)
  await testUpdateLevelConfig(token)
  await testGetActivityRules(token)
  await testUpdateActivityRule(token)
  await testPermissions()

  // 顯示測試結果
  log('\n' + '='.repeat(60), 'blue')
  log('測試結果', 'blue')
  log('='.repeat(60), 'blue')
  log(`總測試數：${totalTests}`, 'cyan')
  log(`通過：${passedTests}`, 'green')
  log(`失敗：${failedTests}`, 'red')
  log(`通過率：${((passedTests / totalTests) * 100).toFixed(1)}%`, 'yellow')
  log('='.repeat(60), 'blue')

  if (failedTests === 0) {
    log('\n🎉 所有測試通過！', 'green')
  } else {
    log('\n⚠️  部分測試失敗，請檢查錯誤訊息', 'red')
  }
}

// 執行測試
runTests().catch(error => {
  log(`\n❌ 測試執行失敗: ${error.message}`, 'red')
  process.exit(1)
})

