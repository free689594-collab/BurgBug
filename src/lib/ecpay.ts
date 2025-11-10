/**
 * 綠界金流（ECPay）整合工具函數
 * 
 * 功能：
 * 1. 產生檢查碼（CheckMacValue）
 * 2. 驗證回傳資料
 * 3. 產生訂單編號
 * 4. 建立付款表單資料
 */

import crypto from 'crypto'

/**
 * 綠界 API 端點
 */
export const ECPAY_ENDPOINTS = {
  // 測試環境
  test: {
    aio: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5',
    query: 'https://payment-stage.ecpay.com.tw/Cashier/QueryTradeInfo/V5',
  },
  // 正式環境
  production: {
    aio: 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5',
    query: 'https://payment.ecpay.com.tw/Cashier/QueryTradeInfo/V5',
  },
}

/**
 * 綠界付款參數介面
 */
export interface ECPayPaymentParams {
  MerchantID: string              // 商店代號
  MerchantTradeNo: string         // 商店訂單編號（唯一值，20 碼）
  MerchantTradeDate: string       // 商店交易時間（yyyy/MM/dd HH:mm:ss）
  PaymentType: string             // 交易類型（固定填入 aio）
  TotalAmount: number             // 交易金額
  TradeDesc: string               // 交易描述
  ItemName: string                // 商品名稱
  ReturnURL: string               // 付款完成通知回傳網址
  ChoosePayment: string           // 預設付款方式（ALL, Credit, ATM 等）
  ClientBackURL?: string          // 返回商店網址
  OrderResultURL?: string         // 付款完成後導向網址
  NeedExtraPaidInfo?: string      // 是否需要額外付款資訊（Y/N）
  EncryptType?: string            // CheckMacValue 加密類型（1=SHA256）
}

/**
 * 付款方式類型
 */
export type PaymentMethod = 'atm' | 'webatm' | 'barcode' | 'cvs' | 'credit'

/**
 * 付款方式對應的綠界參數
 */
export const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  atm: 'ATM',           // ATM 虛擬帳號
  webatm: 'WebATM',     // 網路 ATM
  barcode: 'BARCODE',   // 超商條碼
  cvs: 'CVS',           // 超商代碼
  credit: 'Credit',     // 信用卡（保留但不使用）
}

/**
 * 付款方式顯示名稱
 */
export const PAYMENT_METHOD_NAMES: Record<PaymentMethod, string> = {
  atm: 'ATM 虛擬帳號',
  webatm: '網路 ATM',
  barcode: '超商條碼',
  cvs: '超商代碼',
  credit: '信用卡',
}

/**
 * 綠界回傳參數介面
 */
export interface ECPayCallbackParams {
  MerchantID: string
  MerchantTradeNo: string
  StoreID?: string
  RtnCode: number                 // 交易狀態（1=成功, 2=ATM取號成功, 10100073=超商取號成功）
  RtnMsg: string                  // 交易訊息
  TradeNo: string                 // 綠界交易編號
  TradeAmt: number                // 交易金額
  PaymentDate: string             // 付款時間（yyyy/MM/dd HH:mm:ss）
  PaymentType: string             // 付款方式
  PaymentTypeChargeFee: number    // 通路費
  TradeDate: string               // 訂單成立時間
  SimulatePaid: number            // 是否為模擬付款（0=否, 1=是）
  CheckMacValue: string           // 檢查碼

  // ATM 虛擬帳號相關
  BankCode?: string               // 銀行代碼
  vAccount?: string               // 虛擬帳號
  ExpireDate?: string             // 繳費期限（yyyy/MM/dd HH:mm:ss）

  // 超商條碼相關
  Barcode1?: string               // 第一段條碼
  Barcode2?: string               // 第二段條碼
  Barcode3?: string               // 第三段條碼

  // 超商代碼相關
  PaymentNo?: string              // 繳費代碼

  [key: string]: any              // 其他可能的參數
}

/**
 * 產生綠界訂單編號
 * 格式：ZHX + 時間戳（13碼）+ 隨機數（4碼）= 20碼
 */
export function generateMerchantTradeNo(): string {
  const timestamp = Date.now().toString() // 13 碼時間戳
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0') // 4 碼隨機數
  return `ZHX${timestamp}${random}` // ZHX + 13 + 4 = 20 碼
}

/**
 * 格式化交易時間
 * 格式：yyyy/MM/dd HH:mm:ss
 */
export function formatTradeDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

/**
 * URL 編碼（綠界專用）
 * 將參數值進行 URL 編碼，並轉換為小寫
 */
function urlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')      // 空格轉換為 +
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
}

