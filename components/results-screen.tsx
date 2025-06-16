"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { storageService } from "@/lib/storage-service"

interface UploadedFile {
  id: string
  file: File
  url: string
  type: "image" | "video"
}

interface ObjectSettings {
  blastRig: boolean
  dumperTruck: boolean
  excavator: boolean
  car: boolean
}

interface ResultsScreenProps {
  files: UploadedFile[]
  onProcessAgain: () => void
  objectSettings: ObjectSettings
}

export function ResultsScreen({ files, onProcessAgain, objectSettings }: ResultsScreenProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [processedImages, setProcessedImages] = useState<{ [key: string]: string }>({})
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  useEffect(() => {
    // Get processed images from localStorage
    const storedProcessedImages = localStorage.getItem('processedImages')
    if (storedProcessedImages) {
      setProcessedImages(JSON.parse(storedProcessedImages))
    }

    // Load video from IndexedDB if available
    const loadVideo = async () => {
      const videoFile = files.find(f => f.type === "video")
      if (videoFile) {
        const storedVideo = await storageService.getVideo(videoFile.id)
        if (storedVideo) {
          setVideoUrl(URL.createObjectURL(storedVideo))
        }
      }
    }
    loadVideo()

    // Cleanup function to revoke object URLs
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl)
      }
    }
  }, [files])

  // Always show demo content if no files or use uploaded files
  const hasVideo = files.some((f) => f.type === "video")
  const videoFile = files.find((f) => f.type === "video")
  const imageFiles = files.filter((f) => f.type === "image")

  // Create demo images for display
  const demoImages = Array.from({ length: 9 }, (_, i) => ({
    id: `demo-${i}`,
    file: new File([], `demo${i}.jpg`),
    url: `/placeholder.svg?height=300&width=300&text=Image${i + 1}`,
    type: "image" as const,
  }))

  const displayImages = imageFiles.length > 0 ? imageFiles : demoImages

  if (hasVideo && videoFile && videoUrl) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="relative aspect-video bg-black">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain protected-content"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                autoPlay
                muted
                loop
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="text-center mt-8">
            <Button onClick={onProcessAgain} className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90">
              <RotateCcw className="w-4 h-4 mr-2" />
              Process Again
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Image results layout
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="grid grid-cols-3 gap-2">
              {displayImages.slice(0, 9).map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === index ? "border-[#AE4B4B]" : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <div className="relative w-full h-full">
                    <img
                      src={file.url || "/placeholder.svg"}
                      alt={`Result ${index + 1}`}
                      className="w-full h-full object-cover protected-content"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Button onClick={onProcessAgain} className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90">
                <RotateCcw className="w-4 h-4 mr-2" />
                Process Again
              </Button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="relative aspect-video">
                <ReactCompareSlider
                  itemOne={
                    <ReactCompareSliderImage
                      src={displayImages[selectedImageIndex]?.url}
                      alt="Original"
                    />
                  }
                  itemTwo={
                    <ReactCompareSliderImage
                      src={processedImages[displayImages[selectedImageIndex]?.id] || displayImages[selectedImageIndex]?.url}
                      alt="Processed"
                    />
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
