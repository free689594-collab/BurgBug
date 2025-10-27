/**
 * 測試等級升級功能
 */

const BASE_URL = 'http://localhost:3000';

async function testLevelUp() {
  console.log('🧪 測試等級升級功能\n');
  
  // 1. 登入
  console.log('1. 登入...');
  const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: 'member001',
      password: 'Test1234!'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.data.session.access_token;
  console.log('✅ 登入成功\n');
  
  // 2. 上傳以觸發升級（當前點數 148，上傳 +2 = 150，達到 LV2）
  console.log('2. 上傳債務資料（觸發升級）...');
  const uploadResponse = await fetch(`${BASE_URL}/api/activity/add-points`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      action: 'upload',
      metadata: { test: 'level_up' }
    })
  });
  
  const uploadData = await uploadResponse.json();
  console.log('\n上傳結果：');
  console.log(JSON.stringify(uploadData, null, 2));
  
  if (uploadData.data.level_up && uploadData.data.level_up.leveledUp) {
    console.log('\n🎉 升級成功！');
    console.log(`從 LV${uploadData.data.level_up.oldLevel} 升到 LV${uploadData.data.level_up.newLevel}`);
    console.log(`新稱號：${uploadData.data.level_up.newTitle}`);
    console.log(`新顏色：${uploadData.data.level_up.newTitleColor}`);
    console.log(`上傳配額獎勵：+${uploadData.data.level_up.totalUploadBonus}`);
    console.log(`查詢配額獎勵：+${uploadData.data.level_up.totalQueryBonus}`);
  } else {
    console.log('\n⚠️  未升級');
  }
}

testLevelUp().catch(console.error);

