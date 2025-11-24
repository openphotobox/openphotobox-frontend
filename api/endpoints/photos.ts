import { apiClient } from '../client'
import type {
  Photo,
  UploadResponse,
} from '../types/photos'
import type {
  PaginatedResponse,
  PaginationParams,
  ApiResponse
} from '../types/common'

export const photosApi = {
  // Get all photos with pagination
  getPhotos: async (params?: PaginationParams): Promise<PaginatedResponse<Photo>> => {
    const response = await apiClient.get<PaginatedResponse<Photo>>('/photos', { params })
    return response
  },

  // Get single photo by ID
  getPhoto: async (id: string): Promise<Photo> => {
    const response = await apiClient.get<ApiResponse<Photo>>(`/photos/${id}`)
    return response.data
  },

  // Upload single photo
  uploadPhoto: async (file: File, metadata?: Record<string, any>): Promise<Photo> => {
    const formData = new FormData()
    formData.append('photo', file)

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const response = await apiClient.upload<UploadResponse>('/photos/upload', formData)
    return response.photo
  },

  // Upload multiple photos
  uploadPhotos: async (files: File[], metadata?: Record<string, any>): Promise<Photo[]> => {
    const formData = new FormData()

    files.forEach((file) => {
      formData.append('photos', file)
    })

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata))
    }

    const response = await apiClient.upload<{ photos: Photo[] }>('/photos/upload/bulk', formData)
    return response.photos
  },

  // Update photo metadata
  updatePhoto: async (id: string, updates: Partial<Photo>): Promise<Photo> => {
    const response = await apiClient.put<ApiResponse<Photo>>(`/photos/${id}`, updates)
    return response.data
  },

  // Delete photo
  deletePhoto: async (id: string): Promise<void> => {
    await apiClient.delete(`/photos/${id}`)
  },

  // Delete multiple photos
  deletePhotos: async (ids: string[]): Promise<void> => {
    await apiClient.delete('/photos/bulk', { data: { ids } })
  },

  // Search photos
  searchPhotos: async (query: string, params?: PaginationParams): Promise<PaginatedResponse<Photo>> => {
    const searchParams = { ...params, search: query }
    const response = await apiClient.get<PaginatedResponse<Photo>>('/photos/search', {
      params: searchParams
    })
    return response
  },

  // Get photos by user
  getUserPhotos: async (userId: string, params?: PaginationParams): Promise<PaginatedResponse<Photo>> => {
    const response = await apiClient.get<PaginatedResponse<Photo>>(`/users/${userId}/photos`, {
      params
    })
    return response
  },

  // Get photo download URL (for private photos)
  getDownloadUrl: async (id: string): Promise<{ url: string }> => {
    const response = await apiClient.get<ApiResponse<{ url: string }>>(`/photos/${id}/download`)
    return response.data
  }
}
