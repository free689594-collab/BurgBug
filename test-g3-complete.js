/**
 * 階段 G.3 完整測試腳本
 * 測試等級升級通知和勳章解鎖通知的前端整合
 */

const BASE_URL = 'http://localhost:3000'

// 測試帳號
const TEST_ACCOUNT = 'member001'
const TEST_PASSWORD = 'Test1234!'

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

function logTest(testName) {
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  log(`測試：${testName}`, 'cyan')
  console.log(`${colors.cyan}========================================${colors.reset}`)
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// 延遲函數
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// 測試結果統計
const testResults = {
  total: 0,
  passed: 0,
  failed: 0
}

function recordTest(passed) {
  testResults.total++
  if (passed) {
    testResults.passed++
  } else {
    testResults.failed++
  }
}

// 測試 1：登入並檢查 activity 資訊
async function testLogin() {
  logTest('測試 1：登入並檢查 activity 資訊')
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        account: TEST_ACCOUNT,
        password: TEST_PASSWORD
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      logError(`登入失敗：${data.error?.message}`)
      recordTest(false)
      return null
    }
    
    logSuccess('登入成功')
    
    // 檢查 activity 欄位
    if (data.data.activity) {
      logInfo('API 回應包含 activity 資訊')
      
      if (data.data.activity.level_up) {
        logInfo(`等級升級資訊：${JSON.stringify(data.data.activity.level_up, null, 2)}`)
      }
      
      if (data.data.activity.badge_check) {
        logInfo(`勳章檢查資訊：${JSON.stringify(data.data.activity.badge_check, null, 2)}`)
      }
    } else {
      logInfo('API 回應不包含 activity 資訊（可能今天已登入過）')
    }
    
    recordTest(true)
    return data.data.session.access_token
  } catch (error) {
    logError(`測試失敗：${error.message}`)
    recordTest(false)
    return null
  }
}

// 測試 2：上傳債務資料並檢查 activity 資訊
async function testUpload(token) {
  logTest('測試 2：上傳債務資料並檢查 activity 資訊')
  
  if (!token) {
    logError('沒有 token，跳過測試')
    recordTest(false)
    return
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/debts/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        debtor_name: '測試債務人',
        debtor_id_full: 'A123456789',
        gender: '男',
        residence: '北北基宜',
        debt_date: '2025-01-01',
        face_value: 100000,
        payment_frequency: 'monthly',
        repayment_status: '待觀察'
      })
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      logError(`上傳失敗：${data.error?.message}`)
      recordTest(false)
      return
    }
    
    logSuccess('上傳成功')
    
    // 檢查 activity 欄位
    if (data.data.activity) {
      logInfo('API 回應包含 activity 資訊')
      
      if (data.data.activity.level_up) {
        logInfo(`等級升級資訊：${JSON.stringify(data.data.activity.level_up, null, 2)}`)
        
        if (data.data.activity.level_up.leveledUp) {
          logSuccess(`🎉 升級了！LV${data.data.activity.level_up.oldLevel} → LV${data.data.activity.level_up.newLevel}`)
        }
      }
      
      if (data.data.activity.badge_check) {
        logInfo(`勳章檢查資訊：${JSON.stringify(data.data.activity.badge_check, null, 2)}`)
        
        if (data.data.activity.badge_check.newBadges?.length > 0) {
          logSuccess(`🏅 解鎖了 ${data.data.activity.badge_check.newBadges.length} 個新勳章！`)
          data.data.activity.badge_check.newBadges.forEach(badge => {
            logInfo(`  - ${badge.badge_name}：${badge.description}`)
          })
        }
      }
    } else {
      logError('API 回應不包含 activity 資訊')
      recordTest(false)
      return
    }
    
    recordTest(true)
  } catch (error) {
    logError(`測試失敗：${error.message}`)
    recordTest(false)
  }
}

// 測試 3：查詢債務資料並檢查 activity 資訊
async function testSearch(token) {
  logTest('測試 3：查詢債務資料並檢查 activity 資訊')
  
  if (!token) {
    logError('沒有 token，跳過測試')
    recordTest(false)
    return
  }
  
  try {
    const response = await fetch(`${BASE_URL}/api/debts/search?firstLetter=A&last5=56789`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      logError(`查詢失敗：${data.error?.message}`)
      recordTest(false)
      return
    }
    
    logSuccess('查詢成功')
    
    // 檢查 activity 欄位
    if (data.data.activity) {
      logInfo('API 回應包含 activity 資訊')
      
      if (data.data.activity.level_up) {
        logInfo(`等級升級資訊：${JSON.stringify(data.data.activity.level_up, null, 2)}`)
        
        if (data.data.activity.level_up.leveledUp) {
          logSuccess(`🎉 升級了！LV${data.data.activity.level_up.oldLevel} → LV${data.data.activity.level_up.newLevel}`)
        }
      }
      
      if (data.data.activity.badge_check) {
        logInfo(`勳章檢查資訊：${JSON.stringify(data.data.activity.badge_check, null, 2)}`)
        
        if (data.data.activity.badge_check.newBadges?.length > 0) {
          logSuccess(`🏅 解鎖了 ${data.data.activity.badge_check.newBadges.length} 個新勳章！`)
          data.data.activity.badge_check.newBadges.forEach(badge => {
            logInfo(`  - ${badge.badge_name}：${badge.description}`)
          })
        }
      }
    } else {
      logError('API 回應不包含 activity 資訊')
      recordTest(false)
      return
    }
    
    recordTest(true)
  } catch (error) {
    logError(`測試失敗：${error.message}`)
    recordTest(false)
  }
}

// 主測試函數
async function runTests() {
  log('\n🚀 開始執行階段 G.3 完整測試\n', 'cyan')
  
  // 測試 1：登入
  const token = await testLogin()
  await delay(1000)
  
  // 測試 2：上傳
  await testUpload(token)
  await delay(1000)
  
  // 測試 3：查詢
  await testSearch(token)
  await delay(1000)
  
  // 顯示測試結果
  console.log(`\n${colors.cyan}========================================${colors.reset}`)
  log('測試結果總結', 'cyan')
  console.log(`${colors.cyan}========================================${colors.reset}`)
  log(`總測試數：${testResults.total}`, 'blue')
  log(`通過：${testResults.passed}`, 'green')
  log(`失敗：${testResults.failed}`, 'red')
  log(`通過率：${((testResults.passed / testResults.total) * 100).toFixed(2)}%`, 'yellow')
  
  if (testResults.failed === 0) {
    log('\n✅ 所有測試通過！', 'green')
  } else {
    log('\n❌ 有測試失敗，請檢查錯誤訊息', 'red')
  }
}

// 執行測試
runTests().catch(error => {
  logError(`測試執行失敗：${error.message}`)
  process.exit(1)
})

