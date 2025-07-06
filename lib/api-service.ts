import { storageService } from './storage-service';

export class ApiService {
  private readonly API_URL = 'http://127.0.0.1:8000';

  async processFile(file: File, objectTypes: string[]): Promise<{ url: string; mediaSource: MediaSource | undefined }> {
    try {
      console.log('Starting file processing:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        objectTypes
      });

      const formData = new FormData();
      formData.append('file', file);

      // Determine if file is video or image
      const isVideo = file.type.startsWith('video/');
      const endpoint = isVideo ? 'video' : 'image';

      console.log('Sending request to:', `${this.API_URL}/detect/${endpoint}/${objectTypes.join(',')}?conf=0.1`);

      const response = await fetch(
        `${this.API_URL}/detect/${endpoint}/${objectTypes.join(',')}?conf=0.1`,
        {
          method: 'POST',
          body: formData,
          mode: 'cors',
          credentials: 'omit',
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Check if the response is an image or video
      const contentType = response.headers.get('content-type');
      console.log('Response content type:', contentType);

      if (!contentType) {
        console.error('No content type in response');
        throw new Error('Server did not return a content type');
      }

      if (contentType.startsWith('image/')) {
        console.log('Processing image response');
        const blob = await response.blob();
        console.log('Received image blob:', {
          size: blob.size,
          type: blob.type
        });
        return { url: URL.createObjectURL(blob), mediaSource: undefined };
      } else if (contentType.startsWith('video/') || contentType === 'application/octet-stream') {
        console.log('Processing video response...');
        
        // Get the response as blob
        const videoBlob = await response.blob();
        console.log('Received video blob:', {
          size: videoBlob.size,
          type: videoBlob.type
        });
        
        // Generate a unique ID for the video
        const videoId = `video_${Date.now()}`;
        console.log('Generated video ID:', videoId);
        
        // Store the video in IndexedDB
        await storageService.saveVideo(videoId, videoBlob);
        console.log('Video saved to IndexedDB');
        
        // Create object URL for immediate playback
        const videoUrl = URL.createObjectURL(videoBlob);
        console.log('Created video URL:', videoUrl);
        
        return { url: videoUrl, mediaSource: undefined };
      } else if (contentType.startsWith('application/json')) {
        console.log('Processing JSON response');
        const data = await response.json();
        return { url: data, mediaSource: undefined };
      } else {
        console.error('Unexpected content type:', contentType);
        throw new Error(`Unexpected content type: ${contentType}`);
      }
    } catch (error) {
      console.error('Error in processFile:', error);
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('Could not connect to the server. Please check if the server is running.');
        }
        throw error;
      }
      throw new Error('An unknown error occurred');
    }
  }

  async getStoredVideo(videoId: string): Promise<string | null> {
    try {
      console.log('Getting stored video:', videoId);
      const videoBlob = await storageService.getVideo(videoId);
      if (!videoBlob) {
        console.log('No video found in storage');
        return null;
      }
      const url = URL.createObjectURL(videoBlob);
      console.log('Created URL for stored video:', url);
      return url;
    } catch (error) {
      console.error('Error retrieving stored video:', error);
      return null;
    }
  }
}

export const apiService = new ApiService(); 