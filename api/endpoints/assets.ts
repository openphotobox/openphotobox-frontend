import type { ApiClient, ApiResponse } from '../client'
import type { Asset, AssetListParams, PaginatedResponse } from '../types'

export function createAssetsApi(client: ApiClient) {
  return {
    // List assets with pagination
    list: async (params?: AssetListParams): Promise<ApiResponse<PaginatedResponse<Asset>>> => {
      return client.get<PaginatedResponse<Asset>>('/api/assets/', params)
    },

    // Get single asset by ID
    get: async (id: string): Promise<ApiResponse<Asset>> => {
      return client.get<Asset>(`/api/assets/${id}/`)
    },

    // Delete asset
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/assets/${id}/`)
    },
  }
}

