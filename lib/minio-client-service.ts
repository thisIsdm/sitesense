// MinIO service for client-side operations
export interface MinIOUploadedFile {
  id: string
  file: {
    name: string
    type: string
    size: number
    lastModified: number
    originalName: string
  }
  minioUrl: string
  objectName: string
  type: "image" | "video"
  bucketName: string
}

export interface MinIOProcessingResult {
  fileId: string
  result: {
    originalUrl: string
    processedUrl: string
    timestamp: string
    objectTypes: string[]
    type: string
    originalObjectName: string
    processedObjectName: string
  }
}

class MinIOClientService {
  private readonly API_BASE = '/api/minio'
  private readonly BUCKET_UPLOADS = 'sitesense-uploads'
  private readonly BUCKET_PROCESSED = 'sitesense-processed'

  // Upload file to MinIO
  async uploadFile(file: File): Promise<MinIOUploadedFile> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', this.BUCKET_UPLOADS)
      
      const response = await fetch(`${this.API_BASE}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified,
          originalName: file.name
        },
        minioUrl: result.url,
        objectName: result.objectName,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        bucketName: this.BUCKET_UPLOADS
      }
    } catch (error) {
      console.error('Error uploading file to MinIO:', error)
      throw error
    }
  }

  // Get file URL from MinIO
  getFileUrl(bucketName: string, objectName: string): string {
    const endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'localhost'
    const port = process.env.NEXT_PUBLIC_MINIO_PORT || '9000'
    return `http://${endpoint}:${port}/${bucketName}/${objectName}`
  }

  // Store processed file result
  async storeProcessedResult(
    originalFileId: string,
    processedBlob: Blob,
    objectTypes: string[],
    type: string
  ): Promise<MinIOProcessingResult> {
    try {
      const timestamp = new Date().toISOString()
      const processedFileName = `processed-${Date.now()}-${originalFileId}.${type === 'image' ? 'jpg' : 'mp4'}`
      
      // Convert blob to file
      const processedFile = new File([processedBlob], processedFileName, {
        type: processedBlob.type
      })

      // Upload processed file to MinIO
      const formData = new FormData()
      formData.append('file', processedFile)
      formData.append('bucket', this.BUCKET_PROCESSED)
      formData.append('objectName', processedFileName)
      
      const response = await fetch(`${this.API_BASE}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to store processed file: ${response.statusText}`)
      }

      const result = await response.json()
      
      return {
        fileId: originalFileId,
        result: {
          originalUrl: '', // Will be set by caller
          processedUrl: result.url,
          timestamp,
          objectTypes,
          type,
          originalObjectName: '',
          processedObjectName: processedFileName
        }
      }
    } catch (error) {
      console.error('Error storing processed result:', error)
      throw error
    }
  }

  // Delete file from MinIO
  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    try {
      const response = await fetch(`${this.API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucketName, objectName })
      })

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting file from MinIO:', error)
      throw error
    }
  }

  // List files in bucket
  async listFiles(bucketName: string, prefix?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams()
      params.append('bucket', bucketName)
      if (prefix) params.append('prefix', prefix)
      
      const response = await fetch(`${this.API_BASE}/list?${params}`)
      
      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error listing files from MinIO:', error)
      throw error
    }
  }
}

export const minioClientService = new MinIOClientService()
