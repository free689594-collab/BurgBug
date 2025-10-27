import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自訂指標
const registerSuccessRate = new Rate('register_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const uploadSuccessRate = new Rate('upload_success_rate');
const querySuccessRate = new Rate('query_success_rate');

const registerDuration = new Trend('register_duration');
const loginDuration = new Trend('login_duration');
const uploadDuration = new Trend('upload_duration');
const queryDuration = new Trend('query_duration');

const totalErrors = new Counter('total_errors');

// 測試配置
export const options = {
  stages: [
    { duration: '30s', target: 5 },   // 暖身：5 個並發使用者
    { duration: '1m', target: 15 },   // 壓力測試：15 個並發使用者
    { duration: '30s', target: 20 },  // 尖峰測試：20 個並發使用者
    { duration: '30s', target: 0 },   // 冷卻：降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% 的請求應在 2 秒內完成
    http_req_failed: ['rate<0.1'],     // 錯誤率應低於 10%
    register_success_rate: ['rate>0.8'], // 註冊成功率應高於 80%
    login_success_rate: ['rate>0.9'],    // 登入成功率應高於 90%
  },
};

const BASE_URL = 'http://localhost:3000';

// 生成隨機測試資料
function generateTestUser(vuId, iteration) {
  const timestamp = Date.now().toString().slice(-6); // 取最後 6 位數
  const paddedVu = String(vuId).padStart(2, '0');
  const paddedIter = String(iteration).padStart(2, '0');

  // 修復：移除底線，改用純數字和字母組合
  // 格式：test + VU編號(2位) + 迭代次數(2位) + 時間戳(6位) = 最多14字元
  const account = `test${paddedVu}${paddedIter}${timestamp}`.substring(0, 15);

  return {
    account: account,
    password: 'Test1234', // 改為與測試帳號相同的密碼
    nickname: `測試${paddedVu}${paddedIter}`,
    businessType: ['當鋪', '融資公司', '代書', '資產管理公司'][Math.floor(Math.random() * 4)],
    businessRegion: ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏', '花東'][Math.floor(Math.random() * 6)],
    phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
  };
}

// 生成債務資料 CSV
function generateDebtCSV() {
  const headers = '債務人姓名,身分證字號,電話,地址,債務金額,債務類型,備註';
  const rows = [];
  
  for (let i = 0; i < 5; i++) {
    const name = `測試債務人${Math.floor(Math.random() * 10000)}`;
    const idNumber = `A${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`;
    const phone = `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const address = `台北市測試路${Math.floor(Math.random() * 100)}號`;
    const amount = Math.floor(Math.random() * 1000000) + 10000;
    const type = ['信用貸款', '房屋貸款', '汽車貸款', '信用卡'][Math.floor(Math.random() * 4)];
    const note = `壓力測試資料_${Date.now()}`;
    
    rows.push(`${name},${idNumber},${phone},${address},${amount},${type},${note}`);
  }
  
  return headers + '\n' + rows.join('\n');
}

// 主要測試場景
export default function () {
  const vuId = __VU;
  const iteration = __ITER;
  
  // 決定測試場景（5% 新使用者，95% 現有使用者）- 降低註冊比例以避免節流限制
  const isNewUser = Math.random() < 0.05;
  
  if (isNewUser) {
    // 場景 1：新使用者註冊流程
    testNewUserFlow(vuId, iteration);
  } else {
    // 場景 2：現有使用者操作流程
    testExistingUserFlow(vuId, iteration);
  }
  
  sleep(1); // 每次迭代之間休息 1 秒
}

// 場景 1：新使用者註冊流程
function testNewUserFlow(vuId, iteration) {
  const user = generateTestUser(vuId, iteration);
  
  // 1. 測試註冊 API
  console.log(`[VU${vuId}] 測試註冊: ${user.account}`);
  
  const registerPayload = JSON.stringify({
    account: user.account,
    password: user.password,
    nickname: user.nickname,
    businessType: user.businessType,
    businessRegion: user.businessRegion,
    phone: user.phone,
  });
  
  const registerParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Register' },
  };
  
  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    registerPayload,
    registerParams
  );
  
  registerDuration.add(registerRes.timings.duration);
  
  const registerSuccess = check(registerRes, {
    '註冊: 狀態碼為 200 或 201': (r) => r.status === 200 || r.status === 201,
    '註冊: 回應包含 success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch (e) {
        return false;
      }
    },
  });
  
  registerSuccessRate.add(registerSuccess);
  
  if (!registerSuccess) {
    console.error(`[VU${vuId}] 註冊失敗: ${registerRes.status} - ${registerRes.body}`);
    totalErrors.add(1);
    return;
  }
  
  sleep(0.5);
  
  // 2. 測試登入 API（待審核會員）
  console.log(`[VU${vuId}] 測試登入: ${user.account}`);
  
  const loginPayload = JSON.stringify({
    account: user.account,
    password: user.password,
  });
  
  const loginParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  };
  
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    loginParams
  );
  
  loginDuration.add(loginRes.timings.duration);
  
  const loginSuccess = check(loginRes, {
    '登入: 狀態碼為 200': (r) => r.status === 200,
    '登入: 回應包含 token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && (body.data.session || body.data.token);
      } catch (e) {
        return false;
      }
    },
  });
  
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    console.error(`[VU${vuId}] 登入失敗: ${loginRes.status} - ${loginRes.body}`);
    totalErrors.add(1);
  }
}

// 場景 2：現有使用者操作流程
function testExistingUserFlow(vuId, iteration) {
  // 使用預先建立的測試帳號（20 個）
  // 每個虛擬使用者使用專屬的測試帳號，避免單裝置控制衝突
  const testAccounts = Array.from({ length: 20 }, (_, i) => ({
    account: `testuser${i + 1}`,
    password: 'Test1234'
  }));

  // 每個 VU 使用專屬帳號（VU1 用 testuser1，VU2 用 testuser2，以此類推）
  const user = testAccounts[(vuId - 1) % testAccounts.length];
  
  // 1. 登入
  console.log(`[VU${vuId}] 現有使用者登入: ${user.account}`);
  
  const loginPayload = JSON.stringify({
    account: user.account,
    password: user.password,
  });
  
  const loginParams = {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login_Existing' },
  };
  
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    loginPayload,
    loginParams
  );
  
  loginDuration.add(loginRes.timings.duration);
  
  const loginSuccess = check(loginRes, {
    '登入: 狀態碼為 200': (r) => r.status === 200,
  });
  
  loginSuccessRate.add(loginSuccess);
  
  if (!loginSuccess) {
    console.error(`[VU${vuId}] 登入失敗: ${loginRes.status}`);
    totalErrors.add(1);
    return;
  }
  
  // 取得 token
  let token;
  try {
    const loginBody = JSON.parse(loginRes.body);
    token = (loginBody.data && loginBody.data.session && loginBody.data.session.access_token) ||
            (loginBody.data && loginBody.data.token);
  } catch (e) {
    console.error(`[VU${vuId}] 無法解析登入回應`);
    totalErrors.add(1);
    return;
  }
  
  if (!token) {
    console.error(`[VU${vuId}] 未取得 token`);
    totalErrors.add(1);
    return;
  }
  
  sleep(0.5);
  
  // 2. 查詢債務
  console.log(`[VU${vuId}] 查詢債務`);
  
  const queryParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': loginRes.cookies.access_token ? `access_token=${loginRes.cookies.access_token[0].value}` : '',
    },
    tags: { name: 'Query_Debts' },
  };
  
  const queryRes = http.get(
    `${BASE_URL}/api/debts?page=1&limit=10`,
    queryParams
  );
  
  queryDuration.add(queryRes.timings.duration);
  
  const querySuccess = check(queryRes, {
    '查詢: 狀態碼為 200': (r) => r.status === 200,
  });
  
  querySuccessRate.add(querySuccess);
  
  if (!querySuccess) {
    console.error(`[VU${vuId}] 查詢失敗: ${queryRes.status}`);
    totalErrors.add(1);
  }
  
  sleep(0.5);
  
  // 3. 上傳債務（模擬）
  console.log(`[VU${vuId}] 上傳債務`);
  
  const csvContent = generateDebtCSV();
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  
  const uploadPayload = 
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="test_${vuId}_${iteration}.csv"\r\n` +
    `Content-Type: text/csv\r\n\r\n` +
    `${csvContent}\r\n` +
    `--${boundary}--\r\n`;
  
  const uploadParams = {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Authorization': `Bearer ${token}`,
      'Cookie': loginRes.cookies.access_token ? `access_token=${loginRes.cookies.access_token[0].value}` : '',
    },
    tags: { name: 'Upload_Debts' },
  };
  
  const uploadRes = http.post(
    `${BASE_URL}/api/debts/upload`,
    uploadPayload,
    uploadParams
  );
  
  uploadDuration.add(uploadRes.timings.duration);
  
  const uploadSuccess = check(uploadRes, {
    '上傳: 狀態碼為 200 或 201': (r) => r.status === 200 || r.status === 201,
  });
  
  uploadSuccessRate.add(uploadSuccess);
  
  if (!uploadSuccess) {
    console.error(`[VU${vuId}] 上傳失敗: ${uploadRes.status} - ${uploadRes.body}`);
    totalErrors.add(1);
  }
}

// 測試結束後的摘要
export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;
  
  let summary = '\n';
  summary += '='.repeat(80) + '\n';
  summary += '壓力測試結果摘要\n';
  summary += '='.repeat(80) + '\n\n';
  
  // 基本統計
  summary += `${indent}測試時間: ${new Date(data.state.testRunDurationMs).toISOString().substr(11, 8)}\n`;
  summary += `${indent}總請求數: ${(data.metrics.http_reqs && data.metrics.http_reqs.values && data.metrics.http_reqs.values.count) || 0}\n`;
  summary += `${indent}失敗請求: ${(data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.passes) || 0}\n`;
  summary += `${indent}成功率: ${((1 - ((data.metrics.http_req_failed && data.metrics.http_req_failed.values && data.metrics.http_req_failed.values.rate) || 0)) * 100).toFixed(2)}%\n\n`;
  
  // 回應時間統計
  summary += `${indent}回應時間統計:\n`;
  if (data.metrics.http_req_duration) {
    summary += `${indent}  平均: ${data.metrics.http_req_duration.values.avg.toFixed(2)} ms\n`;
    summary += `${indent}  最小: ${data.metrics.http_req_duration.values.min.toFixed(2)} ms\n`;
    summary += `${indent}  最大: ${data.metrics.http_req_duration.values.max.toFixed(2)} ms\n`;
    summary += `${indent}  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)} ms\n`;
    summary += `${indent}  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)} ms\n\n`;
  }
  
  // 各 API 成功率
  summary += `${indent}各 API 成功率:\n`;
  summary += `${indent}  註冊: ${(((data.metrics.register_success_rate && data.metrics.register_success_rate.values && data.metrics.register_success_rate.values.rate) || 0) * 100).toFixed(2)}%\n`;
  summary += `${indent}  登入: ${(((data.metrics.login_success_rate && data.metrics.login_success_rate.values && data.metrics.login_success_rate.values.rate) || 0) * 100).toFixed(2)}%\n`;
  summary += `${indent}  上傳: ${(((data.metrics.upload_success_rate && data.metrics.upload_success_rate.values && data.metrics.upload_success_rate.values.rate) || 0) * 100).toFixed(2)}%\n`;
  summary += `${indent}  查詢: ${(((data.metrics.query_success_rate && data.metrics.query_success_rate.values && data.metrics.query_success_rate.values.rate) || 0) * 100).toFixed(2)}%\n\n`;

  // 各 API 回應時間
  summary += `${indent}各 API 平均回應時間:\n`;
  summary += `${indent}  註冊: ${((data.metrics.register_duration && data.metrics.register_duration.values && data.metrics.register_duration.values.avg) || 0).toFixed(2)} ms\n`;
  summary += `${indent}  登入: ${((data.metrics.login_duration && data.metrics.login_duration.values && data.metrics.login_duration.values.avg) || 0).toFixed(2)} ms\n`;
  summary += `${indent}  上傳: ${((data.metrics.upload_duration && data.metrics.upload_duration.values && data.metrics.upload_duration.values.avg) || 0).toFixed(2)} ms\n`;
  summary += `${indent}  查詢: ${((data.metrics.query_duration && data.metrics.query_duration.values && data.metrics.query_duration.values.avg) || 0).toFixed(2)} ms\n\n`;
  
  summary += '='.repeat(80) + '\n';
  
  return summary;
}

