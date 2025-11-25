import type { ApiClient, ApiResponse } from '../client'
import type { Comment, CommentCreateData, CommentUpdateData, CommentListParams, PaginatedResponse } from '../types'

export function createCommentsApi(client: ApiClient) {
  return {
    // List comments with pagination
    list: async (params?: CommentListParams): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
      return client.get<PaginatedResponse<Comment>>('/api/assets/comments/', params)
    },

    // Get single comment by ID
    get: async (id: string): Promise<ApiResponse<Comment>> => {
      return client.get<Comment>(`/api/assets/comments/${id}/`)
    },

    // Create new comment
    create: async (data: CommentCreateData): Promise<ApiResponse<Comment>> => {
      return client.post<Comment>('/api/assets/comments/', data)
    },

    // Update comment
    update: async (id: string, data: CommentUpdateData): Promise<ApiResponse<Comment>> => {
      return client.patch<Comment>(`/api/assets/comments/${id}/`, data)
    },

    // Delete comment
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/assets/comments/${id}/`)
    },
  }
}

