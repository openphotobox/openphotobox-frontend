// Album related types

export interface Album {
  id: string
  name?: string
  title?: string
  description?: string
  cover_url?: string
  cover_photo?: string
  photo_count?: number
  
  created_at: string
  updated_at: string
  created_by?: string
  
  // Optional fields
  is_public?: boolean
  slug?: string
}

export interface AlbumCreateData {
  title: string
  name?: string
  description?: string
  cover_photo?: string
}

export interface AlbumUpdateData {
  title?: string
  name?: string
  description?: string
  cover_photo?: string
}

export interface AlbumListParams {
  limit?: number
  offset?: number
  search?: string
  ordering?: string
}

