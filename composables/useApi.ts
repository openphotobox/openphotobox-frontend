// Main composable to access the API client and endpoints
// Replaces the old useGeneratedApi composable

import { createApiClient } from '@/api/client'
import { createAssetsApi } from '@/api/endpoints/assets'
import { createAlbumsApi } from '@/api/endpoints/albums'
import { createPeopleApi } from '@/api/endpoints/people'
import { createUtilsApi } from '@/api/endpoints/utils'
import { createSetupApi } from '@/api/endpoints/setup'
import { createStorageApi } from '@/api/endpoints/storage'
import { createUploadApi } from '@/api/endpoints/upload'

let apiInstance: ReturnType<typeof createApi> | null = null

function createApi() {
  // Get runtime config for API base URL
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBase as string
  
  // Create client with token getter
  const getToken = () => {
    if (process.client) {
      return localStorage.getItem('auth-token')
    }
    return null
  }
  
  const client = createApiClient(baseUrl, getToken)
  
  // Create endpoint APIs
  const assets = createAssetsApi(client)
  const albums = createAlbumsApi(client)
  const people = createPeopleApi(client)
  const utils = createUtilsApi(client)
  const setup = createSetupApi(client)
  const storage = createStorageApi(client)
  const upload = createUploadApi(client)
  
  return {
    assets,
    albums,
    people,
    utils,
    setup,
    storage,
    upload,
    client,
  }
}

export function useApi() {
  // Create singleton instance
  if (!apiInstance) {
    apiInstance = createApi()
  }
  return apiInstance
}

// Legacy export for backwards compatibility
export const useGeneratedApi = useApi
