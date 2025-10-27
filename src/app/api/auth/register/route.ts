import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase/server'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import {
  accountToEmail,
  validateAccount,
  validatePasswordStrength
} from '@/lib/auth/utils'

// 註冊節流：記錄 IP 的註冊次數
const registrationAttempts = new Map<string, { count: number; resetAt: number }>()

// 節流設定
const RATE_LIMIT = {
  MAX_ATTEMPTS: 3, // 每個時間窗口最多 3 次註冊嘗試
  WINDOW_MS: 60 * 60 * 1000, // 1 小時
}

/**
 * 檢查 IP 是否超過註冊次數限制
 */
function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  const now = Date.now()
  const record = registrationAttempts.get(ip)

  // 如果沒有記錄或已過期，建立新記錄
  if (!record || now > record.resetAt) {
    const resetAt = now + RATE_LIMIT.WINDOW_MS
    registrationAttempts.set(ip, { count: 0, resetAt })
    return { allowed: true, remainingAttempts: RATE_LIMIT.MAX_ATTEMPTS, resetAt }
  }

  // 檢查是否超過限制
  if (record.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetAt: record.resetAt }
  }

  return {
    allowed: true,
    remainingAttempts: RATE_LIMIT.MAX_ATTEMPTS - record.count,
    resetAt: record.resetAt
  }
}

/**
 * 記錄註冊嘗試
 */
function recordAttempt(ip: string): void {
  const record = registrationAttempts.get(ip)
  if (record) {
    record.count++
  }
}

/**
 * 驗證人機驗證 token（reCAPTCHA）
 * 注意：這是簡化版，生產環境需要實際整合 reCAPTCHA
 */
