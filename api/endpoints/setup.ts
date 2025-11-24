import type { ApiClient, ApiResponse } from '../client'

export interface SetupCheckResponse {
  needs_setup: boolean
  configured: boolean
}

export interface CreateAdminData {
  username: string
  email: string
  password: string
  confirm_password: string
}

export interface CreateAdminResponse {
  user: {
    id: string
    username: string
    email: string
  }
  token: string
}

export function createSetupApi(client: ApiClient) {
  return {
    // Check if setup is needed
    check: async (): Promise<ApiResponse<SetupCheckResponse>> => {
      return client.get<SetupCheckResponse>('/api/setup/check/')
    },

    // Create first admin user
    createAdmin: async (data: CreateAdminData): Promise<ApiResponse<CreateAdminResponse>> => {
      return client.post<CreateAdminResponse>('/api/setup/create-admin/', data)
    },
  }
}

