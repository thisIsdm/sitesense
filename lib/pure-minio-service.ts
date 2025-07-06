// Pure MinIO Storage Service - No IndexedDB
export interface MinIOFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  minioUrl: string
  objectName: string
  bucketName: string
  type: "image" | "video"
}

export interface MinIOProcessingResult {
  fileId: string
  originalUrl: string
  processedUrl: string
  timestamp: string
  objectTypes: string[]
  type: string
}

class PureMinIOService {
  private readonly STORAGE_KEY_FILES = 'sitesense_files_meta'
  private readonly STORAGE_KEY_RESULTS = 'sitesense_results_meta'
  private readonly UPLOAD_BUCKET = 'sitesense-uploads'
  private readonly PROCESSED_BUCKET = 'sitesense-processed'

  // Upload files directly to MinIO
  async uploadFiles(files: File[]): Promise<MinIOFile[]> {
    try {
      console.log('📤 Uploading files directly to MinIO:', files.length);
      
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('bucket', this.UPLOAD_BUCKET);
          
          const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const result = await response.json();
          
          return {
            id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            minioUrl: result.url,
            objectName: result.objectName,
            bucketName: this.UPLOAD_BUCKET,
            type: file.type.startsWith('video/') ? 'video' : 'image'
          } as MinIOFile;
        })
      );

      // Store metadata in localStorage for session management
      localStorage.setItem(this.STORAGE_KEY_FILES, JSON.stringify(uploadedFiles));
      console.log('✅ Files uploaded to MinIO:', uploadedFiles);
      return uploadedFiles;
      
    } catch (error) {
      console.error('❌ Error uploading files to MinIO:', error);
      throw error;
    }
  }

  // Get files metadata
  getFiles(): MinIOFile[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_FILES);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting files metadata:', error);
      return [];
    }
  }

  // Process file with API and store result in MinIO
  async processFile(file: MinIOFile, objectTypes: string[]): Promise<MinIOProcessingResult> {
    try {
      console.log('🔄 Processing file:', file.fileName);
      
      // Fetch file from MinIO using our download API (to avoid 403)
      const downloadUrl = `/api/storage/download?bucket=${file.bucketName}&object=${file.objectName}`;
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const fileObj = new File([blob], file.fileName, {
        type: file.fileType
      });

      // Process with your Python API
      const processedBlob = await this.callProcessingAPI(fileObj, objectTypes);
      
      // Upload processed result to MinIO
      const processedFileName = `processed-${Date.now()}-${file.id}.${file.type === 'image' ? 'jpg' : 'mp4'}`;
      const processedFile = new File([processedBlob], processedFileName, {
        type: processedBlob.type
      });

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('bucket', this.PROCESSED_BUCKET);
      
      const uploadResponse = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload processed file: ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      
      return {
        fileId: file.id,
        originalUrl: file.minioUrl,
        processedUrl: uploadResult.url,
        timestamp: new Date().toISOString(),
        objectTypes,
        type: file.type
      };
      
    } catch (error) {
      console.error('❌ Error processing file:', error);
      throw error;
    }
  }

  // Call your existing Python API
  private async callProcessingAPI(file: File, objectTypes: string[]): Promise<Blob> {
    const formData = new FormData();
    formData.append('file', file);

    const isVideo = file.type.startsWith('video/');
    
    // Check if Traffic Cars is selected
    const isTrafficCars = objectTypes.includes('Traffic Cars');
    
    let apiUrl: string;
    let endpoint: string;
    
    if (isTrafficCars) {
      // Special endpoints for Traffic Cars
      apiUrl = 'http://172.17.106.81:8000';
      endpoint = isVideo ? 'detect-video-file' : 'detect-image';
    } else {
      // Regular endpoints for other object types
      const API_URL = 'http://127.0.0.1:8000';
      apiUrl = API_URL;
      endpoint = isVideo ? 'video' : 'image';
    }

    let requestUrl: string;
    
    if (isTrafficCars) {
      // Traffic Cars endpoints don't need object types in URL
      requestUrl = `${apiUrl}/${endpoint}/`;
    } else {
      // Regular endpoints with object types
      requestUrl = `${apiUrl}/detect/${endpoint}/${objectTypes.join(',')}?conf=0.1`;
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      body: formData,
      mode: 'cors',
      credentials: 'omit',
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.blob();
  }

  // Save processing results
  saveResults(results: MinIOProcessingResult[]): void {
    localStorage.setItem(this.STORAGE_KEY_RESULTS, JSON.stringify(results));
    console.log('✅ Results saved:', results);
  }

  // Get processing results
  getResults(): MinIOProcessingResult[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY_RESULTS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting results:', error);
      return [];
    }
  }

  // Clear all data
  clearAll(): void {
    localStorage.removeItem(this.STORAGE_KEY_FILES);
    localStorage.removeItem(this.STORAGE_KEY_RESULTS);
  }
}

export const pureMinIOService = new PureMinIOService();

// Helper function for downloading videos as blobs for better browser compatibility
export const downloadVideoAsBlob = async (bucket: string, filename: string): Promise<Blob> => {
  try {
    console.log(`📥 Downloading video: ${filename} from bucket: ${bucket}`);
    const response = await fetch(`/api/storage/download?bucket=${bucket}&object=${encodeURIComponent(filename)}`);
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(`✅ Video downloaded: ${blob.size} bytes, type: ${blob.type}`);
    
    // Ensure it's treated as video/mp4 for better browser compatibility
    return new Blob([blob], { type: 'video/mp4' });
  } catch (error) {
    console.error('❌ Error downloading video:', error);
    throw error;
  }
};

// Enhanced video converter for processed videos that may have compatibility issues
export const convertVideoForPlayback = async (videoBlob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a video element to test if the video can be played
      const testVideo = document.createElement('video');
      const testUrl = URL.createObjectURL(videoBlob);
      
      testVideo.src = testUrl;
      testVideo.muted = true;
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(testUrl);
        reject(new Error('Video load timeout - likely incompatible format'));
      }, 5000);
      
      testVideo.oncanplaythrough = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(testUrl);
        console.log('✅ Video is compatible, no conversion needed');
        resolve(videoBlob);
      };
      
      testVideo.onerror = () => {
        clearTimeout(timeout);
        URL.revokeObjectURL(testUrl);
        console.log('❌ Video incompatible, creating fallback');
        
        // Create a fallback blob with proper headers
        const compatibleBlob = new Blob([videoBlob], { 
          type: 'video/mp4; codecs="avc1.42E01E"' 
        });
        resolve(compatibleBlob);
      };
      
      // Start loading
      testVideo.load();
      
    } catch (error) {
      console.error('❌ Error in video conversion:', error);
      reject(error);
    }
  });
};
