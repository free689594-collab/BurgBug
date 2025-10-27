const { execSync } = require('child_process');

const gitPath = 'C:\\Program Files\\Git\\bin\\git.exe';
const projectDir = 'c:\\BOSS\\ProJect\\BurgBug';

console.log('🚀 提交修改並推送到 GitHub...\n');

try {
  // 添加修改
  console.log('📝 步驟 1：添加修改...');
  execSync(`"${gitPath}" add src/app/api/auth/register/route.ts`, { 
    cwd: projectDir, 
    stdio: 'inherit' 
  });
  console.log('✓ 修改已添加\n');

  // 提交
  console.log('📝 步驟 2：提交修改...');
  execSync(`"${gitPath}" commit -m "Fix: 禁用未配置的 reCAPTCHA 驗證，允許註冊"`, { 
    cwd: projectDir, 
    stdio: 'inherit' 
  });
  console.log('✓ 修改已提交\n');

  // 推送
  console.log('📝 步驟 3：推送到 GitHub...');
  execSync(`"${gitPath}" push origin main`, { 
    cwd: projectDir, 
    stdio: 'inherit' 
  });
  console.log('✓ 已推送到 GitHub\n');

  console.log('✅ 修改已成功推送！\n');
  console.log('🔄 Vercel 將自動重新部署...\n');
  console.log('⏳ 請等待 1-2 分鐘，然後重新訪問 https://burg-bug.vercel.app\n');

} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

