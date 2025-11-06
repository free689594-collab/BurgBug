/**
 * 債務記錄相關類型定義
 */

/**
 * 還款狀況類型
 * 注意：資料庫中可能還有舊資料（結清、議價結清、代償），前端會自動映射到「結清 / 議價結清 / 代償」
 */
export type RepaymentStatus = '待觀察' | '正常' | '結清 / 議價結清 / 代償' | '疲勞' | '呆帳'

/**
 * 債務記錄資料結構
 */
export interface DebtRecord {
  id: string
  debtor_name: string
  debtor_id_full: string
  debtor_phone?: string | null
  gender: '男' | '女' | '其他'
  profession?: string | null
  residence: string
  debt_date: string // ISO 8601 date
  face_value: number
  payment_frequency: 'daily' | 'weekly' | 'monthly'
  repayment_status: RepaymentStatus | '結清' | '議價結清' | '代償' // 包含舊資料的可能值
  note?: string | null
  uploaded_by: string
  created_at: string
  updated_at?: string | null
  debtor_id_first_letter: string
  debtor_id_last5: string
  admin_edited_by?: string | null
  admin_edit_reason?: string | null
  // 私密欄位（僅上傳者可見）
  settled_amount?: number | null // 結清金額
  recovered_amount?: number | null // 已收回金額
  bad_debt_amount?: number | null // 呆帳金額
  internal_rating?: number | null // 內部評價（1-5星）
}

/**
 * 債務上傳請求資料
 */
export interface DebtUploadRequest {
  // 債務人基本資料
  debtor_name: string
  debtor_id_full: string
  debtor_phone?: string
  gender: '男' | '女' | '其他'
  profession?: string
  residence: string

  // 債務資料
  debt_date: string // YYYY-MM-DD
  face_value: number
  payment_frequency: 'daily' | 'weekly' | 'monthly'
  repayment_status: RepaymentStatus
  note?: string
}

/**
 * 債務查詢請求參數
 */
export interface DebtSearchRequest {
  debtor_id_first_letter: string // A-Z
  debtor_id_last5: string // 5 位數字
  residence?: string // 可選的居住地篩選
}

/**
 * 備註摘要
 */
export interface DebtNotesSummary {
  content: string
  created_at: string
}

/**
 * 債務人行為統計
 */
export interface DebtorStatistics {
  total_records: number // 總記錄數
  unique_uploaders: number // 登錄債務會員數
  status_distribution: { // 還款狀況分布（%）
    '待觀察': number
    '正常': number
    '結清': number
    '疲勞': number
    '呆帳': number
  }
  latest_update: string | null // 最近更新時間
}

/**
 * 債務查詢結果（遮罩版）
 */
export interface DebtSearchResult {
  id: string
  debtor_name: string // 遮罩後
  debtor_id_full: string // 遮罩後
  debtor_phone?: string | null // 遮罩後
  gender: string
  profession?: string | null
  residence: string
  debt_date: string
  face_value: number
  payment_frequency: string
  repayment_status: string
  note?: string | null
  uploaded_by: string
  created_at: string
  debtor_id_first_letter: string
  debtor_id_last5: string
  likes_count: number
  user_has_liked: boolean
  // 備註摘要（最新 5 筆）
  recent_notes?: DebtNotesSummary[]
  // 上傳者資訊
  uploader?: {
    user_id: string
    nickname: string
    business_type: string
    business_region: string
    level_info?: {
      current_level: number
      title: string
      title_color: string
      activity_points: number
    } | null
    badge_count?: number
  }
}

/**
 * 債務狀態更新請求
 */
export interface DebtStatusUpdateRequest {
  repayment_status: RepaymentStatus
  note?: string
}

/**
 * 我的債務人統計
 */
export interface MyDebtorsStats {
  total_count: number
  total_face_value: number
  by_status: {
    status: string
    count: number
    total_value: number
  }[]
  by_region: {
    region: string
    count: number
  }[]
}

/**
 * 債務記錄備註（時間軸）
 */
export interface DebtRecordNote {
  id: string
  debt_record_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

/**
 * 新增備註請求
 */
export interface CreateNoteRequest {
  content: string
}

/**
 * 更新私密欄位請求
 */
export interface UpdatePrivateFieldsRequest {
  settled_amount?: number | null
  recovered_amount?: number | null
  bad_debt_amount?: number | null
  internal_rating?: number | null
}

