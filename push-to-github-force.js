const { execSync } = require('child_process');

const gitPath = 'C:\\Program Files\\Git\\bin\\git.exe';
const projectDir = 'c:\\BOSS\\ProJect\\BurgBug';

console.log('🚀 推送代碼到 GitHub...\n');

try {
  // 檢查遠程倉庫
  console.log('📝 步驟 1：檢查遠程倉庫...');
  try {
    execSync(`"${gitPath}" remote get-url origin`, { cwd: projectDir, stdio: 'pipe' });
    console.log('✓ 遠程倉庫已存在\n');
  } catch (e) {
    console.log('📝 添加遠程倉庫...');
    execSync(`"${gitPath}" remote add origin https://github.com/free689594-collab/BurgBug.git`, { 
      cwd: projectDir, 
      stdio: 'inherit' 
    });
    console.log('✓ 遠程倉庫已添加\n');
  }

  // 重命名分支為 main
  console.log('📝 步驟 2：重命名分支為 main...');
  execSync(`"${gitPath}" branch -M main`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ 分支已重命名\n');

  // 拉取遠程內容
  console.log('📝 步驟 3：拉取遠程內容...');
  try {
    execSync(`"${gitPath}" pull origin main --allow-unrelated-histories`, { cwd: projectDir, stdio: 'inherit' });
    console.log('✓ 遠程內容已拉取\n');
  } catch (e) {
    console.log('✓ 無需拉取\n');
  }

  // 推送代碼
  console.log('📝 步驟 4：推送代碼到 GitHub...');
  execSync(`"${gitPath}" push -u origin main`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ 代碼已推送\n');

  console.log('✅ 代碼已成功推送到 GitHub！\n');
  console.log('🔗 倉庫地址: https://github.com/free689594-collab/BurgBug\n');

} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

