import type { ApiClient, ApiResponse } from '../client'
import type { User, UserCreateData, UserUpdateData, UserListParams } from '../types/users'
import type { PaginatedResponse } from '../types'

export function createUsersApi(client: ApiClient) {
  return {
    // List all users (admin only)
    list: async (params?: UserListParams): Promise<ApiResponse<User[]>> => {
      return client.get<User[]>('/api/admin/users/', params)
    },

    // Create new user (admin only)
    create: async (data: UserCreateData): Promise<ApiResponse<User>> => {
      return client.post<User>('/api/admin/users/', data)
    },

    // Get single user by ID
    get: async (userId: number): Promise<ApiResponse<User>> => {
      return client.get<User>(`/api/admin/users/${userId}/`)
    },

    // Update user (admin only)
    update: async (userId: number, data: UserUpdateData): Promise<ApiResponse<User>> => {
      return client.patch<User>(`/api/admin/users/${userId}/`, data)
    },

    // Delete user (admin only)
    delete: async (userId: number): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/admin/users/${userId}/delete/`)
    },
  }
}