/**
 * 產生檢查碼（CheckMacValue）
 * 
 * 步驟：
 * 1. 將參數依照 Key 值排序（A-Z）
 * 2. 串接成 key1=value1&key2=value2 格式
 * 3. 前後加上 HashKey 和 HashIV
 * 4. URL 編碼
 * 5. 轉換為小寫
 * 6. SHA256 加密
 * 7. 轉換為大寫
 */
export function generateCheckMacValue(
  params: Record<string, any>,
  hashKey: string,
  hashIV: string
): string {
  // 1. 移除 CheckMacValue（如果存在）
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
 * 驗證綠界回傳的檢查碼
 */
export function verifyCheckMacValue(
  params: Record<string, any>,
  hashKey: string,
  hashIV: string
): boolean {
  const receivedCheckMacValue = params.CheckMacValue
  if (!receivedCheckMacValue) {
    return false
  }

  const calculatedCheckMacValue = generateCheckMacValue(params, hashKey, hashIV)
  return receivedCheckMacValue === calculatedCheckMacValue
}

/**
 * 建立付款表單資料
 *
 * @param config - 綠界設定（MerchantID, HashKey, HashIV, TestMode）
 * @param paymentData - 付款資料（金額、商品名稱、付款方式等）
 * @returns 包含所有付款參數和檢查碼的物件
 */
export function createPaymentFormData(
  config: {
    merchantId: string
    hashKey: string
    hashIV: string
    testMode: boolean
  },
  paymentData: {
    amount: number
    itemName: string
    tradeDesc: string
    returnURL: string
    paymentMethod: PaymentMethod  // 新增：付款方式
    clientBackURL?: string
    orderResultURL?: string
  }
): ECPayPaymentParams & { CheckMacValue: string; ActionURL: string } {
  // 產生訂單編號和交易時間
  const merchantTradeNo = generateMerchantTradeNo()
  const merchantTradeDate = formatTradeDate()

  // 根據付款方式設定 ChoosePayment
  const choosePayment = PAYMENT_METHOD_MAP[paymentData.paymentMethod]

  // 建立付款參數
  const params: ECPayPaymentParams = {
    MerchantID: config.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: merchantTradeDate,
    PaymentType: 'aio',
    TotalAmount: paymentData.amount,
    TradeDesc: paymentData.tradeDesc,
    ItemName: paymentData.itemName,
    ReturnURL: paymentData.returnURL,
    ChoosePayment: choosePayment, // 根據付款方式設定
    EncryptType: '1', // SHA256
  }

  // 可選參數
  if (paymentData.clientBackURL) {
    params.ClientBackURL = paymentData.clientBackURL
  }
  if (paymentData.orderResultURL) {
    params.OrderResultURL = paymentData.orderResultURL
  }

  // ATM 和超商付款需要額外資訊
  if (['atm', 'barcode', 'cvs'].includes(paymentData.paymentMethod)) {
    params.NeedExtraPaidInfo = 'Y'
  }

  // 產生檢查碼
  const checkMacValue = generateCheckMacValue(params, config.hashKey, config.hashIV)

  // 選擇 API 端點
  const actionURL = config.testMode
    ? ECPAY_ENDPOINTS.test.aio
    : ECPAY_ENDPOINTS.production.aio

  return {
    ...params,
    CheckMacValue: checkMacValue,
    ActionURL: actionURL,
  }
}

/**
 * 解析綠界回傳的付款結果
 */
export function parsePaymentCallback(
  params: ECPayCallbackParams,
  hashKey: string,
  hashIV: string
): {
  isValid: boolean
  isSuccess: boolean
  isPending: boolean  // 新增：是否為待繳費狀態（ATM/超商取號成功）
  data: ECPayCallbackParams | null
  error?: string
} {
  // 1. 驗證檢查碼
  const isValid = verifyCheckMacValue(params, hashKey, hashIV)
  if (!isValid) {
    return {
      isValid: false,
      isSuccess: false,
      isPending: false,
      data: null,
      error: '檢查碼驗證失敗',
    }
  }

  // 2. 檢查交易狀態
  // RtnCode = 1: 付款成功
  // RtnCode = 2: ATM 取號成功（待繳費）
  // RtnCode = 10100073: 超商取號成功（待繳費）
  const isSuccess = params.RtnCode === 1
  const isPending = params.RtnCode === 2 || params.RtnCode === 10100073

  return {
    isValid: true,
    isSuccess: isSuccess,
    isPending: isPending,
    data: params,
    error: isSuccess || isPending ? undefined : params.RtnMsg,
  }
}

/**
 * 產生綠界回應字串
 * 付款完成後必須回應 "1|OK" 給綠界
 */
export function generateECPayResponse(success: boolean): string {
  return success ? '1|OK' : '0|Error'
}

