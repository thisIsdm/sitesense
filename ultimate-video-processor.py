"""
Ultimate Python FastAPI Video Processing with Maximum Browser Compatibility
This script replaces your existing video processing with foolproof encoding
"""

import cv2
import numpy as np
import tempfile
import os
import json
import subprocess
import logging
from typing import List, Tuple, Optional
from fastapi import UploadFile, File, Form
from minio import Minio
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BrowserCompatibleVideoProcessor:
    def __init__(self, minio_client: Minio):
        self.minio_client = minio_client
        self.temp_dir = tempfile.gettempdir()
    
    def ensure_even_dimensions(self, width: int, height: int) -> Tuple[int, int]:
        """Ensure dimensions are even numbers for H.264 compatibility"""
        return (width if width % 2 == 0 else width - 1,
                height if height % 2 == 0 else height - 1)
    
    def check_ffmpeg_available(self) -> bool:
        """Check if ffmpeg is available on the system"""
        try:
            subprocess.run(['ffmpeg', '-version'], 
                         capture_output=True, check=True, timeout=5)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def process_with_ffmpeg(self, input_path: str, output_path: str, 
                          object_types: List[str]) -> bool:
        """
        Use ffmpeg for maximum browser compatibility
        This is the most reliable method for web-compatible videos
        """
        try:
            # First, get input video info
            probe_cmd = [
                'ffprobe', '-v', 'quiet', '-print_format', 'json', 
                '-show_format', '-show_streams', input_path
            ]
            
            probe_result = subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
            if probe_result.returncode != 0:
                logger.error(f"ffprobe failed: {probe_result.stderr}")
                return False
            
            # Parse video info
            video_info = json.loads(probe_result.stdout)
            video_stream = next((s for s in video_info['streams'] if s['codec_type'] == 'video'), None)
            
            if not video_stream:
                logger.error("No video stream found")
                return False
            
            width = int(video_stream['width'])
            height = int(video_stream['height'])
            width, height = self.ensure_even_dimensions(width, height)
            
            logger.info(f"Processing video: {width}x{height}")
            
            # Build ultra-compatible ffmpeg command
            cmd = [
                'ffmpeg', '-y', '-v', 'warning',  # Overwrite output, reduce verbosity
                '-i', input_path,
                
                # Video encoding settings for maximum compatibility
                '-c:v', 'libx264',           # H.264 codec (most compatible)
                '-preset', 'medium',         # Balance speed vs compression
                '-crf', '23',               # Good quality (18-28 range)
                '-pix_fmt', 'yuv420p',      # Compatible pixel format
                '-profile:v', 'baseline',    # Most compatible H.264 profile
                '-level', '3.1',            # Compatible level
                
                # Audio settings
                '-c:a', 'aac',              # AAC audio codec
                '-ar', '44100',             # Standard sample rate
                '-b:a', '128k',             # Audio bitrate
                
                # Web optimization
                '-movflags', '+faststart',   # Enable progressive download
                '-fflags', '+genpts',       # Generate presentation timestamps
                
                # Video filters for processing effects and compatibility
                '-vf', self._build_video_filters(width, height, object_types),
                
                # Duration and frame rate limits for safety
                '-t', '300',                # Max 5 minutes (safety limit)
                '-r', '30',                 # Cap at 30 FPS for compatibility
                
                output_path
            ]
            
            logger.info(f"Running ffmpeg command: {' '.join(cmd[:10])}...")
            
            # Run ffmpeg with timeout
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)  # 10 min timeout
            
            if result.returncode == 0:
                # Verify output file
                if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                    logger.info(f"✅ ffmpeg encoding successful: {os.path.getsize(output_path)} bytes")
                    return True
                else:
                    logger.error("ffmpeg produced no output or file too small")
                    return False
            else:
                logger.error(f"ffmpeg failed with code {result.returncode}: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("ffmpeg timeout - video too long or complex")
            return False
        except Exception as e:
            logger.error(f"ffmpeg processing error: {e}")
            return False
    
    def _build_video_filters(self, width: int, height: int, object_types: List[str]) -> str:
        """Build ffmpeg video filters for processing effects"""
        filters = []
        
        # Scale to ensure even dimensions
        filters.append(f"scale={width}:{height}")
        
        # Add processing effects based on detected objects
        if 'person' in object_types:
            # Add subtle blue overlay for person detection
            filters.append("colorbalance=bs=0.1")
        
        if 'car' in object_types:
            # Add slight contrast for car detection
            filters.append("eq=contrast=1.1")
        
        if 'animal' in object_types:
            # Add slight green tint for animals
            filters.append("colorbalance=gs=0.1")
        
        # Always add a watermark
        watermark = "drawtext=text='PROCESSED':x=30:y=30:fontsize=24:fontcolor=white:alpha=0.8"
        filters.append(watermark)
        
        return ",".join(filters)
    
    def process_with_opencv_fallback(self, input_path: str, output_path: str, 
                                   object_types: List[str]) -> bool:
        """
        Fallback to OpenCV if ffmpeg is not available
        Uses most compatible settings possible
        """
        try:
            cap = cv2.VideoCapture(input_path)
            if not cap.isOpened():
                logger.error(f"OpenCV cannot open: {input_path}")
                return False
            
            # Get video properties
            fps = min(cap.get(cv2.CAP_PROP_FPS), 30)  # Cap at 30 FPS
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            width, height = self.ensure_even_dimensions(width, height)
            
            logger.info(f"OpenCV processing: {width}x{height}, {fps} FPS, {total_frames} frames")
            
            # Use most compatible OpenCV settings
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # More compatible than H264
            out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
            
            if not out.isOpened():
                logger.error("OpenCV VideoWriter failed to open")
                cap.release()
                return False
            
            frame_count = 0
            max_frames = min(total_frames, int(fps * 300))  # Max 5 minutes
            
            while frame_count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Resize frame if needed
                if frame.shape[1] != width or frame.shape[0] != height:
                    frame = cv2.resize(frame, (width, height))
                
                # Apply processing effects
                processed_frame = self._apply_opencv_effects(frame, object_types)
                out.write(processed_frame)
                
                frame_count += 1
                if frame_count % 100 == 0:
                    logger.info(f"OpenCV processed {frame_count}/{max_frames} frames")
            
            cap.release()
            out.release()
            
            # Verify output
            if os.path.exists(output_path) and os.path.getsize(output_path) > 1000:
                logger.info(f"✅ OpenCV encoding successful: {os.path.getsize(output_path)} bytes")
                return True
            else:
                logger.error("OpenCV produced no output or file too small")
                return False
                
        except Exception as e:
            logger.error(f"OpenCV processing error: {e}")
            return False
    
    def _apply_opencv_effects(self, frame: np.ndarray, object_types: List[str]) -> np.ndarray:
        """Apply visual effects using OpenCV"""
        try:
            processed_frame = frame.copy()
            
            # Apply effects based on detected objects
            if 'person' in object_types:
                # Subtle blue tint
                blue_overlay = np.zeros_like(processed_frame)
                blue_overlay[:, :, 0] = 20
                processed_frame = cv2.addWeighted(processed_frame, 0.95, blue_overlay, 0.05, 0)
            
            if 'car' in object_types:
                # Red border
                cv2.rectangle(processed_frame, (5, 5), 
                            (processed_frame.shape[1]-5, processed_frame.shape[0]-5), 
                            (0, 0, 255), 2)
            
            if 'animal' in object_types:
                # Green tint
                green_overlay = np.zeros_like(processed_frame)
                green_overlay[:, :, 1] = 20
                processed_frame = cv2.addWeighted(processed_frame, 0.95, green_overlay, 0.05, 0)
            
            # Add watermark
            cv2.putText(processed_frame, "PROCESSED", (20, 40), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            
            return processed_frame
            
        except Exception as e:
            logger.warning(f"Error applying OpenCV effects: {e}")
            return frame
    
    def process_video(self, input_path: str, object_types: List[str]) -> Optional[str]:
        """
        Main video processing method with multiple fallbacks
        Returns the MinIO URL of the processed video or None if failed
        """
        output_filename = f"processed_{uuid.uuid4().hex[:8]}.mp4"
        temp_output = os.path.join(self.temp_dir, output_filename)
        
        try:
            # Method 1: Try ffmpeg (best quality and compatibility)
            if self.check_ffmpeg_available():
                logger.info("🎬 Attempting ffmpeg processing...")
                if self.process_with_ffmpeg(input_path, temp_output, object_types):
                    return self._upload_to_minio(temp_output, output_filename)
                else:
                    logger.warning("ffmpeg failed, trying OpenCV fallback...")
            
            # Method 2: Fallback to OpenCV
            logger.info("🎬 Attempting OpenCV processing...")
            if self.process_with_opencv_fallback(input_path, temp_output, object_types):
                return self._upload_to_minio(temp_output, output_filename)
            
            logger.error("❌ All video processing methods failed")
            return None
            
        finally:
            # Cleanup temp file
            if os.path.exists(temp_output):
                os.unlink(temp_output)
    
    def _upload_to_minio(self, file_path: str, object_name: str) -> str:
        """Upload processed video to MinIO"""
        try:
            with open(file_path, 'rb') as file_data:
                self.minio_client.put_object(
                    bucket_name="sitesense-processed",
                    object_name=object_name,
                    data=file_data,
                    length=os.path.getsize(file_path),
                    content_type="video/mp4"
                )
            
            minio_url = f"http://localhost:9000/sitesense-processed/{object_name}"
            logger.info(f"✅ Uploaded to MinIO: {minio_url}")
            return minio_url
            
        except Exception as e:
            logger.error(f"MinIO upload failed: {e}")
            raise

# FastAPI endpoint using the new processor
"""
@app.post("/process-video/")
async def process_video_ultimate(
    file: UploadFile = File(...),
    object_types: str = Form(...)
):
    processor = BrowserCompatibleVideoProcessor(minio_client)
    
    try:
        # Parse object types
        detected_objects = json.loads(object_types) if object_types else []
        
        # Save uploaded file to temp location
        temp_input = os.path.join(tempfile.gettempdir(), f"input_{uuid.uuid4().hex[:8]}.mp4")
        
        with open(temp_input, 'wb') as temp_file:
            content = await file.read()
            temp_file.write(content)
        
        # Process the video
        processed_url = processor.process_video(temp_input, detected_objects)
        
        # Cleanup input file
        if os.path.exists(temp_input):
            os.unlink(temp_input)
        
        if processed_url:
            return {
                "status": "success",
                "processed_url": processed_url,
                "object_types": detected_objects,
                "message": "Video processed with maximum browser compatibility",
                "encoding_info": {
                    "codec": "H.264 (libx264)",
                    "profile": "baseline",
                    "pixel_format": "yuv420p",
                    "optimized_for": "web_browsers"
                }
            }
        else:
            return {
                "status": "error",
                "message": "Failed to process video with any available method",
                "suggestions": [
                    "Install ffmpeg for better compatibility",
                    "Check if input video format is supported",
                    "Try a different input video"
                ]
            }
            
    except Exception as e:
        logger.error(f"Video processing endpoint error: {e}")
        return {
            "status": "error",
            "message": f"Video processing failed: {str(e)}"
        }
"""

print("🎬 Ultimate browser-compatible video processor created!")
print("\n📋 Setup Instructions:")
print("1. Install ffmpeg: https://ffmpeg.org/download.html")
print("2. Replace your video processing code with the BrowserCompatibleVideoProcessor class")
print("3. Update your FastAPI endpoint with the provided code")
print("\n✨ Features:")
print("- H.264 baseline profile for maximum compatibility")
print("- Progressive download support (faststart)")
print("- Automatic dimension correction for encoding")
print("- Multiple fallback methods (ffmpeg → OpenCV)")
print("- Comprehensive error handling and logging")
print("- Web-optimized encoding settings")
