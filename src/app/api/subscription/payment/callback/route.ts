/**
 * 綠界付款回調 API
 * POST /api/subscription/payment/callback
 * 
 * 功能：
 * 1. 接收綠界付款結果通知
 * 2. 驗證檢查碼
 * 3. 更新付款記錄
 * 4. 更新會員訂閱狀態
 * 5. 返回 "1|OK" 給綠界
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parsePaymentCallback, generateECPayResponse, ECPayCallbackParams } from '@/lib/ecpay'

export async function POST(request: NextRequest) {
  try {
    // 1. 解析綠界回傳的表單資料
    const formData = await request.formData()
    const params: Record<string, any> = {}
    
    formData.forEach((value, key) => {
      params[key] = value.toString()
    })

    console.log('綠界付款回調參數:', params)

    // 2. 取得綠界設定
    const { data: config, error: configError } = await supabaseAdmin
      .from('subscription_config')
      .select('ecpay_hash_key, ecpay_hash_iv')
      .eq('id', 1)
      .single()

    if (configError || !config) {
      console.error('取得綠界設定失敗:', configError)
      return new NextResponse(generateECPayResponse(false), {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // 3. 驗證檢查碼和解析付款結果
    const result = parsePaymentCallback(
      params as ECPayCallbackParams,
      config.ecpay_hash_key,
      config.ecpay_hash_iv
    )

    if (!result.isValid) {
      console.error('綠界檢查碼驗證失敗')
      return new NextResponse(generateECPayResponse(false), {
        status: 400,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const callbackData = result.data!

    // 4. 查詢付款記錄
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('ecpay_merchant_trade_no', callbackData.MerchantTradeNo)
      .single()

    if (paymentError || !payment) {
      console.error('查詢付款記錄失敗:', paymentError)
      return new NextResponse(generateECPayResponse(false), {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // 5. 更新付款記錄
    const updateData: any = {
      ecpay_trade_no: callbackData.TradeNo,
      ecpay_payment_type: callbackData.PaymentType,
      ecpay_payment_date: callbackData.PaymentDate,
      ecpay_rtn_code: callbackData.RtnCode,
      ecpay_rtn_msg: callbackData.RtnMsg,
      ecpay_simulate_paid: callbackData.SimulatePaid || 0,
    }

    // 根據回調狀態更新付款狀態
    if (result.isSuccess) {
      // 付款成功
      updateData.status = 'completed'
      updateData.paid_at = new Date().toISOString()
    } else if (result.isPending) {
      // ATM/超商取號成功（待繳費）
      updateData.status = 'pending'

      // 儲存 ATM 虛擬帳號資訊
      if (callbackData.BankCode && callbackData.vAccount) {
        updateData.bank_code = callbackData.BankCode
        updateData.virtual_account = callbackData.vAccount
        updateData.payment_deadline = callbackData.ExpireDate
      }

      // 儲存超商條碼資訊
      if (callbackData.Barcode1 && callbackData.Barcode2 && callbackData.Barcode3) {
        updateData.barcode_1 = callbackData.Barcode1
        updateData.barcode_2 = callbackData.Barcode2
        updateData.barcode_3 = callbackData.Barcode3
        updateData.payment_deadline = callbackData.ExpireDate
      }

      // 儲存超商代碼資訊
      if (callbackData.PaymentNo) {
        updateData.payment_no = callbackData.PaymentNo
        updateData.payment_deadline = callbackData.ExpireDate
      }
    } else {
      // 付款失敗
      updateData.status = 'failed'
    }

    const { error: updateError } = await supabaseAdmin
      .from('payments')
      .update(updateData)
      .eq('id', payment.id)

    if (updateError) {
      console.error('更新付款記錄失敗:', updateError)
      return new NextResponse(generateECPayResponse(false), {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    // 6. 如果付款成功，更新會員訂閱狀態
    if (result.isSuccess) {
      // 6.1 取得訂閱方案資訊
      const { data: plan, error: planError } = await supabaseAdmin
        .from('subscription_plans')
        .select('*')
        .eq('id', payment.plan_id)
        .single()

      if (planError || !plan) {
        console.error('取得訂閱方案失敗:', planError)
        return new NextResponse(generateECPayResponse(false), {
          status: 500,
          headers: { 'Content-Type': 'text/plain' },
        })
      }

      // 6.2 計算訂閱結束時間
      const now = new Date()
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + plan.duration_days)

      // 6.3 查詢現有訂閱
      const { data: existingSubscription } = await supabaseAdmin
        .from('member_subscriptions')
        .select('*')
        .eq('user_id', payment.user_id)
        .single()

      if (existingSubscription) {
        // 更新現有訂閱
        const { error: subError } = await supabaseAdmin
          .from('member_subscriptions')
          .update({
            plan_id: plan.id,
            start_date: now.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            is_trial: false,
            payment_id: payment.id,
            updated_at: now.toISOString(),
          })
          .eq('user_id', payment.user_id)

        if (subError) {
          console.error('更新訂閱失敗:', subError)
          return new NextResponse(generateECPayResponse(false), {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      } else {
        // 建立新訂閱
        const { error: subError } = await supabaseAdmin
          .from('member_subscriptions')
          .insert({
            user_id: payment.user_id,
            plan_id: plan.id,
            start_date: now.toISOString(),
            end_date: endDate.toISOString(),
            status: 'active',
            is_trial: false,
            payment_id: payment.id,
          })

        if (subError) {
          console.error('建立訂閱失敗:', subError)
          return new NextResponse(generateECPayResponse(false), {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          })
        }
      }

      console.log(`付款成功：訂單 ${callbackData.MerchantTradeNo}，會員 ${payment.user_id}`)
    } else {
      console.log(`付款失敗：訂單 ${callbackData.MerchantTradeNo}，原因：${callbackData.RtnMsg}`)
    }

    // 7. 返回成功回應給綠界
    return new NextResponse(generateECPayResponse(true), {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })

  } catch (error: any) {
    console.error('綠界付款回調 API 錯誤:', error)
    return new NextResponse(generateECPayResponse(false), {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    })
  }
}

