// Face related types (separate from assets for clarity)

export interface FaceAssignData {
  face_ids: string[]
  person_id: string
}

export interface FaceUnassignData {
  face_ids: string[]
}

export interface FaceManualCreateData {
  asset_id: string
  x: number
  y: number
  w: number
  h: number
  person_id?: string
}

export interface FaceCandidate {
  person_id: string
  person_name: string
  confidence: number
  headshot_url?: string
}

export interface FaceBulkConfirmData {
  face_ids: string[]
}

export interface FaceBulkConfirmResponse {
  updated: number
}

