# 會員功能完整測試腳本
# 測試日期：2025-10-26

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

$baseUrl = "http://localhost:3000"
$testResults = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   會員功能完整測試" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 測試 1：會員註冊 - 正常註冊
Write-Host "測試 1：會員註冊 - 正常註冊" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$timestamp = Get-Date -Format "HHmmss"
$testAccount = "testuser$timestamp"

$registerBody = @{
    account = $testAccount
    password = "TestPass123"
    nickname = "測試用戶$timestamp"
    businessType = "當鋪"
    businessRegion = "北北基宜"
    phone = "0912345678"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 201) {
        Write-Host "✅ 測試通過：註冊成功" -ForegroundColor Green
        Write-Host "   帳號: $testAccount" -ForegroundColor Gray
        Write-Host "   訊息: $($result.message)" -ForegroundColor Gray
        $testResults += @{Test="1.1 正常註冊"; Status="PASS"; Account=$testAccount}
    } else {
        Write-Host "❌ 測試失敗：狀態碼 $($response.StatusCode)" -ForegroundColor Red
        $testResults += @{Test="1.1 正常註冊"; Status="FAIL"; Reason="狀態碼 $($response.StatusCode)"}
    }
} catch {
    Write-Host "❌ 測試失敗：$($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="1.1 正常註冊"; Status="FAIL"; Reason=$_.Exception.Message}
}
Write-Host ""

# 測試 2：會員註冊 - 帳號重複
Write-Host "測試 2：會員註冊 - 帳號重複" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$duplicateBody = @{
    account = $testAccount
    password = "TestPass123"
    nickname = "重複測試"
    businessType = "小額"
    businessRegion = "桃竹苗"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $duplicateBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ 測試失敗：應該要拒絕重複帳號" -ForegroundColor Red
    $testResults += @{Test="1.2 帳號重複"; Status="FAIL"; Reason="未拒絕重複帳號"}
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "✅ 測試通過：正確拒絕重複帳號" -ForegroundColor Green
        $testResults += @{Test="1.2 帳號重複"; Status="PASS"}
    } else {
        Write-Host "❌ 測試失敗：錯誤的狀態碼 $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $testResults += @{Test="1.2 帳號重複"; Status="FAIL"; Reason="錯誤狀態碼"}
    }
}
Write-Host ""

# 測試 3：會員註冊 - 密碼強度不足
Write-Host "測試 3：會員註冊 - 密碼強度不足" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$weakPasswordBody = @{
    account = "testuser" + (Get-Date -Format "HHmmss")
    password = "weak123"
    nickname = "弱密碼測試"
    businessType = "融資"
    businessRegion = "中彰投"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $weakPasswordBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ 測試失敗：應該要拒絕弱密碼" -ForegroundColor Red
    $testResults += @{Test="1.3 密碼強度不足"; Status="FAIL"; Reason="未拒絕弱密碼"}
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ 測試通過：正確拒絕弱密碼" -ForegroundColor Green
        $testResults += @{Test="1.3 密碼強度不足"; Status="PASS"}
    } else {
        Write-Host "❌ 測試失敗：錯誤的狀態碼" -ForegroundColor Red
        $testResults += @{Test="1.3 密碼強度不足"; Status="FAIL"}
    }
}
Write-Host ""

# 測試 4：會員註冊 - 電話格式錯誤
Write-Host "測試 4：會員註冊 - 電話格式錯誤" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$invalidPhoneBody = @{
    account = "testuser" + (Get-Date -Format "HHmmss")
    password = "TestPass123"
    nickname = "錯誤電話測試"
    businessType = "代書"
    businessRegion = "雲嘉南"
    phone = "0800123456"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $invalidPhoneBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ 測試失敗：應該要拒絕錯誤電話格式" -ForegroundColor Red
    $testResults += @{Test="1.4 電話格式錯誤"; Status="FAIL"; Reason="未拒絕錯誤電話"}
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ 測試通過：正確拒絕錯誤電話格式" -ForegroundColor Green
        $testResults += @{Test="1.4 電話格式錯誤"; Status="PASS"}
    } else {
        Write-Host "❌ 測試失敗：錯誤的狀態碼" -ForegroundColor Red
        $testResults += @{Test="1.4 電話格式錯誤"; Status="FAIL"}
    }
}
Write-Host ""

