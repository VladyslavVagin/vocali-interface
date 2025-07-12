export interface AudioFile {
    userId: string
    fileKey: string
    fileName: string
    fileSize: number
    duration: number
    format: string
    uploadedAt: string
    lastModified: string
    status: string
    metadata: {
      originalName: string
      duration: number
      extension: string
      transcription: {
        language: string
        text: string
        status: string
        completedAt?: string
        wordCount?: number
        method?: string
        confidence?: number
        characterCount?: number
      }
      fileSize: number
      format: string
      uploadedAt: string
      mimeType: string
    }
    downloadUrl: string
  }
  
 export interface PaginationInfo {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  
export interface AudioFilesResponse {
    items: AudioFile[]
    pagination: PaginationInfo
  }