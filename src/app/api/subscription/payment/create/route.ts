/**
 * 建立訂閱付款訂單 API
 * POST /api/subscription/payment/create
 * 
 * 功能：
 * 1. 驗證使用者身份
 * 2. 檢查訂閱狀態
 * 3. 建立付款記錄
 * 4. 產生綠界付款表單資料
 * 5. 返回付款表單參數
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response'
import { createPaymentFormData, PaymentMethod } from '@/lib/ecpay'

/**
 * 建立付款訂單請求介面
 */
interface CreatePaymentRequest {
  plan_type: 'vip_monthly'        // 目前只支援 VIP 月費
  payment_method: PaymentMethod   // 付款方式：atm, webatm, barcode, cvs
}

/**
 * 建立付款訂單回應介面
 */
interface CreatePaymentResponse {
  payment_id: string
  merchant_trade_no: string
  amount: number
  form_data: Record<string, any>
  action_url: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. 從 Authorization header 取得 token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '未提供認證 token'),
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // 2. 驗證 token 並取得使用者
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        errorResponse(ErrorCodes.UNAUTHORIZED, '無效的認證 token'),
        { status: 401 }
      )
    }

    // 3. 解析請求參數
    const body: CreatePaymentRequest = await request.json()
    const { plan_type, payment_method } = body

    if (!plan_type || plan_type !== 'vip_monthly') {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的訂閱方案類型'),
        { status: 400 }
      )
    }

    // 驗證付款方式
    const validPaymentMethods: PaymentMethod[] = ['atm', 'barcode', 'cvs']
    if (!payment_method || !validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        errorResponse(ErrorCodes.VALIDATION_ERROR, '無效的付款方式，請選擇：ATM虛擬帳號、超商條碼或超商代碼'),
        { status: 400 }
      )
    }

    // 4. 從環境變數取得綠界設定
    const ecpayMerchantId = process.env.ECPAY_MERCHANT_ID
    const ecpayHashKey = process.env.ECPAY_HASH_KEY
    const ecpayHashIV = process.env.ECPAY_HASH_IV
    const ecpayTestMode = process.env.ECPAY_TEST_MODE === 'true'

    if (!ecpayMerchantId || !ecpayHashKey || !ecpayHashIV) {
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '綠界金流尚未設定，請聯繫管理員'),
        { status: 500 }
      )
    }

    // 5. 取得訂閱方案資訊（使用 plan_name）
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .eq('plan_name', plan_type)  // plan_type 的值就是 'vip_monthly'
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      console.error('取得訂閱方案失敗:', planError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '訂閱方案不存在或已停用'),
        { status: 500 }
      )
    }

    // 6. 產生訂單編號
    const orderNumber = `ZHX${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // 7. 建立付款記錄（不包含 plan_id，使用 order_number）
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        amount: plan.price,
        currency: 'TWD',
        status: 'pending',
        payment_method: payment_method,
      })
      .select()
      .single()

    if (paymentError || !payment) {
      console.error('建立付款記錄失敗:', paymentError)
      return NextResponse.json(
        errorResponse(ErrorCodes.INTERNAL_ERROR, '建立付款記錄失敗'),
        { status: 500 }
      )
    }

    // 8. 產生綠界付款表單資料
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 使用綠界測試帳號：2000132
    console.log('綠界設定:', {
      merchantId: ecpayMerchantId,
      testMode: ecpayTestMode,
      baseURL,
    })

    const formData = createPaymentFormData(
      {
        merchantId: ecpayMerchantId,
        hashKey: ecpayHashKey,
        hashIV: ecpayHashIV,
        testMode: ecpayTestMode,
      },
      {
        amount: plan.price,
        itemName: plan.display_name,
        tradeDesc: `臻好尋 - ${plan.display_name}`,
        returnURL: `${baseURL}/api/subscription/payment/callback`,
        paymentMethod: payment_method,
        clientBackURL: `${baseURL}/subscription`,
        orderResultURL: `${baseURL}/subscription/payment/result`,
      }
    )

    console.log('綠界付款表單資料:', {
      MerchantID: formData.MerchantID,
      MerchantTradeNo: formData.MerchantTradeNo,
      TotalAmount: formData.TotalAmount,
      ChoosePayment: formData.ChoosePayment,
      ActionURL: formData.ActionURL,
    })

    // 9. 更新付款記錄的綠界訂單編號
    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        ecpay_merchant_trade_no: formData.MerchantTradeNo,
      })
      .eq('id', payment.id)

    if (updateError) {
      console.error('更新付款記錄失敗:', updateError)
      // 不阻塞主流程
    }

    // 10. 返回付款表單資料
    const response: CreatePaymentResponse = {
      payment_id: payment.id,
      merchant_trade_no: formData.MerchantTradeNo,
      amount: plan.price,
      form_data: formData,
      action_url: formData.ActionURL,
    }

    return NextResponse.json(
      successResponse<CreatePaymentResponse>(response)
    )

  } catch (error: any) {
    console.error('建立付款訂單 API 錯誤:', error)
    return NextResponse.json(
      errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        '系統錯誤',
        error.message
      ),
      { status: 500 }
    )
  }
}

