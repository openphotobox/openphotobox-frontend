import type { ApiClient, ApiResponse } from '../client'
import type { 
  Face, 
  FaceAssignData, 
  FaceUnassignData, 
  FaceManualCreateData,
  FaceBulkConfirmData,
  FaceBulkConfirmResponse,
  PaginatedResponse 
} from '../types'

export function createFacesApi(client: ApiClient) {
  return {
    // Get candidate faces for a person
    getCandidates: async (personId: string, params?: { limit?: number; offset?: number }): Promise<ApiResponse<PaginatedResponse<Face>>> => {
      return client.get<PaginatedResponse<Face>>(`/api/people/${personId}/candidate-faces/`, params)
    },

    // Bulk confirm faces
    bulkConfirm: async (data: FaceBulkConfirmData): Promise<ApiResponse<FaceBulkConfirmResponse>> => {
      return client.post<FaceBulkConfirmResponse>('/api/people/faces/bulk-confirm/', data)
    },

    // Assign faces to a person
    assign: async (data: FaceAssignData): Promise<ApiResponse<{ message: string }>> => {
      return client.post<{ message: string }>('/api/people/faces/assign/', data)
    },

    // Unassign faces from a person
    unassign: async (data: FaceUnassignData): Promise<ApiResponse<{ message: string }>> => {
      return client.post<{ message: string }>('/api/people/faces/unassign/', data)
    },

    // Manually create a face
    manualCreate: async (data: FaceManualCreateData): Promise<ApiResponse<Face>> => {
      return client.post<Face>('/api/people/faces/manual-create/', data)
    },

    // Get face details
    get: async (faceId: string): Promise<ApiResponse<Face>> => {
      return client.get<Face>(`/api/people/faces/${faceId}/`)
    },
  }
}

