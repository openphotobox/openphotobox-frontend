# API Client

This directory contains the manually managed API client for the OpenPhotoBox web application.

## Structure

```
api/
├── client.ts          # Fetch-based API client with Django Token auth
├── types.ts           # Main types export (re-exports from types/)
├── index.ts           # Main exports
├── types/             # Organized TypeScript interfaces
│   ├── index.ts       # Re-exports all type modules
│   ├── common.ts      # Common API response/request types (DRF pagination)
│   ├── assets.ts      # Asset/Photo-related types
│   ├── albums.ts      # Album-related types
│   ├── people.ts      # Person-related types
│   └── faces.ts       # Face-related types
└── endpoints/         # API endpoint modules
    ├── assets.ts      # Asset management endpoints
    ├── albums.ts      # Album management endpoints
    ├── people.ts      # People management endpoints
    ├── setup.ts       # Setup endpoints
    └── utils.ts       # Utility for creating dynamic endpoints

composables/
└── useApi.ts          # Vue composable that provides API access
```

## Configuration

### Environment Variables

The API base URL is configured via Nuxt runtime config in `nuxt.config.ts`:

```typescript
runtimeConfig: {
  public: {
    apiBase: process.env.API_BASE || 'http://localhost:8000'
  }
}
```

Set the `API_BASE` environment variable:

```env
API_BASE=http://localhost:8000
```

### Features

- **Fetch-based HTTP client** - Native browser API, no dependencies
- **Django REST Framework support** - Token authentication, DRF pagination format
- **Response wrapper** - All responses wrapped in `{ success, data, error }` format
- **Automatic token attachment** - Reads from localStorage 'auth-token'
- **Error handling** - Centralized error handling with proper error messages
- **File uploads** - Dedicated upload method for multipart/form-data
- **TypeScript support** - Full type safety for all API calls
- **Dynamic endpoints** - Utils API for creating custom endpoint functions

## Usage

### In Vue Components (Recommended)

The `useApi()` composable is the primary way to access the API:

```vue
<script setup lang="ts">
const api = useApi()

// Use endpoint APIs
const loadPhotos = async () => {
  const response = await api.assets.list({ limit: 50 })
  if (response.success) {
    photos.value = response.data.results
  } else {
    console.error(response.error)
  }
}

// Use albums API
const createAlbum = async () => {
  const response = await api.albums.create({
    title: 'My Album',
    description: 'Album description'
  })
  if (response.success) {
    console.log('Album created:', response.data)
  }
}

// Direct client access for custom endpoints
const customCall = async () => {
  const response = await api.client.get('/api/custom/endpoint/')
}

// Dynamic endpoint creation for less common calls
const faceAssign = async (faceIds, personId) => {
  const endpoint = api.utils.createEndpoint('post', '/api/people/faces/assign/')
  const response = await endpoint({ face_ids: faceIds, person_id: personId })
}
</script>
```

### Available Endpoint APIs

#### Assets API (`api.assets`)

```typescript
// List assets with pagination and filters
const response = await api.assets.list({
  limit: 50,
  offset: 0,
  person_id: 'abc123',
  album_id: 'xyz789',
  ordering: '-taken_at'
})

// Get single asset
const response = await api.assets.get('asset-id')

// Delete asset
const response = await api.assets.delete('asset-id')
```

#### Albums API (`api.albums`)

```typescript
// Create album
const response = await api.albums.create({
  title: 'Summer Vacation',
  description: 'Photos from our trip'
})

// List albums
const response = await api.albums.list({ limit: 100 })

// Get album
const response = await api.albums.get('album-id')

// Update album
const response = await api.albums.update('album-id', {
  title: 'Updated Title'
})

// Add photos to album
const response = await api.albums.addPhotos('album-id', ['asset-1', 'asset-2'])

// Delete album
const response = await api.albums.delete('album-id')
```

#### People API (`api.people`)

```typescript
// List people
const response = await api.people.list({ limit: 50, search: 'John' })

// Get person
const response = await api.people.get('person-id')

// Create person
const response = await api.people.create({
  display_name: 'John Doe',
  aka: ['Johnny', 'JD'],
  notes: 'Family friend'
})

// Update person
const response = await api.people.update('person-id', {
  display_name: 'Jonathan Doe'
})

// Delete person
const response = await api.people.delete('person-id')
```

#### Setup API (`api.setup`)

```typescript
// Check if setup is needed
const response = await api.setup.check()

// Create first admin user
const response = await api.setup.createAdmin({
  username: 'admin',
  email: 'admin@example.com',
  password: 'securepassword',
  confirm_password: 'securepassword'
})
```

#### Utils API (`api.utils`)

For custom or dynamic endpoints:

```typescript
// Create a dynamic endpoint function
const endpoint = api.utils.createEndpoint<ResponseType>('post', '/api/custom/path/')

// Call it with data
const response = await endpoint({ key: 'value' })

// GET with params
const getEndpoint = api.utils.createEndpoint('get', '/api/data/')
const response = await getEndpoint(undefined, { search: 'query' })
```

