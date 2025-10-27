const { execSync } = require('child_process');

try {
  console.log('📝 添加所有文件...');
  execSync('"C:\\Program Files\\Git\\bin\\git.exe" add .', { 
    cwd: 'c:\\BOSS\\ProJect\\BurgBug',
    stdio: 'inherit' 
  });

  console.log('\n💾 提交更改...');
  execSync('"C:\\Program Files\\Git\\bin\\git.exe" commit -m "Fix: 新會員註冊時初始化 member_statistics 記錄，修復額度扣除問題"', { 
    cwd: 'c:\\BOSS\\ProJect\\BurgBug',
    stdio: 'inherit' 
  });

  console.log('\n🚀 推送到 GitHub...');
  execSync('"C:\\Program Files\\Git\\bin\\git.exe" push origin main', { 
    cwd: 'c:\\BOSS\\ProJect\\BurgBug',
    stdio: 'inherit' 
  });

  console.log('\n✅ 推送成功！Vercel 會自動重新部署');
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