async function verifyRecaptcha(token: string | undefined): Promise<boolean> {
  // 開發模式：跳過驗證
  if (process.env.NODE_ENV !== 'production') {
    return true
  }

  // 如果沒有提供 token，驗證失敗
  if (!token) {
    return false
  }

  // 生產模式：實際驗證 reCAPTCHA
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
  if (!recaptchaSecret) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification')
    return true
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${token}`
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('reCAPTCHA verification failed:', error)
    return false
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { account, password, nickname, businessType, businessRegion, phone, recaptchaToken } = body

    // 1. 取得客戶端 IP（用於節流）
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown'

    // 2. 檢查註冊節流
    const rateLimit = checkRateLimit(ip)
    if (!rateLimit.allowed) {
      const resetTime = new Date(rateLimit.resetAt).toLocaleTimeString('zh-TW')
      return NextResponse.json(
        errorResponse(
          ErrorCodes.RATE_LIMIT_EXCEEDED,
          `註冊次數過多，請於 ${resetTime} 後再試`
        ),
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT.MAX_ATTEMPTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }

    // 3. 驗證人機驗證（reCAPTCHA）
    const isHuman = await verifyRecaptcha(recaptchaToken)
    if (!isHuman) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '人機驗證失敗，請重試'),
        { status: 400 }
      )
    }

    // 4. 驗證必填欄位
    if (!account || !password) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '帳號和密碼為必填欄位'),
        { status: 400 }
      )
    }

    // 4.1 驗證會員資訊必填欄位
    if (!nickname || !businessType || !businessRegion) {
      recordAttempt(ip)
      const missingFields = []
      if (!nickname) missingFields.push('暱稱')
      if (!businessType) missingFields.push('業務類型')
      if (!businessRegion) missingFields.push('業務區域')

      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          `以下欄位為必填：${missingFields.join('、')}`
        ),
        { status: 400 }
      )
    }

    // 4.2 驗證暱稱長度
    if (nickname.length > 10) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '暱稱長度不可超過 10 字元'),
        { status: 400 }
      )
    }

    // 4.3 驗證業務區域是否有效
    const validRegions = ['北北基宜', '桃竹苗', '中彰投', '雲嘉南', '高屏澎', '花東']
    if (!validRegions.includes(businessRegion)) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '業務區域無效，請選擇：' + validRegions.join('、')
        ),
        { status: 400 }
      )
    }

    // 4.4 驗證電話格式（選填，但如果有提供則需驗證）
    if (phone && !/^09\d{8}$/.test(phone)) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '電話格式錯誤，請輸入正確的手機號碼（例如：0912345678）'
        ),
        { status: 400 }
      )
    }

    // 5. 驗證帳號格式
    if (!validateAccount(account)) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '帳號格式錯誤：僅允許英文字母和數字，長度 5-15 字元'
        ),
        { status: 400 }
      )
    }

    // 6. 驗證密碼強度（使用增強版驗證）
    const passwordValidation = validatePasswordStrength(password, false)
    if (!passwordValidation.valid) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.VALIDATION_ERROR,
          '密碼強度不足',
          { errors: passwordValidation.errors }
        ),
        { status: 400 }
      )
    }

    // 7. 檢查帳號是否已存在（大小寫不敏感）
    const { data: existingMember, error: checkError } = await supabaseAdmin
      .from('members')
      .select('account')
      .ilike('account', account)
      .single()

    if (existingMember) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(
          ErrorCodes.CONFLICT,
          '此帳號已被註冊，請使用其他帳號'
        ),
        { status: 409 }
      )
    }

    // 如果 checkError 不是 PGRST116（找不到記錄），則是真正的錯誤
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Failed to check existing account:', checkError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
        { status: 500 }
      )
    }

    // 8. 轉換帳號為 email 格式
    const email = accountToEmail(account)

    // 9. 使用 Supabase Auth Admin API 建立使用者
    // 注意：使用 admin client 可以繞過 email 驗證
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自動確認 email（因為我們使用假 email）
      user_metadata: {
        account,
        created_via: 'registration'
      }
    })

    if (authError) {
      recordAttempt(ip)
      console.error('Failed to create auth user:', authError)
      
      // 優化錯誤訊息
      let errorMessage = '註冊失敗，請稍後再試'
      if (authError.message.includes('already registered')) {
        errorMessage = '此帳號已被註冊'
      } else if (authError.message.includes('password')) {
        errorMessage = '密碼格式不符合要求'
      }

      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, errorMessage),
        { status: 500 }
      )
    }

    if (!authData.user) {
      recordAttempt(ip)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '註冊失敗'),
        { status: 500 }
      )
    }

    // 10. 在 members 表中建立會員記錄（包含完整資訊）
    const { error: memberError } = await supabaseAdmin
      .from('members')
      .insert({
        user_id: authData.user.id,
        account: account.toLowerCase(), // 統一轉為小寫儲存
        nickname: nickname.trim(),
        business_type: businessType,
        business_region: businessRegion,
        phone: phone || null, // 選填欄位
        status: 'pending', // 新註冊會員預設為待審核
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (memberError) {
      // 如果建立會員記錄失敗，刪除已建立的 Auth 使用者
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      recordAttempt(ip)
      console.error('Failed to create member record:', memberError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '註冊失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 11. 在 user_roles 表中設定角色（預設為 user）
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'user',
        created_at: new Date().toISOString()
      })

    if (roleError) {
      // 如果設定角色失敗，刪除已建立的記錄
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('members').delete().eq('user_id', authData.user.id)
      recordAttempt(ip)
      console.error('Failed to create user role:', roleError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '註冊失敗，請稍後再試'),
        { status: 500 }
      )
    }

    // 12. 記錄審計日誌
    try {
      await supabaseAdmin.rpc('log_audit', {
        p_action: 'REGISTER',
        p_resource: 'auth',
        p_resource_id: authData.user.id,
        p_meta: {
          account,
          nickname,
          business_type: businessType,
          business_region: businessRegion,
          ip,
          status: 'pending'
        }
      })
    } catch (err) {
      console.error('Failed to log audit:', err)
      // 不阻塞註冊流程
    }

    // 13. 記錄成功的註冊嘗試（用於節流）
    recordAttempt(ip)

    // 14. 回傳成功響應
    return NextResponse.json(
      successResponse({
        user: {
          id: authData.user.id,
          account: account.toLowerCase(),
          nickname,
          business_type: businessType,
          business_region: businessRegion,
          status: 'pending'
        },
        message: '註冊成功！您的帳號正在審核中，審核通過後即可使用完整功能。'
      }, '註冊成功'),
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.MAX_ATTEMPTS.toString(),
          'X-RateLimit-Remaining': (rateLimit.remainingAttempts - 1).toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      errorResponse(ErrorCodes.INTERNAL_ERROR, '系統錯誤，請稍後再試'),
      { status: 500 }
    )
  }
}

