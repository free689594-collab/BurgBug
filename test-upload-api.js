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

  // 2. 上傳債務記錄
  const uploadData = {
    debtor_name: `測試債務人${Math.floor(Math.random() * 10000)}`,
    debtor_id_full: `A${Math.floor(Math.random() * 100000000).toString().padStart(9, '0')}`,
    debtor_phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    gender: '男',
    profession: '自由業',
    residence: '北北基宜',
    debt_date: '2025-01-01',
    face_value: 100000,
    payment_frequency: 'monthly',
    repayment_status: '正常',
    note: '測試備註'
  };

  const startTime = new Date().getTime();
  
  const uploadRes = http.post(`${BASE_URL}/api/debts/upload`, JSON.stringify(uploadData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });

  const endTime = new Date().getTime();
  const duration = (endTime - startTime) / 1000;

  check(uploadRes, {
    '上傳成功': (r) => r.status === 201,
  });

  if (uploadRes.status === 201) {
    console.log(`✅ 上傳成功 - 回應時間: ${duration.toFixed(2)} 秒`);
  } else {
    console.error(`❌ 上傳失敗 (${uploadRes.status}):`, uploadRes.body);
  }

  sleep(0.5);
}

