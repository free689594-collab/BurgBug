/**
 * 活躍度系統自動化測試腳本
 * 
 * 使用方式：node test-activity-system.js
 */

const BASE_URL = 'http://localhost:3000';
const TEST_ACCOUNT = 'member001';
const TEST_PASSWORD = 'Test1234!';

let accessToken = '';
let userId = '';

// 測試結果統計
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, message = '') {
  if (passed) {
    testResults.passed.push(name);
    log(`✅ ${name}${message ? ': ' + message : ''}`, 'green');
  } else {
    testResults.failed.push(name);
    log(`❌ ${name}${message ? ': ' + message : ''}`, 'red');
  }
}

function logWarning(message) {
  testResults.warnings.push(message);
  log(`⚠️  ${message}`, 'yellow');
}

// 登入並取得 token
async function login() {
  log('\n📝 測試 1：登入功能', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account: TEST_ACCOUNT,
        password: TEST_PASSWORD
      })
    });

    const data = await response.json();
    
    if (data.success && data.data.session.access_token) {
      accessToken = data.data.session.access_token;
      userId = data.data.user.id;
      logTest('登入成功', true, `User ID: ${userId}`);
      return true;
    } else {
      logTest('登入失敗', false, JSON.stringify(data));
      return false;
    }
  } catch (error) {
    logTest('登入失敗', false, error.message);
    return false;
  }
}

// 測試上傳功能（模擬）
async function testUpload() {
  log('\n📝 測試 2：上傳債務資料獲得點數', 'cyan');
  
  try {
    // 直接呼叫 add-points API 模擬上傳
    const response = await fetch(`${BASE_URL}/api/activity/add-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        action: 'upload',
        metadata: { test: true }
      })
    });

    const data = await response.json();
    
    if (data.success) {
      logTest('上傳獲得點數', true, `+${data.data.points_added} 點，總點數: ${data.data.total_points}`);
      return data.data.total_points;
    } else {
      logTest('上傳獲得點數', false, data.message);
      return null;
    }
  } catch (error) {
    logTest('上傳獲得點數', false, error.message);
    return null;
  }
}

// 測試查詢功能
async function testQuery() {
  log('\n📝 測試 3：查詢債務資料獲得點數', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/api/activity/add-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        action: 'query',
        metadata: { test: true }
      })
    });

    const data = await response.json();
    
    if (data.success) {
      logTest('查詢獲得點數', true, `+${data.data.points_added} 點，總點數: ${data.data.total_points}`);
      return data.data.total_points;
    } else {
      logTest('查詢獲得點數', false, data.message);
      return null;
    }
  } catch (error) {
    logTest('查詢獲得點數', false, error.message);
    return null;
  }
}

// 測試每日上限
async function testDailyLimit() {
  log('\n📝 測試 4：每日上限檢查', 'cyan');
  
  let uploadCount = 0;
  
  // 嘗試上傳 12 次（上限是 10 次）
  for (let i = 0; i < 12; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/activity/add-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: 'upload',
          metadata: { test: true, attempt: i + 1 }
        })
      });

      const data = await response.json();
      
      if (data.success && data.data.points_added > 0) {
        uploadCount++;
      } else if (data.message && data.message.includes('每日上限')) {
        log(`  第 ${i + 1} 次上傳被限制（已達每日上限）`, 'blue');
        break;
      }
    } catch (error) {
      logWarning(`上傳測試 ${i + 1} 失敗: ${error.message}`);
    }
  }
  
  logTest('每日上限檢查', uploadCount <= 10, `成功上傳 ${uploadCount} 次`);
  return uploadCount;
}

// 測試等級升級
async function testLevelUp() {
  log('\n📝 測試 5：等級升級功能', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/api/activity/check-level-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      logTest('等級檢查', true, `當前等級: LV${data.data.newLevel} ${data.data.newTitle}`);
      
      if (data.data.leveledUp) {
        log(`  🎉 升級了！從 LV${data.data.oldLevel} 升到 LV${data.data.newLevel}`, 'green');
      }
      
      return data.data;
    } else {
      logTest('等級檢查', false, data.message);
      return null;
    }
  } catch (error) {
    logTest('等級檢查', false, error.message);
    return null;
  }
}

// 測試勳章解鎖
async function testBadges() {
  log('\n📝 測試 6：勳章解鎖功能', 'cyan');
  
  try {
    const response = await fetch(`${BASE_URL}/api/activity/check-badges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (data.success) {
      logTest('勳章檢查', true, `總勳章數: ${data.data.totalBadges}`);
      
      if (data.data.newBadges && data.data.newBadges.length > 0) {
        log(`  🏅 解鎖了 ${data.data.newBadges.length} 個新勳章：`, 'green');
        data.data.newBadges.forEach(badge => {
          log(`    - ${badge.badge_name}: ${badge.description}`, 'blue');
        });
      }
      
      return data.data;
    } else {
      logTest('勳章檢查', false, data.message);
      return null;
    }
  } catch (error) {
    logTest('勳章檢查', false, error.message);
    return null;
  }
}

// 主測試流程
async function runTests() {
  log('🚀 開始執行活躍度系統自動化測試\n', 'cyan');
  log('='.repeat(60), 'cyan');
  
  // 測試 1：登入
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n❌ 登入失敗，無法繼續測試', 'red');
    return;
  }
  
  // 等待一下讓登入點數處理完成
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 測試 2：上傳
  await testUpload();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 測試 3：查詢
  await testQuery();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 測試 4：每日上限
  // await testDailyLimit(); // 暫時跳過，因為會消耗很多次數
  
  // 測試 5：等級升級
  await testLevelUp();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 測試 6：勳章解鎖
  await testBadges();
  
  // 輸出測試結果
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 測試結果總結\n', 'cyan');
  log(`✅ 通過: ${testResults.passed.length} 項`, 'green');
  log(`❌ 失敗: ${testResults.failed.length} 項`, 'red');
  log(`⚠️  警告: ${testResults.warnings.length} 項`, 'yellow');
  
  if (testResults.failed.length > 0) {
    log('\n失敗的測試：', 'red');
    testResults.failed.forEach(test => log(`  - ${test}`, 'red'));
  }
  
  if (testResults.warnings.length > 0) {
    log('\n警告訊息：', 'yellow');
    testResults.warnings.forEach(warning => log(`  - ${warning}`, 'yellow'));
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  log('✨ 測試完成！\n', 'cyan');
}

// 執行測試
runTests().catch(error => {
  log(`\n❌ 測試執行失敗: ${error.message}`, 'red');
  console.error(error);
});

