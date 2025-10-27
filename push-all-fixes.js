const { execSync } = require('child_process');

const gitPath = 'C:\\Program Files\\Git\\bin\\git.exe';
const projectDir = 'c:\\BOSS\\ProJect\\BurgBug';

try {
  console.log('📦 添加所有更改...');
  execSync(`"${gitPath}" add .`, { cwd: projectDir, stdio: 'inherit' });

  console.log('💾 提交更改...');
  execSync(`"${gitPath}" commit -m "Fix: 修復所有 React Hooks 依賴項警告 (20/20)"`, { cwd: projectDir, stdio: 'inherit' });

  console.log('🚀 推送到 GitHub...');
  execSync(`"${gitPath}" push origin main`, { cwd: projectDir, stdio: 'inherit' });

  console.log('\n✅ 所有更改已成功推送到 GitHub！');
  console.log('⏳ Vercel 將自動重新部署...\n');
} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

