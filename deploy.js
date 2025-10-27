#!/usr/bin/env node

/**
 * 簡單部署腳本
 * 用途：提交代碼到 GitHub，Vercel 會自動部署
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 開始部署流程...\n');

// 檢查 Git 是否可用
function findGit() {
  const possiblePaths = [
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\bin\\git.exe',
    'git'
  ];

  for (const gitPath of possiblePaths) {
    try {
      execSync(`"${gitPath}" --version`, { stdio: 'pipe' });
      return gitPath;
    } catch (e) {
      // 繼續嘗試下一個路徑
    }
  }

  return null;
}

const gitPath = findGit();

if (!gitPath) {
  console.error('❌ 錯誤：找不到 Git');
  console.error('請安裝 Git: https://git-scm.com/download/win');
  process.exit(1);
}

console.log(`✓ 找到 Git: ${gitPath}\n`);

try {
  // 1. 檢查 Git 狀態
  console.log('📋 檢查 Git 狀態...');
  const status = execSync(`"${gitPath}" status --porcelain`, { encoding: 'utf-8' });
  
  if (!status.trim()) {
    console.log('✓ 沒有更改需要提交\n');
  } else {
    console.log('✓ 發現以下更改：');
    console.log(status);
    
    // 2. 添加所有文件
    console.log('\n📝 添加所有文件...');
    execSync(`"${gitPath}" add .`, { stdio: 'inherit' });
    console.log('✓ 文件已添加\n');
    
    // 3. 提交
    console.log('💾 提交更改...');
    const commitMessage = 'Fix Next.js 15 compatibility issues and prepare for deployment\n\n- Fixed dynamic route parameters to use Promise type\n- Fixed useSearchParams() to be wrapped in Suspense boundaries\n- Fixed middleware import issues\n- Fixed TypeScript type errors in API routes';
    
    execSync(`"${gitPath}" commit -m "${commitMessage}"`, { stdio: 'inherit' });
    console.log('✓ 更改已提交\n');
  }
  
  // 4. 推送到 GitHub
  console.log('🌐 推送到 GitHub...');
  execSync(`"${gitPath}" push origin main`, { stdio: 'inherit' });
  console.log('✓ 代碼已推送到 GitHub\n');
  
  console.log('✅ 部署完成！');
  console.log('\n📊 下一步：');
  console.log('1. 訪問 https://vercel.com/dashboard');
  console.log('2. 找到你的項目');
  console.log('3. 等待自動部署完成（通常 2-5 分鐘）');
  console.log('4. 部署完成後訪問你的線上 URL\n');
  
} catch (error) {
  console.error('❌ 部署失敗：', error.message);
  process.exit(1);
}

