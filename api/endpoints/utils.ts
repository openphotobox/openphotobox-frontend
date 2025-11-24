import type { ApiClient, ApiResponse } from '../client'

// Utility to create dynamic endpoint functions
// Used for custom or less common endpoints (faces, merge, etc.)
export function createUtilsApi(client: ApiClient) {
  return {
    // Create a dynamic endpoint function
    createEndpoint: <TResponse = any>(method: 'get' | 'post' | 'put' | 'patch' | 'delete', path: string) => {
      return async (data?: any, params?: Record<string, any>): Promise<ApiResponse<TResponse>> => {
        switch (method) {
          case 'get':
            return client.get<TResponse>(path, params || data)
          case 'post':
            return client.post<TResponse>(path, data)
          case 'put':
            return client.put<TResponse>(path, data)
          case 'patch':
            return client.patch<TResponse>(path, data)
          case 'delete':
            return client.delete<TResponse>(path)
          default:
            throw new Error(`Unsupported method: ${method}`)
        }
      }
    },
  }
}

