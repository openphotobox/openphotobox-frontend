// Album related types

export interface SharedUser {
  id: string
  user_id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  permission_level: 'view' | 'contribute'
  shared_at: string
  avatar_url?: string
}

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
  owner?: string
  owner_username?: string
  
  // Sharing and permissions
  is_owner?: boolean
  can_contribute?: boolean
  shared_with?: SharedUser[]
  
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

export interface AlbumShareData {
  user_id: string
  permission_level: 'view' | 'contribute'
}

export interface AlbumUnshareData {
  user_id: string
}

