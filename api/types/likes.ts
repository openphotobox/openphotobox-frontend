// Like related types

export interface Like {
  id: string
  asset: string
  user: number
  user_name?: string
  user_username?: string
  created_at: string
}

export interface LikeCreateData {
  asset: string
}

export interface LikeListParams {
  limit?: number
  cursor?: string
  asset?: string
}

