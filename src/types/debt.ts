/**
 * 債務記錄相關類型定義
 */

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
  repayment_status: '待觀察' | '正常' | '結清' | '議價結清' | '代償' | '疲勞' | '呆帳'
  note?: string | null
  uploaded_by: string
  created_at: string
  updated_at?: string | null
  debtor_id_first_letter: string
  debtor_id_last5: string
  admin_edited_by?: string | null
  admin_edit_reason?: string | null
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
  repayment_status: '待觀察' | '正常' | '結清' | '議價結清' | '代償' | '疲勞' | '呆帳'
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
  // 上傳者資訊
  uploader?: {
    nickname: string
    business_type: string
    business_region: string
  }
}

/**
 * 債務狀態更新請求
 */
export interface DebtStatusUpdateRequest {
  repayment_status: '待觀察' | '正常' | '結清' | '議價結清' | '代償' | '疲勞' | '呆帳'
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

