/**
 * 測試查詢 API 回傳的上傳者資訊
 */

async function testSearchAPI() {
  try {
    // 1. 先登入取得 token
    console.log('正在登入...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: 'member001', password: 'Test1234!' })
    });
    
    const loginData = await loginRes.json();

    const token = loginData.data?.session?.access_token;
    console.log('Token:', token ? '已取得' : '失敗');

    if (!token) {
      console.error('登入失敗');
      console.log('登入回應:', JSON.stringify(loginData, null, 2));
      return;
    }
    
    // 2. 使用 token 查詢債務資料
    console.log('\n正在查詢債務資料...');
    const searchRes = await fetch('http://localhost:3000/api/debts/search?firstLetter=B&last5=67890', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('查詢狀態:', searchRes.status);
    
    const searchData = await searchRes.json();
    console.log('\n查詢結果：');
    console.log('成功:', searchData.success);
    console.log('結果數量:', searchData.results?.length || 0);
    console.log('完整回應:', JSON.stringify(searchData, null, 2));
    
    if (searchData.results && searchData.results.length > 0) {
      const firstResult = searchData.results[0];
      console.log('\n第一筆結果的上傳者資訊：');
      console.log('暱稱:', firstResult.uploader?.nickname);
      console.log('業務類型:', firstResult.uploader?.business_type);
      console.log('業務區域:', firstResult.uploader?.business_region);
      console.log('勳章數量:', firstResult.uploader?.badge_count);
      console.log('\n等級資訊 (level_info):');
      console.log(JSON.stringify(firstResult.uploader?.level_info, null, 2));
      
      // 檢查 level_info 是否為 null
      if (firstResult.uploader?.level_info === null) {
        console.log('\n⚠️ 警告：level_info 是 null！');
        console.log('這表示 API 沒有找到上傳者的等級資訊。');
      } else if (firstResult.uploader?.level_info) {
        console.log('\n✅ level_info 存在：');
        console.log('  - 等級:', firstResult.uploader.level_info.current_level);
        console.log('  - 稱號:', firstResult.uploader.level_info.title);
        console.log('  - 顏色:', firstResult.uploader.level_info.title_color);
        console.log('  - 活躍度:', firstResult.uploader.level_info.activity_points);
      }
    }
  } catch (error) {
    console.error('錯誤:', error.message);
  }
}

testSearchAPI();

