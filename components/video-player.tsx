'use client'

import { useEffect, useRef, useState } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  title?: string
  onError?: (error: any) => void
  onReady?: () => void
}

export default function VideoPlayer({ 
  src, 
  poster, 
  className = '', 
  title = 'Video Player',
  onError,
  onReady 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current && videoRef.current) {
      console.log(`🎬 Initializing Video.js player for: ${title}`)
      
      // Create video element
      const videoElement = document.createElement('video')
      videoElement.className = 'video-js vjs-default-skin w-full h-full'
      videoElement.controls = true
      videoElement.preload = 'metadata'
      videoElement.playsInline = true
      
      if (poster) {
        videoElement.poster = poster
      }
      
      videoRef.current.appendChild(videoElement)

      // Initialize Video.js with enhanced options
      const player = videojs(videoElement, {
        controls: true,
        responsive: true,
        fluid: false,
        fill: true,
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        sources: [
          {
            src: src,
            type: 'video/mp4'
          }
        ],
        html5: {
          vhs: {
            overrideNative: true,
            enableLowInitialPlaylist: true,
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        techOrder: ['html5', 'flash'], // Prefer HTML5, fallback to Flash if available
        errorDisplay: {
          open: () => {
            console.error(`❌ Video.js error for ${title}`)
            // Custom error handling
            handleVideoError()
          }
        }
      })

      playerRef.current = player

      // Event listeners
      player.ready(() => {
        console.log(`✅ Video.js player ready for: ${title}`)
        onReady?.()
      })

      player.on('error', () => {
        const error = player.error()
        console.error(`❌ Video.js playback error for ${title}:`, error)
        handleVideoError(error)
      })

      player.on('loadstart', () => {
        console.log(`🔄 Loading started for: ${title}`)
        setError(null)
      })

      player.on('loadeddata', () => {
        console.log(`✅ Video data loaded for: ${title}`)
      })

      player.on('canplay', () => {
        console.log(`▶️ Video can play: ${title}`)
      })

      player.on('canplaythrough', () => {
        console.log(`🎉 Video ready to play through: ${title}`)
      })
    }

    return () => {
      // Cleanup
      if (playerRef.current && !playerRef.current.isDisposed()) {
        console.log(`🧹 Disposing Video.js player for: ${title}`)
        playerRef.current.dispose()
        playerRef.current = null
      }
    }
  }, [src])
  const handleVideoError = (error?: any) => {
    const errorCode = error?.code || 'unknown'
    const errorMsg = error?.message || 'Unknown video error'
    
    console.error(`Video error details:`, {
      title,
      src,
      error: errorMsg,
      code: errorCode
    })
    
    // Set user-friendly error message based on error code
    let userMessage = 'Failed to load video'
    if (errorCode === 4 || errorMsg.includes('not supported')) {
      userMessage = 'Video format not supported by browser'
    } else if (errorCode === 2) {
      userMessage = 'Network error loading video'
    } else if (errorCode === 3) {
      userMessage = 'Video decoding error'
    }
    
    setError(userMessage)
    onError?.(error)
  }

  const retryLoad = async () => {
    if (playerRef.current && !isRetrying) {
      setIsRetrying(true)
      setError(null)
      
      console.log(`🔄 Retrying video load for: ${title}`)
      
      try {
        // Reset the player source
        playerRef.current.src({
          src: src,
          type: 'video/mp4'
        })
        
        // Force reload
        playerRef.current.load()
      } catch (err) {
        console.error('Retry failed:', err)
        setError('Retry failed. Video format may not be supported.')
      } finally {
        setIsRetrying(false)
      }
    }
  }

  const downloadVideo = () => {
    const link = document.createElement('a')
    link.href = src
    link.download = title.replace(/[^a-zA-Z0-9]/g, '_') + '.mp4'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  if (error) {
    const isProcessedVideo = title.toLowerCase().includes('processed')
    
    return (
      <div className={`relative bg-gray-900 text-white flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          
          <h4 className="text-lg font-medium mb-2">Video Playback Issue</h4>
          <p className="text-sm text-gray-300 mb-4">{error}</p>
          
          {isProcessedVideo && (
            <div className="bg-blue-900/30 border border-blue-400/30 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-200">
                ⚠️ The video was processed successfully, but the output format may not be compatible with your browser.
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={retryLoad}
              disabled={isRetrying}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              {isRetrying ? 'Retrying...' : '🔄 Try Again'}
            </button>
            
            <button
              onClick={downloadVideo}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium transition-colors"
            >
              📥 Download Video
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <p>💡 Tip: Downloaded video may play in VLC or other media players</p>
            {isProcessedVideo && (
              <p>🔧 Consider updating the video processing backend for better browser compatibility</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={videoRef} className="w-full h-full" />
    </div>
  )
}
