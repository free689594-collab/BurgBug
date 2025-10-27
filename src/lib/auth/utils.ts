// 認證工具函數

/**
 * 將帳號轉換為 Supabase Auth 使用的 email 格式
 * 規則：${account}@auth.local
 * 
 * @param account - 使用者帳號（5-15 字元，A-Z/a-z/0-9）
 * @returns email 格式的字串
 */
export function accountToEmail(account: string): string {
  return `${account.toLowerCase()}@auth.local`
}

/**
 * 從 email 格式提取帳號
 * 
 * @param email - Supabase Auth 的 email
 * @returns 原始帳號，如果不是 @auth.local 格式則返回 null
 */
export function emailToAccount(email: string): string | null {
  if (!email.endsWith('@auth.local')) {
    return null
  }
  return email.replace('@auth.local', '')
}

/**
 * 驗證帳號格式
 * 規則：5-15 字元，僅允許 A-Z/a-z/0-9
 * 
 * @param account - 要驗證的帳號
 * @returns 是否符合格式
 */
export function validateAccount(account: string): boolean {
  const accountRegex = /^[A-Za-z0-9]{5,15}$/
  return accountRegex.test(account)
}

/**
 * 驗證密碼格式（基本版）
 * 規則：至少 8 字元
 *
 * @param password - 要驗證的密碼
 * @returns 是否符合格式
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8
}

/**
 * 驗證密碼強度（增強版）
 * 規則：
 * - 至少 8 字元
 * - 至少包含一個大寫字母
 * - 至少包含一個小寫字母
 * - 至少包含一個數字
 * - 可選：至少包含一個特殊字元
 *
 * @param password - 要驗證的密碼
 * @param requireSpecialChar - 是否要求特殊字元（預設：false）
 * @returns { valid: boolean, errors: string[] }
 */
export function validatePasswordStrength(
  password: string,
  requireSpecialChar: boolean = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('密碼至少需要 8 個字元')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密碼需要包含至少一個大寫字母')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密碼需要包含至少一個小寫字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密碼需要包含至少一個數字')
  }

  if (requireSpecialChar && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密碼需要包含至少一個特殊字元')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 產生裝置指紋（簡化版）
 * 基於 User-Agent 和其他瀏覽器資訊
 * 
 * @param userAgent - 瀏覽器 User-Agent
 * @returns 裝置指紋字串
 */
export function generateDeviceFingerprint(userAgent: string): string {
  // 簡化版：使用 User-Agent 的 hash
  // 生產環境建議使用更複雜的指紋識別（如 fingerprintjs）
  const hash = userAgent.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0)
  }, 0)
  return `device_${Math.abs(hash).toString(36)}`
}

