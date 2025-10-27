import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// 自訂指標
const registerSuccessRate = new Rate('register_success_rate');
const loginSuccessRate = new Rate('login_success_rate');
const querySuccessRate = new Rate('query_success_rate');
const uploadSuccessRate = new Rate('upload_success_rate');
const registerDuration = new Trend('register_duration');
const loginDuration = new Trend('login_duration');
const queryDuration = new Trend('query_duration');
const uploadDuration = new Trend('upload_duration');
const totalErrors = new Counter('total_errors');

// 測試配置 - 小規模測試（5 人）
export const options = {
  stages: [
    { duration: '30s', target: 2 },   // 暖身：2 個並發使用者
    { duration: '1m', target: 5 },    // 壓力測試：5 個並發使用者
    { duration: '30s', target: 0 },   // 冷卻：降到 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% 的請求應在 3 秒內完成
    http_req_failed: ['rate<0.3'],     // 失敗率應低於 30%
    register_success_rate: ['rate>0.5'],
    login_success_rate: ['rate>0.7'],
  },
};

const BASE_URL = 'http://localhost:3000';

// 生成隨機測試資料
function generateTestUser(vuId, iteration) {
  const timestamp = Date.now().toString().slice(-6);
  const paddedVu = String(vuId).padStart(2, '0');
  const paddedIter = String(iteration).padStart(2, '0');
  
  const account = `test${paddedVu}${paddedIter}${timestamp}`.substring(0, 15);
  
  return {
    account: account,
    password: 'Test1234',
    nickname: `測試${paddedVu}${paddedIter}`,
    businessType: ['當鋪', '融資公司', '代書', '資產管理公司'][Math.floor(Math.random() * 4)],
    businessRegion: ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'][Math.floor(Math.random() * 6)],
    phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
  };
}

// 生成債務資料（JSON 格式，不是 CSV）
function generateDebtData() {
  return {
    debtor_name: `測試債務人${Math.floor(Math.random() * 10000)}`,
    debtor_id_full: `A${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
    debtor_phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    gender: ['男', '女'][Math.floor(Math.random() * 2)],
    profession: '自由業',
    residence: ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東'][Math.floor(Math.random() * 6)],
    debt_date: '2025-01-01',
    face_value: Math.floor(Math.random() * 1000000) + 10000,
    payment_frequency: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)],
    repayment_status: ['待觀察', '正常', '結清', '議價結清', '代償', '疲勞', '呆帳'][Math.floor(Math.random() * 7)],
    note: `測試備註${Math.floor(Math.random() * 100)}`
  };
}

export default function () {
  const vuId = __VU;
  const iteration = __ITER;
  
  // 決定測試場景（5% 新使用者，95% 現有使用者）
  const isNewUser = Math.random() < 0.05;
  
  if (isNewUser) {
    testNewUserFlow(vuId, iteration);
  } else {
    testExistingUserFlow(vuId, iteration);
  }
  
  sleep(1);
}

// 場景 1：新使用者註冊流程
function testNewUserFlow(vuId, iteration) {
  const user = generateTestUser(vuId, iteration);
  
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
  } else {
    console.log(`[VU${vuId}] 註冊成功: ${user.account}`);
  }
}

// 場景 2：現有使用者操作流程
function testExistingUserFlow(vuId, iteration) {
  // 使用預先建立的測試帳號（5 個）
  const testAccounts = Array.from({ length: 5 }, (_, i) => ({
    account: `testuser${i + 1}`,
    password: 'Test1234'
  }));
  
  // 每個 VU 使用專屬帳號
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
    console.error(`[VU${vuId}] 登入失敗: ${loginRes.status} - ${loginRes.body.substring(0, 200)}`);
    totalErrors.add(1);
    return;
  }
  
  // 取得 token
  let token;
  try {
    const loginBody = JSON.parse(loginRes.body);
    token = (loginBody.data && loginBody.data.session && loginBody.data.session.access_token) ||
            (loginBody.session && loginBody.session.access_token);
    
    if (!token) {
      console.error(`[VU${vuId}] 無法取得 token`);
      totalErrors.add(1);
      return;
    }
    
    console.log(`[VU${vuId}] 登入成功，Token: ${token.substring(0, 20)}...`);
  } catch (e) {
    console.error(`[VU${vuId}] 解析登入回應失敗: ${e.message}`);
    totalErrors.add(1);
    return;
  }
  
  // 2. 查詢債務（修復：使用正確的 API 路徑）
  console.log(`[VU${vuId}] 查詢債務`);
  
  const queryParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    tags: { name: 'Query_Debts' },
  };
  
  // 修復：使用正確的查詢 API 路徑和參數
  const queryRes = http.get(
    `${BASE_URL}/api/debts/search?firstLetter=A&last5=12345`,
    queryParams
  );
  
  queryDuration.add(queryRes.timings.duration);
  
  const querySuccess = check(queryRes, {
    '查詢: 狀態碼為 200': (r) => r.status === 200,
  });
  
  querySuccessRate.add(querySuccess);
  
  if (!querySuccess) {
    console.error(`[VU${vuId}] 查詢失敗: ${queryRes.status} - ${queryRes.body.substring(0, 200)}`);
    totalErrors.add(1);
  } else {
    console.log(`[VU${vuId}] 查詢成功`);
  }
  
  // 3. 上傳債務
  console.log(`[VU${vuId}] 上傳債務`);

  const debtData = generateDebtData();

  const uploadPayload = JSON.stringify(debtData);

  const uploadParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
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
    console.error(`[VU${vuId}] 上傳失敗: ${uploadRes.status} - ${uploadRes.body.substring(0, 200)}`);
    totalErrors.add(1);
  } else {
    console.log(`[VU${vuId}] 上傳成功`);
  }
}

