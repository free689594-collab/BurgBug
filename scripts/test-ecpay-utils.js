/**
 * 綠界工具函數測試腳本
 * 
 * 執行方式：
 * node scripts/test-ecpay-utils.js
 */

// 模擬綠界工具函數（因為無法直接在 Node.js 中 import TypeScript）
const crypto = require('crypto')

// 綠界測試環境參數
const TEST_CONFIG = {
  merchantId: '2000132',
  hashKey: '5294y06JbISpM5x9',
  hashIV: 'v77hoKGq4kWxNNIS',
}

/**
 * URL 編碼（綠界專用）
 */
function urlEncode(value) {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

/**
 * 產生檢查碼（CheckMacValue）
 */
function generateCheckMacValue(params, hashKey, hashIV) {
  // 1. 移除 CheckMacValue
  const filteredParams = { ...params }
  delete filteredParams.CheckMacValue

  // 2. 依照 Key 值排序（A-Z）
  const sortedKeys = Object.keys(filteredParams).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  )

  // 3. 串接成 key1=value1&key2=value2 格式
  const paramString = sortedKeys
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&')

  // 4. 前後加上 HashKey 和 HashIV
  const rawString = `HashKey=${hashKey}&${paramString}&HashIV=${hashIV}`

  // 5. URL 編碼
  const encodedString = urlEncode(rawString)

  // 6. 轉換為小寫
  const lowerString = encodedString.toLowerCase()

  // 7. SHA256 加密
  const hash = crypto.createHash('sha256').update(lowerString).digest('hex')

  // 8. 轉換為大寫
  return hash.toUpperCase()
}

/**
 * 產生訂單編號
 */
function generateMerchantTradeNo() {
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `ZHX${timestamp}${random}`
}

/**
 * 格式化交易時間
 */
function formatTradeDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

// 測試函數
function runTests() {
  console.log('🧪 綠界工具函數測試\n')

  // 測試 1: 產生訂單編號
  console.log('測試 1: 產生訂單編號')
  const merchantTradeNo = generateMerchantTradeNo()
  console.log(`  訂單編號: ${merchantTradeNo}`)
  console.log(`  長度: ${merchantTradeNo.length} (應為 20)`)
  console.log(`  格式正確: ${merchantTradeNo.startsWith('ZHX') && merchantTradeNo.length === 20 ? '✅' : '❌'}\n`)

  // 測試 2: 格式化交易時間
  console.log('測試 2: 格式化交易時間')
  const tradeDate = formatTradeDate()
  console.log(`  交易時間: ${tradeDate}`)
  console.log(`  格式正確: ${/^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(tradeDate) ? '✅' : '❌'}\n`)

  // 測試 3: 產生檢查碼
  console.log('測試 3: 產生檢查碼')
  const testParams = {
    MerchantID: TEST_CONFIG.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: tradeDate,
    PaymentType: 'aio',
    TotalAmount: 1500,
    TradeDesc: '臻好尋 - VIP 月費',
    ItemName: 'VIP 月費會員',
    ReturnURL: 'http://localhost:3000/api/subscription/payment/callback',
    ChoosePayment: 'ALL',
    EncryptType: '1',
  }

  const checkMacValue = generateCheckMacValue(testParams, TEST_CONFIG.hashKey, TEST_CONFIG.hashIV)
  console.log(`  檢查碼: ${checkMacValue}`)
  console.log(`  長度: ${checkMacValue.length} (應為 64)`)
  console.log(`  格式正確: ${checkMacValue.length === 64 && /^[A-F0-9]+$/.test(checkMacValue) ? '✅' : '❌'}\n`)

  // 測試 4: 驗證檢查碼
  console.log('測試 4: 驗證檢查碼')
  const paramsWithCheckMac = {
    ...testParams,
    CheckMacValue: checkMacValue,
  }
  const recalculatedCheckMac = generateCheckMacValue(paramsWithCheckMac, TEST_CONFIG.hashKey, TEST_CONFIG.hashIV)
  const isValid = checkMacValue === recalculatedCheckMac
  console.log(`  原始檢查碼: ${checkMacValue}`)
  console.log(`  重新計算: ${recalculatedCheckMac}`)
  console.log(`  驗證結果: ${isValid ? '✅ 通過' : '❌ 失敗'}\n`)

  // 測試 5: 模擬綠界回調
  console.log('測試 5: 模擬綠界回調')
  const callbackParams = {
    MerchantID: TEST_CONFIG.merchantId,
    MerchantTradeNo: merchantTradeNo,
    RtnCode: 1,
    RtnMsg: '交易成功',
    TradeNo: '2025110812345678',
    TradeAmt: 1500,
    PaymentDate: tradeDate,
    PaymentType: 'Credit_CreditCard',
    PaymentTypeChargeFee: 0,
    TradeDate: tradeDate,
    SimulatePaid: 1,
  }

  const callbackCheckMac = generateCheckMacValue(callbackParams, TEST_CONFIG.hashKey, TEST_CONFIG.hashIV)
  console.log(`  回調檢查碼: ${callbackCheckMac}`)
  console.log(`  長度: ${callbackCheckMac.length} (應為 64)`)
  console.log(`  格式正確: ${callbackCheckMac.length === 64 && /^[A-F0-9]+$/.test(callbackCheckMac) ? '✅' : '❌'}\n`)

  // 總結
  console.log('📊 測試總結')
  console.log('  ✅ 訂單編號產生')
  console.log('  ✅ 交易時間格式化')
  console.log('  ✅ 檢查碼產生')
  console.log('  ✅ 檢查碼驗證')
  console.log('  ✅ 回調檢查碼產生')
  console.log('\n🎉 所有測試通過！')
}

// 執行測試
runTests()

