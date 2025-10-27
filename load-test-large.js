import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// 自訂指標
const loginDuration = new Trend('login_duration');
const queryDuration = new Trend('query_duration');
const uploadDuration = new Trend('upload_duration');
const loginSuccessRate = new Counter('login_success_rate');
const querySuccessRate = new Counter('query_success_rate');
const uploadSuccessRate = new Counter('upload_success_rate');
const registerSuccessRate = new Counter('register_success_rate');
const totalErrors = new Counter('total_errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 30 },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000']
  }
};

const BASE_URL = 'http://localhost:3000';

// 測試帳號配置（使用 testuser1 ~ testuser10）
const TEST_USERS = Array.from({ length: 10 }, (_, i) => ({
  account: `testuser${i + 1}`,
  password: 'Test1234'
}));

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
  
  // 每個 VU 使用專屬的測試帳號
  const userIndex = (vuId - 1) % TEST_USERS.length;
  const testUser = TEST_USERS[userIndex];
  
  testExistingUserFlow(vuId, testUser);
  
  sleep(1);
}

function testExistingUserFlow(vuId, testUser) {
  console.log(`[VU${vuId}] 現有使用者登入: ${testUser.account}`);
  
  // 1. 登入
  const loginStart = Date.now();
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    account: testUser.account,
    password: testUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  const loginEnd = Date.now();
  loginDuration.add(loginEnd - loginStart);

  const loginSuccess = check(loginRes, {
    '登入: 狀態碼為 200': (r) => r.status === 200,
  });

  if (!loginSuccess) {
    console.error(`[VU${vuId}] 登入失敗: ${loginRes.status} - ${loginRes.body}`);
    totalErrors.add(1);
    return;
  }

  loginSuccessRate.add(1);
  const loginData = JSON.parse(loginRes.body);
  const token = loginData.data.session.access_token;
  console.log(`[VU${vuId}] 登入成功，Token: ${token.substring(0, 50)}...`);

  // 2. 查詢債務
  console.log(`[VU${vuId}] 查詢債務`);
  const queryStart = Date.now();
  const queryRes = http.get(`${BASE_URL}/api/debts/search?firstLetter=A&last5=56789`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });
  const queryEnd = Date.now();
  queryDuration.add(queryEnd - queryStart);

  const querySuccess = check(queryRes, {
    '查詢: 狀態碼為 200': (r) => r.status === 200,
  });

  if (!querySuccess) {
    console.error(`[VU${vuId}] 查詢失敗: ${queryRes.status} - ${queryRes.body}`);
    totalErrors.add(1);
  } else {
    querySuccessRate.add(1);
    console.log(`[VU${vuId}] 查詢成功`);
  }

  // 3. 上傳債務
  console.log(`[VU${vuId}] 上傳債務`);
  const uploadStart = Date.now();
  const uploadRes = http.post(`${BASE_URL}/api/debts/upload`, JSON.stringify(generateDebtData()), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  const uploadEnd = Date.now();
  uploadDuration.add(uploadEnd - uploadStart);

  const uploadSuccess = check(uploadRes, {
    '上傳: 狀態碼為 200 或 201': (r) => r.status === 200 || r.status === 201,
  });

  if (!uploadSuccess) {
    console.error(`[VU${vuId}] 上傳失敗: ${uploadRes.status} - ${uploadRes.body}`);
    totalErrors.add(1);
  } else {
    uploadSuccessRate.add(1);
    console.log(`[VU${vuId}] 上傳成功`);
  }
}

