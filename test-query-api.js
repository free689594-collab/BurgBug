import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  iterations: 5,
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  // 1. 登入
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    account: 'testuser1',
    password: 'Test1234'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    '登入成功': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) {
    console.error('登入失敗:', loginRes.body);
    return;
  }

  const loginData = JSON.parse(loginRes.body);
  const token = loginData.data.session.access_token;

  // 2. 查詢債務記錄（使用有資料的查詢條件）
  const firstLetter = 'A';
  const last5 = '56789';

  const startTime = new Date().getTime();
  
  const queryRes = http.get(`${BASE_URL}/api/debts/search?firstLetter=${firstLetter}&last5=${last5}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  const endTime = new Date().getTime();
  const duration = (endTime - startTime) / 1000;

  check(queryRes, {
    '查詢成功': (r) => r.status === 200,
  });

  if (queryRes.status === 200) {
    const queryData = JSON.parse(queryRes.body);
    console.log(`✅ 查詢成功 - 回應時間: ${duration.toFixed(2)} 秒 - 結果數: ${queryData.data.total_count}`);
  } else {
    console.error(`❌ 查詢失敗 (${queryRes.status}):`, queryRes.body);
  }

  sleep(0.5);
}

