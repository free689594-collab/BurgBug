const { execSync } = require('child_process');

const gitPath = 'C:\\Program Files\\Git\\bin\\git.exe';
const projectDir = 'c:\\BOSS\\ProJect\\BurgBug';

console.log('🚀 推送代碼到 GitHub...\n');

try {
  // 添加遠程倉庫
  console.log('📝 步驟 1：添加遠程倉庫...');
  try {
    execSync(`"${gitPath}" remote add origin https://github.com/free689594-collab/BurgBug.git`, { 
      cwd: projectDir, 
      stdio: 'inherit' 
    });
    console.log('✓ 遠程倉庫已添加\n');
  } catch (e) {
    console.log('✓ 遠程倉庫已存在\n');
  }

  // 重命名分支為 main
  console.log('📝 步驟 2：重命名分支為 main...');
  execSync(`"${gitPath}" branch -M main`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ 分支已重命名\n');

  // 推送代碼
  console.log('📝 步驟 3：推送代碼到 GitHub...');
  execSync(`"${gitPath}" push -u origin main`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ 代碼已推送\n');

  console.log('✅ 代碼已成功推送到 GitHub！\n');
  console.log('🔗 倉庫地址: https://github.com/free689594-collab/BurgBug\n');

} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

