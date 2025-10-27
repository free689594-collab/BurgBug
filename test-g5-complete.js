/**
 * 階段 G.5 完整測試腳本
 * 測試會員等級顯示整合功能
 */

const BASE_URL = 'http://localhost:3000'

// 測試帳號
const TEST_ACCOUNT = {
  account: 'member001',
  password: 'Test1234!'
}

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

function logSection(title) {
  console.log('\n' + '='.repeat(60))
  log(title, 'cyan')
  console.log('='.repeat(60))
}

function logTest(name, passed, details = '') {
  const status = passed ? '✅ 通過' : '❌ 失敗'
  const statusColor = passed ? 'green' : 'red'
  log(`${status} - ${name}`, statusColor)
  if (details) {
    console.log(`   ${details}`)
  }
}

async function runTests() {
  let token = null
  let testsPassed = 0
  let testsFailed = 0

  try {
    logSection('階段 G.5：會員等級顯示整合 - 完整測試')

    // ========================================
    // 測試 1：登入並取得 token
    // ========================================
    logSection('測試 1：登入並取得 token')
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_ACCOUNT)
    })

    const loginData = await loginResponse.json()

    if (loginResponse.ok && loginData.success && loginData.data.session) {
      token = loginData.data.session.access_token
      logTest('登入成功', true, `Token: ${token.substring(0, 20)}...`)
      testsPassed++
    } else {
      logTest('登入失敗', false, JSON.stringify(loginData, null, 2))
      testsFailed++
      return
    }

    // ========================================
    // 測試 2：取得會員資訊（/api/auth/me）
    // ========================================
    logSection('測試 2：取得會員資訊（/api/auth/me）')

    const meResponse = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const meData = await meResponse.json()

    if (meResponse.ok && meData.success) {
      log('會員資訊：', 'blue')
      console.log(JSON.stringify(meData.data, null, 2))

      // 檢查是否包含 level_info
      if (meData.data.level_info) {
        logTest('包含 level_info 欄位', true)
        testsPassed++

        // 檢查 level_info 的內容
        const levelInfo = meData.data.level_info
        const hasAllFields = 
          typeof levelInfo.current_level === 'number' &&
          typeof levelInfo.title === 'string' &&
          typeof levelInfo.title_color === 'string' &&
          typeof levelInfo.activity_points === 'number'

        if (hasAllFields) {
          logTest('level_info 包含所有必要欄位', true, 
            `等級: LV${levelInfo.current_level}, 稱號: ${levelInfo.title}, 活躍度: ${levelInfo.activity_points}`)
          testsPassed++
        } else {
          logTest('level_info 缺少必要欄位', false)
          testsFailed++
        }
      } else {
        logTest('缺少 level_info 欄位', false)
        testsFailed++
      }
    } else {
      logTest('取得會員資訊失敗', false, JSON.stringify(meData, null, 2))
      testsFailed++
    }

    // ========================================
    // 測試 3：取得會員完整資料（/api/member/profile）
    // ========================================
    logSection('測試 3：取得會員完整資料（/api/member/profile）')

    const profileResponse = await fetch(`${BASE_URL}/api/member/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    const profileData = await profileResponse.json()

    if (profileResponse.ok && profileData.success) {
      log('會員完整資料：', 'blue')
      console.log(JSON.stringify(profileData.data, null, 2))

      // 檢查是否包含所有必要欄位
      const data = profileData.data
      const hasUser = data.user && data.user.account
      const hasLevel = data.level && typeof data.level.current_level === 'number'
      const hasBadges = Array.isArray(data.badges)
      const hasStats = data.stats && typeof data.stats.total_uploads === 'number'
      const hasQuotas = data.quotas && typeof data.quotas.daily_upload_limit === 'number'

      if (hasUser) {
        logTest('包含 user 欄位', true, `帳號: ${data.user.account}, 暱稱: ${data.user.nickname}`)
        testsPassed++
      } else {
        logTest('缺少 user 欄位', false)
        testsFailed++
      }

      if (hasLevel) {
        logTest('包含 level 欄位', true, 
          `等級: LV${data.level.current_level}, 稱號: ${data.level.title}, 進度: ${data.level.progress_percentage}%`)
        testsPassed++
      } else {
        logTest('缺少 level 欄位', false)
        testsFailed++
      }

      if (hasBadges) {
        logTest('包含 badges 欄位', true, `勳章數量: ${data.badges.length}`)
        testsPassed++
      } else {
        logTest('缺少 badges 欄位', false)
        testsFailed++
      }

      if (hasStats) {
        logTest('包含 stats 欄位', true, 
          `今日上傳: ${data.stats.total_uploads}, 今日查詢: ${data.stats.total_queries}, 連續登入: ${data.stats.consecutive_login_days} 天`)
        testsPassed++
      } else {
        logTest('缺少 stats 欄位', false)
        testsFailed++
      }

      if (hasQuotas) {
        logTest('包含 quotas 欄位', true, 
          `上傳配額: ${data.quotas.remaining_uploads}/${data.quotas.daily_upload_limit}, 查詢配額: ${data.quotas.remaining_queries}/${data.quotas.daily_query_limit}`)
        testsPassed++
      } else {
        logTest('缺少 quotas 欄位', false)
        testsFailed++
      }
    } else {
      logTest('取得會員完整資料失敗', false, JSON.stringify(profileData, null, 2))
      testsFailed++
    }

    // ========================================
    // 測試總結
    // ========================================
    logSection('測試總結')
    
    const totalTests = testsPassed + testsFailed
    const passRate = ((testsPassed / totalTests) * 100).toFixed(1)

    log(`總測試數：${totalTests}`, 'blue')
    log(`通過：${testsPassed}`, 'green')
    log(`失敗：${testsFailed}`, testsFailed > 0 ? 'red' : 'green')
    log(`通過率：${passRate}%`, passRate === '100.0' ? 'green' : 'yellow')

    if (testsFailed === 0) {
      log('\n🎉 所有測試通過！階段 G.5 功能正常！', 'green')
    } else {
      log('\n⚠️  部分測試失敗，請檢查上述錯誤訊息', 'yellow')
    }

  } catch (error) {
    log(`\n❌ 測試過程發生錯誤：${error.message}`, 'red')
    console.error(error)
  }
}

// 執行測試
runTests()

