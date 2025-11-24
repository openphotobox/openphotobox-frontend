import type { ApiClient, ApiResponse } from '../client'
import type { Asset } from '../types/assets'

export interface UploadFileResponse {
  id: string
  sha256: string
  storage_url: string
  width?: number
  height?: number
  mime_type: string
  taken_at?: string
  thumbnail_urls?: {
    sm?: string
    md?: string
    lg?: string
  }
  [key: string]: any
}

export interface UploadMetadata {
  taken_at?: string
  description?: string
  caption?: string
  [key: string]: any
}

export function createUploadApi(client: ApiClient) {
  return {
    // Direct file upload to local filesystem
    uploadFile: async (
      formData: FormData
    ): Promise<ApiResponse<UploadFileResponse>> => {
      return client.upload<UploadFileResponse>('/api/assets/upload_file/', formData)
    },
  }
}

