// Common API response interfaces for Django REST Framework

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

// Django REST Framework pagination format
export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// Common request interfaces
export interface PaginationParams {
  limit?: number
  offset?: number
  cursor?: string
  page?: number
  search?: string
  ordering?: string
}

// Error types
export interface ValidationError {
  field: string
  message: string
}

export interface ApiErrorResponse {
  detail?: string
  message?: string
  error?: string
  errors?: ValidationError[]
}
