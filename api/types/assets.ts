// Asset/Photo related types

export interface Asset {
  id: string
  filename: string
  file_path?: string
  storage_url?: string
  thumbnail_url?: string
  thumbnail_urls?: {
    sm?: string
    md?: string
    lg?: string
  }
  preview_url?: string
  original_url?: string
  width?: number
  height?: number
  size?: number
  mime_type?: string
  
  // Metadata
  description?: string
  caption?: string
  taken_at?: string
  created_at: string
  updated_at: string
  
  // Relationships
  faces?: Face[]
  albums?: string[]
  tags?: string[]
  
  // Social features
  likes_count?: number
  comments_count?: number
  liked_by_user?: boolean
  likes?: string[] // Array of usernames who liked this photo
  comments?: Array<{
    id: string
    user: number
    user_name?: string
    user_username?: string
    text: string
    created_at: string
    updated_at: string
  }>
  
  // EXIF data
  exif_data?: Record<string, any>
  
  // Location
  latitude?: number
  longitude?: number
  location?: string
  
  // Search-specific fields
  similarity?: number // CLIP similarity score (for search results)
  phash?: string // Perceptual hash for duplicate detection
}

export interface Face {
  id: string
  asset: string
  person?: string | null
  person_name?: string
  person_headshot_url?: string
  
  // Bounding box (normalized 0-1)
  x: number
  y: number
  w: number
  h: number
  
  // Face metadata
  thumbnail_url?: string
  confidence?: number
  embedding?: number[]
  
  // Confirmation fields
  confirmed?: boolean
  confirmed_by?: string
  confirmed_by_username?: string
  confirmed_at?: string
  
  created_at: string
  updated_at: string
}

export interface AssetListParams {
  limit?: number
  offset?: number
  cursor?: string
  ordering?: string
  search?: string
  person_id?: string
  album_id?: string
  date?: string
  start_date?: string
  end_date?: string
  has_faces?: boolean
}