# 測試 5：會員登入 - 待審核會員
Write-Host "測試 5：會員登入 - 待審核會員" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$loginBody = @{
    account = $testAccount
    password = "TestPass123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 200 -and $result.data.user.status -eq "pending") {
        Write-Host "✅ 測試通過：待審核會員可以登入" -ForegroundColor Green
        Write-Host "   狀態: $($result.data.user.status)" -ForegroundColor Gray
        Write-Host "   導向: $($result.data.redirectTo)" -ForegroundColor Gray
        $testResults += @{Test="2.2 待審核會員登入"; Status="PASS"}
        
        # 儲存 token 供後續測試使用
        $global:testToken = $result.data.session.access_token
        $global:testUserId = $result.data.user.id
    } else {
        Write-Host "❌ 測試失敗：狀態不符" -ForegroundColor Red
        $testResults += @{Test="2.2 待審核會員登入"; Status="FAIL"}
    }
} catch {
    Write-Host "❌ 測試失敗：$($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="2.2 待審核會員登入"; Status="FAIL"; Reason=$_.Exception.Message}
}
Write-Host ""

# 測試 6：會員登入 - 錯誤密碼
Write-Host "測試 6：會員登入 - 錯誤密碼" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$wrongPasswordBody = @{
    account = $testAccount
    password = "WrongPass123"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $wrongPasswordBody -ContentType "application/json" -UseBasicParsing -ErrorAction Stop
    Write-Host "❌ 測試失敗：應該要拒絕錯誤密碼" -ForegroundColor Red
    $testResults += @{Test="2.5 錯誤密碼"; Status="FAIL"; Reason="未拒絕錯誤密碼"}
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ 測試通過：正確拒絕錯誤密碼" -ForegroundColor Green
        $testResults += @{Test="2.5 錯誤密碼"; Status="PASS"}
    } else {
        Write-Host "❌ 測試失敗：錯誤的狀態碼" -ForegroundColor Red
        $testResults += @{Test="2.5 錯誤密碼"; Status="FAIL"}
    }
}
Write-Host ""

# 測試 7：管理員登入
Write-Host "測試 7：管理員登入" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$adminLoginBody = @{
    account = "q689594"
    password = "q6969520"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $adminLoginBody -ContentType "application/json" -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    if ($response.StatusCode -eq 200 -and $result.data.user.role -eq "super_admin") {
        Write-Host "✅ 測試通過：管理員登入成功" -ForegroundColor Green
        Write-Host "   角色: $($result.data.user.role)" -ForegroundColor Gray
        Write-Host "   導向: $($result.data.redirectTo)" -ForegroundColor Gray
        $testResults += @{Test="2.4 管理員登入"; Status="PASS"}
        
        # 儲存管理員 token
        $global:adminToken = $result.data.session.access_token
    } else {
        Write-Host "❌ 測試失敗：角色不符" -ForegroundColor Red
        $testResults += @{Test="2.4 管理員登入"; Status="FAIL"}
    }
} catch {
    Write-Host "❌ 測試失敗：$($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{Test="2.4 管理員登入"; Status="FAIL"; Reason=$_.Exception.Message}
}
Write-Host ""

# 測試結果總結
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   測試結果總結" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host "總測試數: $totalCount" -ForegroundColor White
Write-Host "通過: $passCount" -ForegroundColor Green
Write-Host "失敗: $failCount" -ForegroundColor Red
Write-Host "通過率: $([math]::Round($passCount / $totalCount * 100, 2))%" -ForegroundColor Yellow
Write-Host ""

Write-Host "詳細結果:" -ForegroundColor White
foreach ($result in $testResults) {
    $status = if ($result.Status -eq "PASS") { "✅" } else { "❌" }
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "$status $($result.Test)" -ForegroundColor $color
    if ($result.Reason) {
        Write-Host "   原因: $($result.Reason)" -ForegroundColor Gray
    }
}
Write-Host ""

# 儲存測試結果到檔案
$testResults | ConvertTo-Json | Out-File "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
Write-Host "測試結果已儲存到 test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ForegroundColor Cyan

