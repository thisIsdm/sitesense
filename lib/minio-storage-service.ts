import { minioClientService, MinIOUploadedFile, MinIOProcessingResult } from './minio-client-service'

class MinIOStorageService {
  private readonly STORAGE_KEY_FILES = 'sitesense_minio_files'
  private readonly STORAGE_KEY_RESULTS = 'sitesense_minio_results'

  // Upload files to MinIO and store metadata locally
  async saveFiles(files: File[]): Promise<MinIOUploadedFile[]> {
    try {
      console.log('Uploading files to MinIO:', files.length)
      
      const uploadedFiles = await Promise.all(
        files.map(file => minioClientService.uploadFile(file))
      )

      // Store metadata in localStorage for session management
      localStorage.setItem(this.STORAGE_KEY_FILES, JSON.stringify(uploadedFiles))
      
      console.log('Files uploaded to MinIO successfully:', uploadedFiles)
      return uploadedFiles
    } catch (error) {
      console.error('Error saving files to MinIO:', error)
      throw error
    }
  }

  // Get file metadata from localStorage
  async getFiles(): Promise<MinIOUploadedFile[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_FILES)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting files from localStorage:', error)
      return []
    }
  }

  // Save processing results
  async saveResults(results: MinIOProcessingResult[]): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY_RESULTS, JSON.stringify(results))
      console.log('Results saved to localStorage:', results)
    } catch (error) {
      console.error('Error saving results:', error)
      throw error
    }
  }

  // Get processing results
  async getResults(): Promise<MinIOProcessingResult[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RESULTS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting results from localStorage:', error)
      return []
    }
  }

  // Process file with API and store result in MinIO
  async processFileWithMinIO(
    file: MinIOUploadedFile, 
    objectTypes: string[]
  ): Promise<MinIOProcessingResult> {
    try {
      console.log('Processing file with MinIO:', file.file.name)
      
      // Fetch the file from MinIO
      const response = await fetch(file.minioUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch file from MinIO: ${response.statusText}`)
      }
      
      const blob = await response.blob()
      const fileObj = new File([blob], file.file.name, {
        type: file.file.type,
        lastModified: file.file.lastModified
      })

      // Process with your existing API
      const apiResponse = await this.callProcessingAPI(fileObj, objectTypes)
      
      // Store processed result in MinIO
      const result = await minioClientService.storeProcessedResult(
        file.id,
        apiResponse.blob,
        objectTypes,
        file.type
      )

      // Update with original file URL
      result.result.originalUrl = file.minioUrl
      result.result.originalObjectName = file.objectName

      return result
    } catch (error) {
      console.error('Error processing file with MinIO:', error)
      throw error
    }
  }

  // Call your existing processing API
  private async callProcessingAPI(file: File, objectTypes: string[]): Promise<{ blob: Blob; url: string }> {
    const API_URL = 'http://127.0.0.1:8000'
    const formData = new FormData()
    formData.append('file', file)

    const isVideo = file.type.startsWith('video/')
    const endpoint = isVideo ? 'video' : 'image'

    const response = await fetch(
      `${API_URL}/detect/${endpoint}/${objectTypes.join(',')}?conf=0.1`,
      {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit',
      }
    )

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    return { blob, url }
  }

  // Clear all data
  async clearFiles(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY_FILES)
    localStorage.removeItem(this.STORAGE_KEY_RESULTS)
  }

  // Get file URL from MinIO
  getFileUrl(bucketName: string, objectName: string): string {
    return minioClientService.getFileUrl(bucketName, objectName)
  }

  // Delete files from MinIO
  async deleteFiles(files: MinIOUploadedFile[]): Promise<void> {
    try {
      await Promise.all(
        files.map(file => 
          minioClientService.deleteFile(file.bucketName, file.objectName)
        )
      )
      console.log('Files deleted from MinIO successfully')
    } catch (error) {
      console.error('Error deleting files from MinIO:', error)
      throw error
    }
  }
}

export const minioStorageService = new MinIOStorageService()
export type { MinIOUploadedFile, MinIOProcessingResult }
