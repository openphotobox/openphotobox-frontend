// People/Person related types

export interface Person {
  id: string
  display_name: string
  aka?: string[]
  notes?: string
  
  // Metadata
  headshot_url?: string
  face_count?: number
  photo_count?: number
  candidate_count?: number
  
  created_at: string
  updated_at: string
}

export interface PersonCreateData {
  display_name: string
  aka?: string[]
  notes?: string
}

export interface PersonUpdateData {
  display_name?: string
  aka?: string[]
  notes?: string
}

export interface PersonListParams {
  limit?: number
  offset?: number
  search?: string
  ordering?: string
  has_faces?: boolean
}

export interface PersonMergeData {
  source_person_ids: string[]
  delete_source_persons?: boolean
}

