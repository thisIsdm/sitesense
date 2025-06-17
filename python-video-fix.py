# Enhanced Python FastAPI video processing with browser-compatible encoding
# Replace your existing video processing route with this improved version

import cv2
import numpy as np
import tempfile
import os
from typing import List, Tuple
import subprocess
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ensure_even_dimensions(width: int, height: int) -> Tuple[int, int]:
    """Ensure dimensions are even numbers for H.264 compatibility"""
    return (width if width % 2 == 0 else width - 1,
            height if height % 2 == 0 else height - 1)

def process_video_advanced(input_path: str, output_path: str, object_types: List[str]) -> bool:
    """
    Process video with advanced encoding options for maximum browser compatibility
    """
    try:
        # Read the original video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            logger.error(f"Failed to open video: {input_path}")
            return False
        
        # Get video properties
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Ensure even dimensions for H.264
        width, height = ensure_even_dimensions(width, height)
        
        logger.info(f"Video properties: {width}x{height}, {fps} FPS, {total_frames} frames")
        
        # Use a temporary file for intermediate processing
        temp_path = output_path + ".temp.mp4"
        
        # Try multiple encoding approaches
        success = False
        
        # Method 1: Try H.264 with OpenCV (most compatible)
        try:
            fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264
            out = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
            
            frame_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Resize frame if needed
                if frame.shape[1] != width or frame.shape[0] != height:
                    frame = cv2.resize(frame, (width, height))
                
                # Add processing effects based on detected objects
                processed_frame = apply_object_effects(frame, object_types)
                out.write(processed_frame)
                
                frame_count += 1
                if frame_count % 30 == 0:  # Log progress
                    logger.info(f"Processed {frame_count}/{total_frames} frames")
            
            out.release()
            success = True
            logger.info("H.264 encoding with OpenCV successful")
            
        except Exception as e:
            logger.warning(f"H.264 encoding with OpenCV failed: {e}")
        
        cap.release()
        
        # Method 2: If OpenCV fails, try ffmpeg for maximum compatibility
        if not success or not os.path.exists(temp_path) or os.path.getsize(temp_path) < 1000:
            logger.info("Trying ffmpeg encoding for better compatibility")
            success = encode_with_ffmpeg(input_path, temp_path, object_types)
        
        # Move temp file to final location
        if success and os.path.exists(temp_path):
            os.rename(temp_path, output_path)
            logger.info(f"Video successfully processed and saved to {output_path}")
            return True
        else:
            # Cleanup temp file if it exists
            if os.path.exists(temp_path):
                os.remove(temp_path)
            logger.error("All encoding methods failed")
            return False
            
    except Exception as e:
        logger.error(f"Error processing video: {e}")
        return False

def encode_with_ffmpeg(input_path: str, output_path: str, object_types: List[str]) -> bool:
    """
    Use ffmpeg for encoding with maximum browser compatibility
    """
    try:
        # Build ffmpeg command for maximum compatibility
        cmd = [
            'ffmpeg', '-y',  # Overwrite output file
            '-i', input_path,
            '-c:v', 'libx264',  # H.264 codec
            '-preset', 'medium',  # Balance between speed and compression
            '-crf', '23',  # Good quality
            '-pix_fmt', 'yuv420p',  # Compatible pixel format
            '-movflags', '+faststart',  # Enable progressive download
            '-profile:v', 'baseline',  # Maximum compatibility profile
            '-level', '3.0',  # Compatible level
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',  # Ensure even dimensions
            output_path
        ]
        
        logger.info(f"Running ffmpeg: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode == 0:
            logger.info("ffmpeg encoding successful")
            return True
        else:
            logger.error(f"ffmpeg failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        logger.error("ffmpeg timeout")
        return False
    except FileNotFoundError:
        logger.warning("ffmpeg not found, falling back to OpenCV")
        return False
    except Exception as e:
        logger.error(f"ffmpeg encoding error: {e}")
        return False

def apply_object_effects(frame: np.ndarray, object_types: List[str]) -> np.ndarray:
    """
    Apply visual effects based on detected object types
    """
    processed_frame = frame.copy()
    
    try:
        # Apply different effects based on detected objects
        if 'person' in object_types:
            # Add a subtle blue tint for person detection
            blue_overlay = np.zeros_like(processed_frame)
            blue_overlay[:, :, 0] = 30  # Blue channel
            processed_frame = cv2.addWeighted(processed_frame, 0.9, blue_overlay, 0.1, 0)
        
        if 'car' in object_types:
            # Add a subtle red border effect
            cv2.rectangle(processed_frame, (10, 10), 
                         (processed_frame.shape[1]-10, processed_frame.shape[0]-10), 
                         (0, 0, 255), 3)
        
        if 'animal' in object_types:
            # Add a green tint
            green_overlay = np.zeros_like(processed_frame)
            green_overlay[:, :, 1] = 30  # Green channel
            processed_frame = cv2.addWeighted(processed_frame, 0.9, green_overlay, 0.1, 0)
        
        # Always add a timestamp or watermark
        cv2.putText(processed_frame, "PROCESSED", 
                   (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
    except Exception as e:
        logger.warning(f"Error applying effects: {e}")
        # Return original frame if effects fail
        return frame
    
    return processed_frame

# Your FastAPI route should look like this:
"""
@app.post("/process-video/")
async def process_video_endpoint(
    file: UploadFile = File(...),
    object_types: str = Form(...)
):
    try:
        # Parse object types
        detected_objects = json.loads(object_types) if object_types else []
        
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_input:
            # Save uploaded file
            content = await file.read()
            temp_input.write(content)
            temp_input_path = temp_input.name
        
        # Create output file path
        temp_output_path = temp_input_path.replace(".mp4", "_processed.mp4")
        
        # Process the video
        success = process_video_advanced(temp_input_path, temp_output_path, detected_objects)
        
        if success and os.path.exists(temp_output_path):
            # Upload to MinIO
            minio_filename = f"processed_{uuid.uuid4()}.mp4"
            
            with open(temp_output_path, 'rb') as f:
                minio_client.put_object(
                    bucket_name="sitesense-processed",
                    object_name=minio_filename,
                    data=f,
                    length=os.path.getsize(temp_output_path),
                    content_type="video/mp4"
                )
            
            # Cleanup temp files
            os.unlink(temp_input_path)
            os.unlink(temp_output_path)
            
            return {
                "status": "success",
                "processed_url": f"http://localhost:9000/sitesense-processed/{minio_filename}",
                "object_types": detected_objects,
                "message": "Video processed successfully with enhanced browser compatibility"
            }
        else:
            # Cleanup temp files
            if os.path.exists(temp_input_path):
                os.unlink(temp_input_path)
            if os.path.exists(temp_output_path):
                os.unlink(temp_output_path)
            
            return {
                "status": "error",
                "message": "Failed to process video with browser-compatible encoding"
            }
            
    except Exception as e:
        logger.error(f"Video processing endpoint error: {e}")
        return {
            "status": "error", 
            "message": f"Video processing failed: {str(e)}"
        }
"""

print("Enhanced video processing code generated!")
print("\nTo use this:")
print("1. Install ffmpeg on your system: https://ffmpeg.org/download.html")
print("2. Replace your existing video processing route with the code above")
print("3. The new encoder will try H.264 with OpenCV first, then fallback to ffmpeg")
print("4. This ensures maximum browser compatibility")
