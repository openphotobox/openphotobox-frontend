// Comment related types

export interface Comment {
  id: string
  asset: string
  user: number
  user_name?: string
  user_username?: string
  content: string
  created_at: string
  updated_at: string
}

export interface CommentCreateData {
  asset: string
  content: string
}

export interface CommentUpdateData {
  content: string
}

export interface CommentListParams {
  limit?: number
  cursor?: string
  asset?: string
}

