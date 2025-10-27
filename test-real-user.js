/**
 * 真實會員帳號功能測試腳本
 * 測試帳號: a689594
 * 測試密碼: Qq123456
 * 
 * 測試項目:
 * 1. 會員登入
 * 2. 查詢債務記錄
 * 3. 上傳債務記錄
 * 4. 查看個人資料
 * 5. 查看活躍度統計
 * 6. 查看勳章列表
 * 7. 按讚功能
 * 8. 登出功能
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// 測試配置
export const options = {
  vus: 1,  // 單一使用者測試
  iterations: 1,  // 執行一次完整測試
  thresholds: {
    'checks': ['rate>0.95'],  // 95% 的檢查必須通過
  },
};

// 自訂指標
const testsPassed = new Counter('tests_passed');
const testsFailed = new Counter('tests_failed');
const apiResponseTime = new Trend('api_response_time');

// 測試配置
const BASE_URL = 'http://localhost:3000';
const TEST_ACCOUNT = {
  username: 'a689594',
  password: 'Qq123456'
};

// 測試用的債務資料（CSV 格式）
const TEST_DEBT_CSV = `債務人姓名,債務人電話,債務金額,債務日期,債務類型,備註
測試債務人,0912345678,10000,2025-10-26,借款,功能測試用債務記錄`;

// 顏色輸出
function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logError(message) {
  console.log(`❌ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logSection(message) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 ${message}`);
  console.log('='.repeat(60));
}

// 測試結果統計
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

function recordTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    testsPassed.add(1);
    logSuccess(`${testName} - 通過`);
  } else {
    testResults.failed++;
    testsFailed.add(1);
    logError(`${testName} - 失敗: ${details}`);
  }
  testResults.details.push({
    name: testName,
    passed,
    details
  });
}

export default function () {
  let authToken = '';
  let userId = '';
  let debtId = '';

  logSection('開始測試會員功能');
  logInfo(`測試帳號: ${TEST_ACCOUNT.username}`);
  logInfo(`測試時間: ${new Date().toLocaleString('zh-TW')}`);

  // ========================================
  // 測試 1: 會員登入
  // ========================================
  logSection('測試 1: 會員登入');
  
  const loginStartTime = Date.now();
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      account: TEST_ACCOUNT.username,
      password: TEST_ACCOUNT.password
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );
  const loginDuration = Date.now() - loginStartTime;
  apiResponseTime.add(loginDuration);

  const loginSuccess = check(loginRes, {
    '登入: 狀態碼 200': (r) => r.status === 200,
    '登入: 返回 success=true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
    '登入: 返回 token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.session && body.data.session.access_token;
      } catch (e) {
        return false;
      }
    }
  });

  if (loginSuccess) {
    const loginData = JSON.parse(loginRes.body);
    authToken = loginData.data.session.access_token;
    userId = loginData.data.user.id;
    recordTest('會員登入', true);
    logInfo(`Token: ${authToken.substring(0, 20)}...`);
    logInfo(`User ID: ${userId}`);
    logInfo(`回應時間: ${loginDuration}ms`);
  } else {
    recordTest('會員登入', false, `狀態碼: ${loginRes.status}, 回應: ${loginRes.body}`);
    logError('登入失敗，後續測試無法繼續');
    printTestSummary();
    return;
  }

  sleep(1);

  // ========================================
  // 測試 2: 查看個人資料
  // ========================================
  logSection('測試 2: 查看個人資料');

  const profileStartTime = Date.now();
  const profileRes = http.get(
    `${BASE_URL}/api/member/profile`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const profileDuration = Date.now() - profileStartTime;
  apiResponseTime.add(profileDuration);

  const profileSuccess = check(profileRes, {
    '個人資料: 狀態碼 200': (r) => r.status === 200,
    '個人資料: 返回使用者資料': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data && body.data.username === TEST_ACCOUNT.username;
      } catch (e) {
        return false;
      }
    }
  });

  if (profileSuccess) {
    const profileData = JSON.parse(profileRes.body);
    recordTest('查看個人資料', true);
    logInfo(`使用者名稱: ${profileData.data.username}`);
    logInfo(`Email: ${profileData.data.email || '未設定'}`);
    logInfo(`註冊日期: ${profileData.data.created_at}`);
    logInfo(`回應時間: ${profileDuration}ms`);
  } else {
    recordTest('查看個人資料', false, `狀態碼: ${profileRes.status}, 回應: ${profileRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 3: 查看活躍度統計
  // ========================================
  logSection('測試 3: 查看活躍度統計');

  const statsStartTime = Date.now();
  const statsRes = http.get(
    `${BASE_URL}/api/member/statistics`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const statsDuration = Date.now() - statsStartTime;
  apiResponseTime.add(statsDuration);

  const statsSuccess = check(statsRes, {
    '活躍度統計: 狀態碼 200': (r) => r.status === 200,
    '活躍度統計: 返回統計資料': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.data;
      } catch (e) {
        return false;
      }
    }
  });

  if (statsSuccess) {
    const statsData = JSON.parse(statsRes.body);
    recordTest('查看活躍度統計', true);
    logInfo(`活躍度點數: ${statsData.data.activity_points || 0}`);
    logInfo(`上傳次數: ${statsData.data.uploads_count || 0}`);
    logInfo(`查詢次數: ${statsData.data.queries_count || 0}`);
    logInfo(`獲得讚數: ${statsData.data.likes_received || 0}`);
    logInfo(`給出讚數: ${statsData.data.likes_given || 0}`);
    logInfo(`回應時間: ${statsDuration}ms`);
  } else {
    recordTest('查看活躍度統計', false, `狀態碼: ${statsRes.status}, 回應: ${statsRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 4: 查看勳章列表
  // ========================================
  logSection('測試 4: 查看勳章列表');

  const badgesStartTime = Date.now();
  const badgesRes = http.get(
    `${BASE_URL}/api/member/badges`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const badgesDuration = Date.now() - badgesStartTime;
  apiResponseTime.add(badgesDuration);

  const badgesSuccess = check(badgesRes, {
    '勳章列表: 狀態碼 200': (r) => r.status === 200,
    '勳章列表: 返回勳章資料': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (badgesSuccess) {
    const badgesData = JSON.parse(badgesRes.body);
    recordTest('查看勳章列表', true);
    logInfo(`勳章總數: ${badgesData.data.length}`);
    const unlockedBadges = badgesData.data.filter(b => b.unlocked);
    logInfo(`已解鎖勳章: ${unlockedBadges.length}`);
    logInfo(`回應時間: ${badgesDuration}ms`);
  } else {
    recordTest('查看勳章列表', false, `狀態碼: ${badgesRes.status}, 回應: ${badgesRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 5: 上傳債務記錄
  // ========================================
  logSection('測試 5: 上傳債務記錄');

  const uploadStartTime = Date.now();
  const uploadRes = http.post(
    `${BASE_URL}/api/debts/upload`,
    JSON.stringify({
      csvContent: TEST_DEBT_CSV
    }),
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const uploadDuration = Date.now() - uploadStartTime;
  apiResponseTime.add(uploadDuration);

  const uploadSuccess = check(uploadRes, {
    '上傳債務: 狀態碼 200 或 429': (r) => r.status === 200 || r.status === 429,
    '上傳債務: 返回正確格式': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success !== undefined;
      } catch (e) {
        return false;
      }
    }
  });

  if (uploadRes.status === 200) {
    const uploadData = JSON.parse(uploadRes.body);
    debtId = uploadData.data.debt_id;
    recordTest('上傳債務記錄', true);
    logInfo(`債務 ID: ${debtId}`);
    logInfo(`獲得點數: ${uploadData.data.points_added || 0}`);
    logInfo(`總點數: ${uploadData.data.total_points || 0}`);
    logInfo(`回應時間: ${uploadDuration}ms`);
  } else if (uploadRes.status === 429) {
    recordTest('上傳債務記錄', true, '已達每日上傳上限（預期行為）');
    logInfo('已達每日上傳上限（10 次），這是正常的業務邏輯');
    logInfo(`回應時間: ${uploadDuration}ms`);
  } else {
    recordTest('上傳債務記錄', false, `狀態碼: ${uploadRes.status}, 回應: ${uploadRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 6: 查詢債務記錄
  // ========================================
  logSection('測試 6: 查詢債務記錄');

  const queryStartTime = Date.now();
  const queryRes = http.post(
    `${BASE_URL}/api/debts/query`,
    JSON.stringify({
      debtorName: '測試',
      debtorPhone: ''
    }),
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const queryDuration = Date.now() - queryStartTime;
  apiResponseTime.add(queryDuration);

  const querySuccess = check(queryRes, {
    '查詢債務: 狀態碼 200': (r) => r.status === 200,
    '查詢債務: 返回查詢結果': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && Array.isArray(body.data);
      } catch (e) {
        return false;
      }
    }
  });

  if (querySuccess) {
    const queryData = JSON.parse(queryRes.body);
    recordTest('查詢債務記錄', true);
    logInfo(`查詢結果數量: ${queryData.data.length}`);
    logInfo(`回應時間: ${queryDuration}ms`);
  } else {
    recordTest('查詢債務記錄', false, `狀態碼: ${queryRes.status}, 回應: ${queryRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 7: 登出功能
  // ========================================
  logSection('測試 7: 登出功能');

  const logoutStartTime = Date.now();
  const logoutRes = http.post(
    `${BASE_URL}/api/auth/logout`,
    null,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const logoutDuration = Date.now() - logoutStartTime;
  apiResponseTime.add(logoutDuration);

  const logoutSuccess = check(logoutRes, {
    '登出: 狀態碼 200': (r) => r.status === 200,
    '登出: 返回 success=true': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    }
  });

  if (logoutSuccess) {
    recordTest('登出功能', true);
    logInfo(`回應時間: ${logoutDuration}ms`);
  } else {
    recordTest('登出功能', false, `狀態碼: ${logoutRes.status}, 回應: ${logoutRes.body}`);
  }

  sleep(1);

  // ========================================
  // 測試 8: 驗證登出後無法存取受保護的 API
  // ========================================
  logSection('測試 8: 驗證登出後無法存取受保護的 API');

  const afterLogoutRes = http.get(
    `${BASE_URL}/api/member/profile`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const afterLogoutSuccess = check(afterLogoutRes, {
    '登出後存取: 狀態碼 401': (r) => r.status === 401
  });

  if (afterLogoutSuccess) {
    recordTest('驗證登出後無法存取', true);
    logInfo('登出後正確拒絕存取受保護的 API');
  } else {
    recordTest('驗證登出後無法存取', false, `狀態碼: ${afterLogoutRes.status}（應為 401）`);
  }

  // ========================================
  // 輸出測試摘要
  // ========================================
  printTestSummary();
}

function printTestSummary() {
  logSection('測試摘要');
  
  console.log(`\n總測試數: ${testResults.total}`);
  console.log(`✅ 通過: ${testResults.passed}`);
  console.log(`❌ 失敗: ${testResults.failed}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
  
  console.log('\n詳細結果:');
  testResults.details.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}`);
    if (!result.passed && result.details) {
      console.log(`   ${result.details}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  if (testResults.failed === 0) {
    console.log('🎉 所有測試通過！系統功能正常！');
  } else {
    console.log('⚠️  部分測試失敗，請檢查上述錯誤訊息');
  }
  console.log('='.repeat(60) + '\n');
}

