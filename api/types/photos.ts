// Photo/Media related types
export interface Photo {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl?: string
  metadata?: PhotoMetadata
  createdAt: string
  updatedAt: string
}

export interface PhotoMetadata {
  width: number
  height: number
  exif?: Record<string, any>
  location?: {
    latitude: number
    longitude: number
  }
}

export interface UploadResponse {
  photo: Photo
  message: string
}
