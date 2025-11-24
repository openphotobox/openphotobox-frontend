import type { ApiClient, ApiResponse } from '../client'
import type { Person, PersonCreateData, PersonUpdateData, PersonListParams, PaginatedResponse } from '../types'

export function createPeopleApi(client: ApiClient) {
  return {
    // List people with pagination
    list: async (params?: PersonListParams): Promise<ApiResponse<PaginatedResponse<Person>>> => {
      return client.get<PaginatedResponse<Person>>('/api/people/', params)
    },

    // Get single person by ID
    get: async (id: string): Promise<ApiResponse<Person>> => {
      return client.get<Person>(`/api/people/${id}/`)
    },

    // Create new person
    create: async (data: PersonCreateData): Promise<ApiResponse<Person>> => {
      return client.post<Person>('/api/people/', data)
    },

    // Update person
    update: async (id: string, data: PersonUpdateData): Promise<ApiResponse<Person>> => {
      return client.patch<Person>(`/api/people/${id}/`, data)
    },

    // Delete person
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return client.delete<void>(`/api/people/${id}/`)
    },
  }
}

