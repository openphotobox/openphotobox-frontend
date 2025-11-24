import type { ApiClient, ApiResponse } from '../client'
import type { Album, AlbumCreateData, AlbumListParams, PaginatedResponse } from '../types'

export function createAlbumsApi(client: ApiClient) {
  return {
    // Create new album
    create: async (data: AlbumCreateData): Promise<ApiResponse<Album>> => {
      return client.post<Album>('/api/albums/', data)
    },

    // List albums with pagination
    list: async (params?: AlbumListParams): Promise<ApiResponse<PaginatedResponse<Album>>> => {
      return client.get<PaginatedResponse<Album>>('/api/albums/', params)
    },

    // Get single album by ID
    get: async (id: string): Promise<ApiResponse<Album>> => {
      return client.get<Album>(`/api/albums/${id}/`)
    },

    // Update album
    update: async (id: string, data: Partial<Album>): Promise<ApiResponse<Album>> => {
      return client.patch<Album>(`/api/albums/${id}/`, data)
    },

    // Delete album
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/albums/${id}/`)
    },

    // Add photos to album
    addPhotos: async (albumId: string, assetIds: string[]): Promise<ApiResponse<{ message: string }>> => {
      return client.post<{ message: string }>(`/api/albums/${albumId}/add_photos/`, {
        asset_ids: assetIds,
      })
    },
  }
}

