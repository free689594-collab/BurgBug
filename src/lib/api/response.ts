// 統一的 API 響應格式

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

// 成功響應
export function successResponse<T>(data: T, message?: string): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  }
}

// 錯誤響應
export function errorResponse(
  code: string,
  message: string,
  details?: any
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  }
}

// 常見錯誤代碼
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  BUSINESS_ERROR: 'BUSINESS_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
} as const

