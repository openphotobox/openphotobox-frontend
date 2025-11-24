// Fetch-based API client for Django REST Framework backend

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

export interface ApiConfig {
  baseUrl: string
  getToken: () => string | null
}

export class ApiClient {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }
    
    // Add Django Token auth if available
    const token = this.config.getToken()
    if (token) {
      headers['Authorization'] = `Token ${token}`
    }
    
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      let data: any
      const contentType = response.headers.get('content-type')
      
      // Parse response body if present
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json()
        } catch {
          data = null
        }
      } else if (response.status === 204) {
        // No content response (e.g., successful DELETE)
        data = null
      } else {
        try {
          data = await response.text()
        } catch {
          data = null
        }
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || data?.message || data?.error || `Request failed: ${response.status} ${response.statusText}`,
          data: data,
        }
      }

      return {
        success: true,
        data: data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error',
      }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`
      }
    }
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`
    
    const headers: Record<string, string> = {}
    
    // Add Django Token auth if available
    const token = this.config.getToken()
    if (token) {
      headers['Authorization'] = `Token ${token}`
    }
    
    // Don't set Content-Type for FormData, let browser set it with boundary
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
      })

      let data: any
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        return {
          success: false,
          error: data?.detail || data?.message || `Upload failed: ${response.status} ${response.statusText}`,
          data: data,
        }
      }

      return {
        success: true,
        data: data,
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Upload failed',
      }
    }
  }
}

// Factory function to create API client instance
// Will be initialized in the composable with runtime config
export function createApiClient(baseUrl: string, getToken: () => string | null): ApiClient {
  return new ApiClient({ baseUrl, getToken })
}
