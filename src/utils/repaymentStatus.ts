/**
 * 還款狀況工具函數
 * 統一處理還款狀況的顏色、風險等級和顯示文字
 */

/**
 * 還款狀況類型
 */
export type RepaymentStatus = '待觀察' | '正常' | '結清' | '疲勞' | '呆帳'

/**
 * 風險等級
 */
export type RiskLevel = 'unknown' | 'low' | 'settled' | 'high' | 'critical'

/**
 * 還款狀況配置
 */
interface RepaymentStatusConfig {
  label: string
  riskLevel: RiskLevel
  riskText: string
  // Tailwind 類別（用於深色主題）
  bgClass: string
  textClass: string
  borderClass?: string
  // Tailwind 類別（用於淺色主題 - 管理員後台）
  lightBgClass: string
  lightTextClass: string
}

/**
 * 還款狀況配置表
 */
const REPAYMENT_STATUS_CONFIG: Record<RepaymentStatus, RepaymentStatusConfig> = {
  '待觀察': {
    label: '待觀察',
    riskLevel: 'unknown',
    riskText: '風險未知',
    bgClass: 'bg-gray-500/20',
    textClass: 'text-gray-400',
    borderClass: 'border-gray-500/50',
    lightBgClass: 'bg-gray-100',
    lightTextClass: 'text-gray-800'
  },
  '正常': {
    label: '正常',
    riskLevel: 'low',
    riskText: '風險低',
    bgClass: 'bg-green-500/20',
    textClass: 'text-green-400',
    borderClass: 'border-green-500/50',
    lightBgClass: 'bg-green-100',
    lightTextClass: 'text-green-800'
  },
  '結清': {
    label: '結清',
    riskLevel: 'settled',
    riskText: '已結清',
    bgClass: 'bg-blue-500/20',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/50',
    lightBgClass: 'bg-blue-100',
    lightTextClass: 'text-blue-800'
  },
  '疲勞': {
    label: '疲勞',
    riskLevel: 'high',
    riskText: '高風險（常拖、常談）',
    bgClass: 'bg-orange-500/20',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/50',
    lightBgClass: 'bg-orange-100',
    lightTextClass: 'text-orange-800'
  },
  '呆帳': {
    label: '呆帳',
    riskLevel: 'critical',
    riskText: '極高風險',
    bgClass: 'bg-red-500/20',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/50',
    lightBgClass: 'bg-red-100',
    lightTextClass: 'text-red-800'
  }
}

/**
 * 所有還款狀況選項（按風險等級排序）
 */
export const REPAYMENT_STATUS_OPTIONS: RepaymentStatus[] = [
  '待觀察',
  '正常',
  '結清',
  '疲勞',
  '呆帳'
]

/**
 * 取得還款狀況配置
 */
export function getRepaymentStatusConfig(status: string): RepaymentStatusConfig {
  // 處理舊資料的映射
  const normalizedStatus = normalizeRepaymentStatus(status)
  return REPAYMENT_STATUS_CONFIG[normalizedStatus] || REPAYMENT_STATUS_CONFIG['待觀察']
}

/**
 * 標準化還款狀況（處理舊資料）
 * 將舊的 7 種狀況映射到新的 5 種
 */
export function normalizeRepaymentStatus(status: string): RepaymentStatus {
  // 舊資料映射規則：
  // - '議價結清' → '結清'
  // - '代償' → '結清'
  // - 其他保持不變
  switch (status) {
    case '議價結清':
    case '代償':
      return '結清'
    case '待觀察':
    case '正常':
    case '結清':
    case '疲勞':
    case '呆帳':
      return status as RepaymentStatus
    default:
      return '待觀察'
  }
}

/**
 * 取得還款狀況的 Tailwind 類別（深色主題）
 */
export function getRepaymentStatusClasses(status: string): string {
  const config = getRepaymentStatusConfig(status)
  return `${config.bgClass} ${config.textClass}`
}

/**
 * 取得還款狀況的 Tailwind 類別（淺色主題 - 管理員後台）
 */
export function getRepaymentStatusLightClasses(status: string): string {
  const config = getRepaymentStatusConfig(status)
  return `${config.lightBgClass} ${config.lightTextClass}`
}

/**
 * 取得還款狀況的風險等級
 */
export function getRepaymentStatusRiskLevel(status: string): RiskLevel {
  const config = getRepaymentStatusConfig(status)
  return config.riskLevel
}

/**
 * 取得還款狀況的風險文字
 */
export function getRepaymentStatusRiskText(status: string): string {
  const config = getRepaymentStatusConfig(status)
  return config.riskText
}

/**
 * 取得還款狀況的顯示標籤
 */
export function getRepaymentStatusLabel(status: string): string {
  const config = getRepaymentStatusConfig(status)
  return config.label
}

/**
 * 檢查是否為已結清狀態
 */
export function isSettledStatus(status: string): boolean {
  const normalizedStatus = normalizeRepaymentStatus(status)
  return normalizedStatus === '結清'
}

/**
 * 檢查是否為高風險狀態
 */
export function isHighRiskStatus(status: string): boolean {
  const riskLevel = getRepaymentStatusRiskLevel(status)
  return riskLevel === 'high' || riskLevel === 'critical'
}

/**
 * 取得還款狀況的完整顯示資訊
 */
export function getRepaymentStatusDisplay(status: string) {
  const config = getRepaymentStatusConfig(status)
  const normalizedStatus = normalizeRepaymentStatus(status)
  
  return {
    status: normalizedStatus,
    label: config.label,
    riskLevel: config.riskLevel,
    riskText: config.riskText,
    classes: {
      dark: `${config.bgClass} ${config.textClass}`,
      light: `${config.lightBgClass} ${config.lightTextClass}`,
      border: config.borderClass
    }
  }
}

