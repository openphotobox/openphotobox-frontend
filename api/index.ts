// Main API client
export { createApiClient, ApiClient } from './client'
export type { ApiResponse, ApiConfig } from './client'

// Types - export from reorganized structure
export * from './types'

// Endpoint factories
export { createAssetsApi } from './endpoints/assets'
export { createAlbumsApi } from './endpoints/albums'
export { createPeopleApi } from './endpoints/people'
export { createFacesApi } from './endpoints/faces'
export { createUtilsApi } from './endpoints/utils'
export { createSetupApi } from './endpoints/setup'
export { createStorageApi } from './endpoints/storage'
export { createUploadApi } from './endpoints/upload'
