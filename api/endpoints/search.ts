import type { ApiClient, ApiResponse } from '../client'
import type { Asset, PaginatedResponse } from '../types'

export interface SearchParams {
  // Search query for CLIP semantic search
  q?: string
  
  // Filtering
  people?: string // Comma-separated person IDs
  people_mode?: 'all' | 'any' // Default: 'all'
  albums?: string // Comma-separated album IDs
  
  // Date filtering
  start_date?: string // ISO date string (YYYY-MM-DD)
  end_date?: string // ISO date string (YYYY-MM-DD)
  
  // Other filters
  visibility?: 'shared' | 'private'
  
  // Pagination
  limit?: number
  offset?: number
}

export interface SearchResult {
  results: Asset[]
  count: number
}

export function createSearchApi(client: ApiClient) {
  return {
    /**
     * General search endpoint supporting:
     * - Semantic CLIP search with text queries
     * - People-only filtering (when no query provided)
     * - Album filtering
     * - Date range filtering
     * 
     * Returns full asset objects with thumbnails, likes, comments, etc.
     */
    search: async (params: SearchParams): Promise<ApiResponse<SearchResult>> => {
      return client.get<SearchResult>('/api/metadata/search/', params)
    },
  }
}

