import type { ApiClient, ApiResponse } from '../client'

export interface StorageStatus {
  configured: boolean
  path: string | null
}

export interface StorageSetupData {
  path: string
}

export interface StorageSetupResponse {
  success: boolean
  path: string
  message: string
}

export interface StorageSetupError {
  error: string
  details?: string
  current_path?: string
  requested_path?: string
  asset_count?: number
}

export function createStorageApi(client: ApiClient) {
  return {
    // Get storage status
    status: async (): Promise<ApiResponse<StorageStatus>> => {
      return client.get<StorageStatus>('/api/assets/storage/status/')
    },

    // Setup storage (creates backend, buckets, and directory structure)
    setup: async (data: StorageSetupData): Promise<ApiResponse<StorageSetupResponse>> => {
      return client.post<StorageSetupResponse>('/api/assets/storage/setup/', data)
    },
  }
}

