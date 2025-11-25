// Main composable to access the API client and endpoints
// Replaces the old useGeneratedApi composable

import { createApiClient } from '@/api/client'
import { createAssetsApi } from '@/api/endpoints/assets'
import { createAlbumsApi } from '@/api/endpoints/albums'
import { createPeopleApi } from '@/api/endpoints/people'
import { createFacesApi } from '@/api/endpoints/faces'
import { createUtilsApi } from '@/api/endpoints/utils'
import { createSetupApi } from '@/api/endpoints/setup'
import { createStorageApi } from '@/api/endpoints/storage'
import { createUploadApi } from '@/api/endpoints/upload'
import { createUsersApi } from '@/api/endpoints/users'
import { createCommentsApi } from '@/api/endpoints/comments'
import { createLikesApi } from '@/api/endpoints/likes'

function createApi() {
  // Get runtime config for API base URL
  // This is called fresh each time to ensure runtime env vars are picked up
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
  const faces = createFacesApi(client)
  const utils = createUtilsApi(client)
  const setup = createSetupApi(client)
  const storage = createStorageApi(client)
  const upload = createUploadApi(client)
  const users = createUsersApi(client)
  const comments = createCommentsApi(client)
  const likes = createLikesApi(client)
  
  return {
    assets,
    albums,
    people,
    faces,
    utils,
    setup,
    storage,
    upload,
    users,
    comments,
    likes,
    client,
  }
}

// Cached instance per runtime context
let apiInstance: ReturnType<typeof createApi> | null = null

export function useApi() {
  // Create instance once per app lifecycle
  // useRuntimeConfig() will have the correct runtime values
  if (!apiInstance) {
    apiInstance = createApi()
  }
  return apiInstance
}

// Legacy export for backwards compatibility
export const useGeneratedApi = useApi
