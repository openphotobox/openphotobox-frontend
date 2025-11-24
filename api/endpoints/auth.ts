import type {
  LoginCredentials,
  RegisterData,
  AuthResponse,
  User,
} from '../types/auth'
import type { ApiResponse } from '../types/common'
import { apiClient } from '../client'

export const authApi = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials)
    return response.data
  },

  // Register new user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData)
    return response.data
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/profile')
    return response.data
  },

  // Refresh auth token
  refreshToken: async (refreshToken: string): Promise<{ token: string }> => {
    const response = await apiClient.post<ApiResponse<{ token: string }>>('/auth/refresh', {
      refreshToken
    })
    return response.data
  },

  // Logout user
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
    localStorage.removeItem('auth-token')
  },

  // Update user profile
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>('/auth/profile', userData)
    return response.data
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    })
  },

  // Request password reset
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email })
  },

  // Reset password with token
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword
    })
  }
}