### Direct Client Access (`api.client`)

For full control, use the client directly:

```typescript
const api = useApi()

// GET request
const response = await api.client.get('/api/endpoint/', { param: 'value' })

// POST request
const response = await api.client.post('/api/endpoint/', { data: 'value' })

// PUT request
const response = await api.client.put('/api/endpoint/', { data: 'value' })

// PATCH request
const response = await api.client.patch('/api/endpoint/', { data: 'value' })

// DELETE request
const response = await api.client.delete('/api/endpoint/')

// File upload
const formData = new FormData()
formData.append('file', file)
const response = await api.client.upload('/api/upload/', formData)
```

## Response Format

All API calls return a response in this format:

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### Success Response

```typescript
{
  success: true,
  data: { /* your data */ }
}
```

### Error Response

```typescript
{
  success: false,
  error: "Error message from server",
  data: { /* optional error details */ }
}
```

### Django REST Framework Pagination

DRF paginated responses have this structure:

```typescript
{
  success: true,
  data: {
    count: 100,
    next: "http://api/endpoint/?cursor=abc123",
    previous: null,
    results: [ /* array of items */ ]
  }
}
```

## Authentication

The API client uses Django Token authentication:

- **Header Format**: `Authorization: Token <token>`
- **Storage**: Token stored in `localStorage` as `'auth-token'`
- **Automatic Attachment**: Token automatically added to all requests

### Setting the Token

```typescript
// After login, store the token
localStorage.setItem('auth-token', token)

// Clear on logout
localStorage.removeItem('auth-token')
```

The API client will automatically pick up the token for subsequent requests.

## Adding New Endpoints

1. **Define types** in `api/types/`:

```typescript
// api/types/myResource.ts
export interface MyResource {
  id: string
  name: string
  // ... other fields
}
```

2. **Export from** `api/types/index.ts`:

```typescript
export * from './myResource'
```

3. **Create endpoint module** in `api/endpoints/myResource.ts`:

```typescript
import type { ApiClient, ApiResponse } from '../client'
import type { MyResource, PaginatedResponse } from '../types'

export function createMyResourceApi(client: ApiClient) {
  return {
    list: async (): Promise<ApiResponse<PaginatedResponse<MyResource>>> => {
      return client.get<PaginatedResponse<MyResource>>('/api/my-resources/')
    },
    
    get: async (id: string): Promise<ApiResponse<MyResource>> => {
      return client.get<MyResource>(`/api/my-resources/${id}/`)
    },
    
    create: async (data: Partial<MyResource>): Promise<ApiResponse<MyResource>> => {
      return client.post<MyResource>('/api/my-resources/', data)
    },
  }
}
```

4. **Add to** `api/index.ts`:

```typescript
export { createMyResourceApi } from './endpoints/myResource'
```

5. **Add to composable** in `composables/useApi.ts`:

```typescript
import { createMyResourceApi } from '@/api/endpoints/myResource'

function createApi() {
  // ... existing code ...
  const myResource = createMyResourceApi(client)
  
  return {
    // ... existing endpoints ...
    myResource,
  }
}
```

## Examples

### Loading Paginated Data

```vue
<script setup>
const api = useApi()
const photos = ref([])
const cursor = ref(null)

const loadMore = async () => {
  const response = await api.assets.list({
    limit: 50,
    cursor: cursor.value
  })
  
  if (response.success) {
    photos.value.push(...response.data.results)
    cursor.value = response.data.next
  }
}
</script>
```

### Creating Resources

```vue
<script setup>
const api = useApi()

const createNewAlbum = async (title: string) => {
  const response = await api.albums.create({ title })
  
  if (response.success) {
    console.log('Created album:', response.data)
    return response.data
  } else {
    console.error('Failed:', response.error)
    throw new Error(response.error)
  }
}
</script>
```

### Using Dynamic Endpoints

```vue
<script setup>
const api = useApi()

// For face-related operations not in the main APIs
const assignFace = async (faceId: string, personId: string) => {
  const endpoint = api.utils.createEndpoint('post', '/api/people/faces/assign/')
  const response = await endpoint({
    face_ids: [faceId],
    person_id: personId
  })
  
  if (response.success) {
    console.log('Face assigned successfully')
  }
}
</script>
```

## Migration from Generated API

This API structure replaced the auto-generated API client. The key changes:

- **Composable**: `useGeneratedApi()` → `useApi()`
- **Client**: Fetch-based instead of auto-generated
- **Response format**: Maintained `{ success, data, error }` wrapper
- **Auth**: Django Token auth (`Token` prefix)
- **Types**: Manually maintained, DRF-specific interfaces

The old `useGeneratedApi` is exported as an alias to `useApi` for backwards compatibility during transition.
