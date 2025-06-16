"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { storageService, UploadedFile, ProcessingResult } from "@/lib/storage-service"
import { ReactCompareSlider, ReactCompareSliderImage } from "react-compare-slider"

export default function ResultsPage() {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [results, setResults] = useState<ProcessingResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedFileIndex, setSelectedFileIndex] = useState(0)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [hasVerifiedVideo, setHasVerifiedVideo] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('Loading data for results page...');
        const [files, processingResults] = await Promise.all([
          storageService.getFiles(),
          storageService.getResults()
        ]);

        console.log('Loaded data:', {
          filesCount: files?.length,
          resultsCount: processingResults?.length
        });

        if (!files || files.length === 0) {
          console.log('No files found, redirecting to home');
          router.push('/');
          return;
        }

        setUploadedFiles(files);
        setResults(processingResults);

        // Load processed video if available
        const currentFile = files[selectedFileIndex];
        if (currentFile?.type === "video") {
          console.log('Loading processed video for:', {
            fileId: currentFile.id,
            fileName: currentFile.file.name
          });
          
          const currentResult = processingResults.find(r => r.fileId === currentFile.id);
          console.log('Found result:', {
            hasResult: !!currentResult,
            resultUrl: currentResult?.result.url
          });
          
          if (currentResult?.result.url) {
            console.log('Setting processed video URL:', currentResult.result.url);
            setProcessedVideoUrl(currentResult.result.url);
          } else {
            console.log('No processed video URL found');
          }
        }
      } catch (error) {
        console.error('Error in loadData:', error);
        setError('Failed to load results. Please try again.');
        await storageService.clearFiles();
        router.push('/');
      }
    };

    loadData();
  }, [router, selectedFileIndex]);

  useEffect(() => {
    let mounted = true;

    const verifyVideoBlob = async () => {
      if (!processedVideoUrl || hasVerifiedVideo) return;

      try {
        console.log('Verifying video blob...');
        const response = await fetch(processedVideoUrl);
        const blob = await response.blob();
        
        console.log('Video blob verification:', {
          size: blob.size,
          type: blob.type
        });

        if (!mounted) return;

        if (blob.size === 0) {
          console.error('Video blob is empty');
          setVideoError('Video data is corrupted. Please try again.');
          setIsVideoLoading(false);
          return;
        }

        setHasVerifiedVideo(true);
        setIsVideoLoading(false);
      } catch (error) {
        console.error('Error verifying video blob:', error);
        if (mounted) {
          setVideoError('Failed to verify video data. Please try again.');
          setIsVideoLoading(false);
        }
      }
    };

    verifyVideoBlob();

    return () => {
      mounted = false;
    };
  }, [processedVideoUrl, hasVerifiedVideo]);

  // Cleanup function to revoke object URLs
  useEffect(() => {
    return () => {
      if (processedVideoUrl) {
        console.log('Revoking processed video URL:', processedVideoUrl);
        URL.revokeObjectURL(processedVideoUrl);
      }
    };
  }, [processedVideoUrl]);

  const handleStartOver = () => {
    router.push('/');
  };

  const handlePrevious = () => {
    setSelectedFileIndex((prev) => (prev > 0 ? prev - 1 : uploadedFiles.length - 1));
  };

  const handleNext = () => {
    setSelectedFileIndex((prev) => (prev < uploadedFiles.length - 1 ? prev + 1 : 0));
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            onClick={handleStartOver}
            className="mt-4 bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
          >
            Start Over
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const currentFile = uploadedFiles[selectedFileIndex];
  const currentResult = results.find(r => r.fileId === currentFile?.id);
  const isVideo = currentFile?.type === "video";

  console.log('Rendering results page:', {
    currentFileId: currentFile?.id,
    currentFileType: currentFile?.type,
    hasResult: !!currentResult,
    processedVideoUrl,
    isVideoLoading,
    videoError
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Processing Results</h1>
        
        <div className="max-w-4xl mx-auto">
          {currentFile && (
            <div className="mb-8">
              <div className="aspect-w-16 aspect-h-9 mb-4">
                {isVideo ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Original Video</h3>
                      <video
                        src={currentFile.url}
                        controls
                        className="w-full rounded-lg"
                        onError={(e) => {
                          console.error('Error loading original video:', e);
                          setVideoError('Error loading original video');
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Processed Video</h3>
                      {isVideoLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <p>Loading processed video...</p>
                        </div>
                      ) : videoError ? (
                        <div className="w-full h-full flex items-center justify-center bg-red-100 rounded-lg">
                          <p className="text-red-600">{videoError}</p>
                        </div>
                      ) : processedVideoUrl ? (
                        <video
                          key={processedVideoUrl}
                          src={processedVideoUrl}
                          controls
                          className="w-full rounded-lg"
                          onLoadStart={() => {
                            console.log('Video load started');
                            setIsVideoLoading(true);
                          }}
                          onLoadedMetadata={() => {
                            console.log('Video metadata loaded');
                            setIsVideoLoading(false);
                          }}
                          onError={(e) => {
                            console.error('Error loading processed video:', e);
                            const videoElement = e.target as HTMLVideoElement;
                            console.error('Video error code:', videoElement.error?.code);
                            console.error('Video error message:', videoElement.error?.message);
                            setIsVideoLoading(false);
                            setVideoError('Error loading processed video. Please try again.');
                          }}
                          preload="auto"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
                          <p>No processed video available</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <ReactCompareSlider
                    itemOne={
                      <ReactCompareSliderImage
                        src={currentFile.url}
                        alt="Original"
                      />
                    }
                    itemTwo={
                      <ReactCompareSliderImage
                        src={currentResult?.result.url || currentFile.url}
                        alt="Processed"
                      />
                    }
                    className="rounded-lg"
                  />
                )}
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <Button
                  onClick={handlePrevious}
                  className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
                >
                  Previous
                </Button>
                <span className="text-lg font-medium">
                  {selectedFileIndex + 1} of {uploadedFiles.length}
                </span>
                <Button
                  onClick={handleNext}
                  className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uploadedFiles.map((file, index) => {
              const result = results.find(r => r.fileId === file.id);
              return (
                <div 
                  key={file.id} 
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    index === selectedFileIndex ? 'border-[#AE4B4B]' : ''
                  }`}
                  onClick={() => setSelectedFileIndex(index)}
                >
                  {file.type === "video" ? (
                    <div className="aspect-w-16 aspect-h-9 mb-4">
                      <video
                        src={file.url}
                        className="object-cover rounded-lg"
                        preload="metadata"
                      />
                    </div>
                  ) : (
                    <div className="aspect-w-16 aspect-h-9 mb-4">
                      <img
                        src={file.url}
                        alt={file.file.name}
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <h3 className="font-semibold mb-2">{file.file.name}</h3>
                  {result ? (
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">
                        <span className="font-medium">Processed:</span>{' '}
                        {new Date(result.result.timestamp).toLocaleString()}
                      </p>
                      <p>
                        <span className="font-medium">Detected Objects:</span>{' '}
                        {result.result.objectTypes.join(', ')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No results available</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleStartOver}
              className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
            >
              Start Over
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 