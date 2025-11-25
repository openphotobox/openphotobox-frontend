import type { ApiClient, ApiResponse } from '../client'
import type { Like, LikeCreateData, LikeListParams, PaginatedResponse } from '../types'

export function createLikesApi(client: ApiClient) {
  return {
    // List likes with pagination
    list: async (params?: LikeListParams): Promise<ApiResponse<PaginatedResponse<Like>>> => {
      return client.get<PaginatedResponse<Like>>('/api/assets/likes/', params)
    },

    // Get single like by ID
    get: async (id: string): Promise<ApiResponse<Like>> => {
      return client.get<Like>(`/api/assets/likes/${id}/`)
    },

    // Create new like
    create: async (data: LikeCreateData): Promise<ApiResponse<Like>> => {
      return client.post<Like>('/api/assets/likes/', data)
    },

    // Delete like (unlike)
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/assets/likes/${id}/`)
    },

    // Get liked photos for current user
    getLikedPhotos: async (params?: { limit?: number; cursor?: string }): Promise<ApiResponse<any>> => {
      return client.get('/api/assets/liked/', params)
    },
  }
}

