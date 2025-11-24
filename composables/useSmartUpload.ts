/**
 * Smart upload composable for local filesystem storage
 * - Direct upload to backend via multipart/form-data
 * - Simplified single-step upload process
 */

export interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
  assetId?: string
}

export const useSmartUpload = () => {
  const api = useApi()
  
  /**
   * Check if storage is properly configured before attempting uploads
   */
  const checkStorageConfiguration = async (): Promise<{ configured: boolean; message?: string }> => {
    try {
      const response = await api.storage.status()
      
      if (response.success) {
        const status = response.data
        
        if (!status.configured) {
          return { 
            configured: false, 
            message: 'Storage is not configured. Please configure a storage directory in Admin Settings before uploading photos.' 
          }
        }
        
        return { configured: true }
      } else {
        return { 
          configured: false, 
          message: response.error || 'Unable to check storage configuration.' 
        }
      }
    } catch (error) {
      return { 
        configured: false, 
        message: 'Unable to check storage configuration. Please try again or contact support.' 
      }
    }
  }
  
  /**
   * Upload a single file using direct upload to local filesystem
   */
  const uploadFile = async (
    file: File, 
    onProgress?: (progress: number) => void,
    opts?: { caption?: string; taken_at?: string; description?: string }
  ): Promise<{ assetId: string }> => {
    try {
      onProgress?.(10) // Starting upload
      
      // Create FormData with file and optional metadata
      const formData = new FormData()
      formData.append('file', file)
      
      // Add metadata if provided
      if (opts && Object.keys(opts).length > 0) {
        const metadata: Record<string, any> = {}
        if (opts.caption) metadata.caption = opts.caption
        if (opts.description) metadata.description = opts.description
        if (opts.taken_at) metadata.taken_at = opts.taken_at
        
        formData.append('metadata', JSON.stringify(metadata))
      }
      
      onProgress?.(30) // Prepared for upload
      
      // Direct upload to backend
      const result = await api.upload.uploadFile(formData)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload file')
      }
      
      onProgress?.(100)
      
      return {
        assetId: result.data.id
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      throw error
    }
  }
  
  /**
   * Upload multiple files with progress tracking
   */
  const uploadFiles = async (
    files: File[],
    onProgress?: (fileId: string, progress: number) => void,
    onFileComplete?: (fileId: string, result: { assetId: string }) => void,
    onFileError?: (fileId: string, error: string) => void,
    options?: { caption?: string; taken_at?: string; description?: string }
  ): Promise<UploadFile[]> => {
    const uploadFiles: UploadFile[] = files.map((file, index) => ({
      file,
      id: `upload-${Date.now()}-${index}`,
      progress: 0,
      status: 'pending'
    }))
    
    // Upload files in parallel (you might want to limit concurrency)
    const uploadPromises = uploadFiles.map(async (uploadFileItem) => {
      try {
        uploadFileItem.status = 'uploading'
        
        const result = await uploadFile(
          uploadFileItem.file,
          (progress) => {
            uploadFileItem.progress = progress
            onProgress?.(uploadFileItem.id, progress)
          },
          options
        )
        
        uploadFileItem.status = 'completed'
        uploadFileItem.assetId = result.assetId
        onFileComplete?.(uploadFileItem.id, result)
        
      } catch (error) {
        uploadFileItem.status = 'error'
        uploadFileItem.error = error instanceof Error ? error.message : 'Upload failed'
        onFileError?.(uploadFileItem.id, uploadFileItem.error)
      }
      
      return uploadFileItem
    })
    
    await Promise.all(uploadPromises)
    return uploadFiles
  }
  
  return {
    uploadFile,
    uploadFiles,
    checkStorageConfiguration
  }
}
