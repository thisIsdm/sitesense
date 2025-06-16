import { openDatabase, VIDEO_STORE } from './indexeddb';

export interface UploadedFile {
  id: string
  file: {
    name: string
    type: string
    size: number
    lastModified: number
    data: string
  }
  url: string
  type: "image" | "video"
}

export interface ProcessingResult {
  fileId: string
  result: {
    url: string
    timestamp: string
    objectTypes: string[]
    type: string
  }
}

class StorageService {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'sitesense'
  private readonly STORE_NAME = 'files'
  private readonly RESULTS_STORE = 'results'
  private readonly VIDEOS_STORE = 'videos'

  async init(): Promise<void> {
    if (this.db) return

    console.log('Initializing IndexedDB...');
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 2)

      request.onerror = () => {
        console.error('Error opening IndexedDB:', request.error);
        reject(request.error);
      }
      request.onsuccess = () => {
        console.log('IndexedDB opened successfully');
        this.db = request.result;
        resolve();
      }

      request.onupgradeneeded = (event) => {
        console.log('Upgrading IndexedDB...');
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          console.log('Creating files store');
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(this.RESULTS_STORE)) {
          console.log('Creating results store');
          db.createObjectStore(this.RESULTS_STORE, { keyPath: 'fileId' });
        }
        if (!db.objectStoreNames.contains(this.VIDEOS_STORE)) {
          console.log('Creating videos store');
          db.createObjectStore(this.VIDEOS_STORE);
        }
      }
    })
  }

  private async backupToMinIO(file: File, fileId: string): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'sitesense-uploads')
      
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        console.error('Failed to backup to MinIO:', response.statusText)
        return null
      }

      const result = await response.json()
      console.log('File backed up to MinIO:', result.url)
      return result.url
    } catch (error) {
      console.error('MinIO backup error:', error)
      return null
    }
  }

  private async backupProcessedToMinIO(blob: Blob, originalFileId: string, type: string): Promise<string | null> {
    try {
      const fileName = `processed-${Date.now()}-${originalFileId}.${type === 'image' ? 'jpg' : 'mp4'}`
      const file = new File([blob], fileName, { type: blob.type })
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'sitesense-processed')
      
      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        console.error('Failed to backup processed file to MinIO:', response.statusText)
        return null
      }

      const result = await response.json()
      console.log('Processed file backed up to MinIO:', result.url)
      return result.url
    } catch (error) {
      console.error('MinIO processed backup error:', error)
      return null
    }
  }

  async saveFiles(files: UploadedFile[]): Promise<void> {
    console.log('Saving files to IndexedDB:', {
      count: files.length,
      fileTypes: files.map(f => f.type)
    });

    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      console.log('Saving files to IndexedDB...');
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      
      // Save to IndexedDB and backup to MinIO in parallel
      await Promise.all(files.map(async (file) => {
        await store.put(file);
        
        // Convert base64 back to File for MinIO backup
        if (file.file.data && file.type === 'image') {
          try {
            const base64Data = file.file.data.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            const blob = new Blob(byteArrays, { type: file.file.type });
            const fileObj = new File([blob], file.file.name, {
              type: file.file.type,
              lastModified: file.file.lastModified,
            });
            
            // Backup to MinIO (non-blocking)
            this.backupToMinIO(fileObj, file.id);
          } catch (error) {
            console.warn('Failed to backup image to MinIO:', error);
          }
        }
      }));
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      console.log('Files saved to IndexedDB successfully');
    } catch (error) {
      console.error('Error saving files to IndexedDB:', error);
      throw error;
    }
  }

  async getFiles(): Promise<UploadedFile[]> {
    console.log('Getting files from IndexedDB');
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('Files retrieved:', {
          count: request.result.length,
          fileTypes: request.result.map(f => f.type)
        });
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error getting files:', request.error);
        reject(request.error);
      };
    });
  }

  async saveResults(results: ProcessingResult[]): Promise<void> {
    console.log('Saving results to IndexedDB:', {
      count: results.length,
      fileIds: results.map(r => r.fileId)
    });

    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.init();
      console.log('Saving results to IndexedDB...');
      
      const transaction = this.db!.transaction([this.RESULTS_STORE], 'readwrite');
      const store = transaction.objectStore(this.RESULTS_STORE);
      
      await Promise.all(results.map(async (result) => {
        await store.put(result);
        
        // Backup processed file to MinIO if it's a blob URL
        if (result.result.url.startsWith('blob:')) {
          try {
            const response = await fetch(result.result.url);
            if (response.ok) {
              const blob = await response.blob();
              this.backupProcessedToMinIO(blob, result.fileId, result.result.type);
            }
          } catch (error) {
            console.warn('Failed to backup processed file to MinIO:', error);
          }
        }
      }));
      
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          console.log('Results saved to IndexedDB successfully');
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error saving results to IndexedDB:', error);
      throw error;
    }
  }

  async getResults(): Promise<ProcessingResult[]> {
    console.log('Getting results from IndexedDB');
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.RESULTS_STORE, 'readonly');
      const store = transaction.objectStore(this.RESULTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        console.log('Results retrieved:', {
          count: request.result.length,
          fileIds: request.result.map(r => r.fileId)
        });
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Error getting results:', request.error);
        reject(request.error);
      };
    });
  }

  async saveVideo(fileId: string, videoBlob: Blob): Promise<void> {
    console.log('Saving video to IndexedDB:', {
      fileId,
      blobSize: videoBlob.size,
      blobType: videoBlob.type
    });
    
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.VIDEOS_STORE, 'readwrite');
      const store = transaction.objectStore(this.VIDEOS_STORE);
      const request = store.put(videoBlob, fileId);

      request.onsuccess = () => {
        console.log('Video saved successfully to IndexedDB');
        resolve();
      };
      request.onerror = () => {
        console.error('Error saving video to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async getVideo(fileId: string): Promise<Blob | null> {
    console.log('Getting video from IndexedDB:', fileId);
    
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(this.VIDEOS_STORE, 'readonly');
      const store = transaction.objectStore(this.VIDEOS_STORE);
      const request = store.get(fileId);

      request.onsuccess = () => {
        console.log('Video retrieved from IndexedDB:', {
          found: !!request.result,
          size: request.result?.size,
          type: request.result?.type
        });
        resolve(request.result || null);
      };
      request.onerror = () => {
        console.error('Error getting video from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async clearFiles(): Promise<void> {
    console.log('Clearing all data from IndexedDB');
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        [this.STORE_NAME, this.RESULTS_STORE, this.VIDEOS_STORE],
        'readwrite'
      );
      const filesStore = transaction.objectStore(this.STORE_NAME);
      const resultsStore = transaction.objectStore(this.RESULTS_STORE);
      const videosStore = transaction.objectStore(this.VIDEOS_STORE);

      // Clear all stores
      filesStore.clear();
      resultsStore.clear();
      videosStore.clear();

      transaction.oncomplete = () => {
        console.log('All data cleared successfully');
        resolve();
      };
      transaction.onerror = () => {
        console.error('Error clearing data:', transaction.error);
        reject(transaction.error);
      };
    });
  }
}

export const storageService = new StorageService();

export async function verifyVideoInIndexedDB(fileId: string): Promise<{
  exists: boolean;
  size: number;
  type: string;
  error?: string;
}> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const store = tx.objectStore(VIDEO_STORE);
    const video = await store.get(fileId);

    if (!video) {
      return { exists: false, size: 0, type: '' };
    }

    // Verify the blob is valid
    const blob = video.blob;
    if (!(blob instanceof Blob)) {
      return { 
        exists: true, 
        size: 0, 
        type: '', 
        error: 'Invalid blob data in IndexedDB' 
      };
    }

    return {
      exists: true,
      size: blob.size,
      type: blob.type
    };
  } catch (error) {
    console.error('Error verifying video in IndexedDB:', error);
    return { 
      exists: false, 
      size: 0, 
      type: '', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}