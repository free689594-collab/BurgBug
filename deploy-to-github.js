const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const gitPath = 'C:\\Program Files\\Git\\bin\\git.exe';
const projectDir = 'c:\\BOSS\\ProJect\\BurgBug';

console.log('🚀 開始部署到 GitHub...\n');

try {
  // 步驟 1：初始化 Git 倉庫
  console.log('📝 步驟 1：初始化 Git 倉庫...');
  try {
    execSync(`"${gitPath}" init`, { cwd: projectDir, stdio: 'inherit' });
    console.log('✓ Git 倉庫已初始化\n');
  } catch (e) {
    console.log('✓ Git 倉庫已存在\n');
  }

  // 步驟 2：配置 Git 用戶信息
  console.log('📝 步驟 2：配置 Git 用戶信息...');
  execSync(`"${gitPath}" config user.email "you@example.com"`, { cwd: projectDir, stdio: 'inherit' });
  execSync(`"${gitPath}" config user.name "Your Name"`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ Git 用戶信息已配置\n');

  // 步驟 3：添加所有文件
  console.log('📝 步驟 3：添加所有文件到 Git...');
  execSync(`"${gitPath}" add .`, { cwd: projectDir, stdio: 'inherit' });
  console.log('✓ 所有文件已添加\n');

  // 步驟 4：提交代碼
  console.log('📝 步驟 4：提交代碼...');
  execSync(`"${gitPath}" commit -m "Initial commit: BurgBug debt platform - Ready for deployment"`, { 
    cwd: projectDir, 
    stdio: 'inherit' 
  });
  console.log('✓ 代碼已提交\n');

  // 步驟 5：提示用戶添加遠程倉庫
  console.log('✅ 本地 Git 倉庫已準備好！\n');
  console.log('📌 下一步：添加遠程倉庫\n');
  console.log('請在 GitHub 上創建新倉庫，然後運行以下命令：\n');
  console.log('  git remote add origin https://github.com/你的用戶名/BurgBug.git');
  console.log('  git branch -M main');
  console.log('  git push -u origin main\n');
  console.log('💡 提示：將 "你的用戶名" 替換為你的 GitHub 用戶名\n');

} catch (error) {
  console.error('❌ 錯誤:', error.message);
  process.exit(1);
}

