// 訂閱系統類型定義

/**
 * 訂閱計畫類型
 */
export type SubscriptionPlanType = 'free_trial' | 'vip_monthly'

/**
 * 訂閱狀態
 */
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'cancelled'

/**
 * 訂閱類型（用於區分額度計算方式）
 */
export type SubscriptionType = 'free_trial' | 'vip_monthly'

/**
 * 額度類型
 */
export type QuotaType = 'total' | 'daily'

/**
 * 操作類型
 */
export type ActionType = 'upload' | 'query'

/**
 * 訂閱計畫
 */
export interface SubscriptionPlan {
  id: string
  plan_name: SubscriptionPlanType
  display_name: string
  description: string | null
  price: number
  duration_days: number
  upload_quota_daily: number | null
  query_quota_daily: number | null
  upload_quota_total: number | null
  query_quota_total: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * 會員訂閱
 */
export interface MemberSubscription {
  id: string
  user_id: string
  plan_id: string
  status: SubscriptionStatus
  subscription_type: SubscriptionType
  start_date: string
  end_date: string
  remaining_upload_quota: number | null
  remaining_query_quota: number | null
  created_at: string
  updated_at: string
}

/**
 * 每日使用額度
 */
export interface DailyUsageQuota {
  id: string
  user_id: string
  date: string
  uploads_used: number
  queries_used: number
  uploads_limit: number
  queries_limit: number
  created_at: string
  updated_at: string
}

/**
 * 付款記錄
 */
export interface Payment {
  id: string
  user_id: string
  subscription_id: string | null
  order_number: string
  amount: number
  ecpay_merchant_trade_no: string | null
  ecpay_trade_no: string | null
  ecpay_payment_date: string | null
  status: 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method: string | null
  created_at: string
  updated_at: string
}

/**
 * 訂閱通知
 */
export interface SubscriptionNotification {
  id: string
  user_id: string
  subscription_id: string
  notification_type: 'expiry_7days' | 'expiry_3days' | 'expiry_1day' | 'expired'
  scheduled_date: string
  is_sent: boolean
  sent_at: string | null
  created_at: string
  updated_at: string
}

/**
 * 訂閱狀態查詢結果
 */
export interface SubscriptionStatusResult {
  subscription_id: string
  plan_name: SubscriptionPlanType
  display_name: string
  status: SubscriptionStatus
  subscription_type: SubscriptionType
  start_date: string
  end_date: string
  days_remaining: number
  is_expired: boolean
  is_vip: boolean
  quota_type: QuotaType
  upload_used: number
  upload_limit: number
  upload_remaining: number
  query_used: number
  query_limit: number
  query_remaining: number
}

/**
 * 額度檢查結果
 */
export interface QuotaCheckResult {
  has_quota: boolean
  remaining: number
  limit: number
  used: number
  quota_type: QuotaType
  message?: string
}

/**
 * 額度扣除結果
 */
export interface QuotaDeductResult {
  success: boolean
  remaining: number
  message?: string
}

/**
 * 訂閱配置
 */
export interface SubscriptionConfig {
  id: string
  trial_days: number
  monthly_price: number
  free_upload_quota: number
  free_query_quota: number
  vip_upload_daily: number
  vip_query_daily: number
  notification_days_before: number[]
  ecpay_merchant_id: string | null
  ecpay_hash_key: string | null
  ecpay_hash_iv: string | null
  ecpay_test_mode: boolean
  created_at: string
  updated_at: string
}

/**
 * 管理後台訂閱統計
 */
export interface SubscriptionStats {
  total_subscriptions: number
  active_subscriptions: number
  trial_subscriptions: number
  expired_subscriptions: number
  vip_members: number
  total_revenue: number
  monthly_revenue: number
  subscription_distribution: {
    free_trial: number
    vip_monthly: number
  }
  recent_payments: Payment[]
  expiring_soon: {
    count: number
    subscriptions: Array<{
      user_id: string
      account: string
      end_date: string
      days_remaining: number
    }>
  }
}

/**
 * API 請求：檢查額度
 */
export interface CheckQuotaRequest {
  action_type: ActionType
}

/**
 * API 請求：扣除額度
 */
export interface DeductQuotaRequest {
  action_type: ActionType
}

/**
 * API 請求：更新訂閱配置
 */
export interface UpdateSubscriptionConfigRequest {
  trial_days?: number
  monthly_price?: number
  free_upload_quota?: number
  free_query_quota?: number
  vip_upload_daily?: number
  vip_query_daily?: number
  notification_days_before?: number[]
  ecpay_merchant_id?: string
  ecpay_hash_key?: string
  ecpay_hash_iv?: string
  ecpay_test_mode?: boolean
}

/**
 * API 響應：訂閱狀態
 */
export interface SubscriptionStatusResponse {
  success: boolean
  data?: SubscriptionStatusResult
  error?: string
}

/**
 * API 響應：額度檢查
 */
export interface QuotaCheckResponse {
  success: boolean
  data?: QuotaCheckResult
  error?: string
}

/**
 * API 響應：額度扣除
 */
export interface QuotaDeductResponse {
  success: boolean
  data?: QuotaDeductResult
  error?: string
}

/**
 * API 響應：訂閱統計
 */
export interface SubscriptionStatsResponse {
  success: boolean
  data?: SubscriptionStats
  error?: string
}

/**
 * API 響應：訂閱配置
 */
export interface SubscriptionConfigResponse {
  success: boolean
  data?: SubscriptionConfig
  error?: string
}

