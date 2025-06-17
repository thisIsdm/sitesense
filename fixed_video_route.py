# FIXED Video Route - Replace your current video route with this
@app.post("/detect/video/{classes}", response_class=StreamingResponse)
async def detect_video(
    classes: str,
    file: UploadFile = File(...),
    conf: float = 0.25,
):
    tic = time.time()
    ids = parse_classes(classes)

    ext = file.filename.split(".")[-1].lower()
    if ext not in {"mp4", "mov", "avi"}:
        raise HTTPException(400, "Upload an MP4, MOV, or AVI video.")

    # Save upload to temp file
    tmp_in = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    tmp_in.write(await file.read())
    tmp_in.close()

    cap = cv2.VideoCapture(tmp_in.name)
    if not cap.isOpened():
        os.remove(tmp_in.name)
        raise HTTPException(400, "Could not open video; unsupported codec?")

    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    w   = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h   = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Ensure dimensions are even numbers (required for many codecs)
    if w % 2 != 0:
        w -= 1
    if h % 2 != 0:
        h -= 1

    ok, _ = cap.read()
    if not ok:
        cap.release()
        os.remove(tmp_in.name)
        raise HTTPException(400, "Failed to decode any frames (re-encode video).")
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    tmp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4")
    
    # Simplified codec selection - try the most reliable ones
    writer = None
    used_codec = "unknown"
    
    # Try codecs in order of reliability
    codecs = [
        ("mp4v", "MPEG-4"),  # Most compatible (your original)
        ("XVID", "Xvid"),    # Very reliable fallback
        ("MJPG", "Motion JPEG"),  # Universal fallback
    ]
    
    for codec_fourcc, codec_name in codecs:
        try:
            print(f"🔄 Trying codec: {codec_name} ({codec_fourcc})")
            fourcc = cv2.VideoWriter_fourcc(*codec_fourcc)
            writer = cv2.VideoWriter(tmp_out.name, fourcc, fps, (w, h))
            
            if writer.isOpened():
                # Test with a dummy frame
                test_frame = np.zeros((h, w, 3), dtype=np.uint8)
                success = writer.write(test_frame)
                
                if success is not False:  # None or True means success
                    used_codec = codec_name
                    print(f"✅ Using codec: {codec_name}")
                    # Reset the writer for actual use
                    writer.release()
                    writer = cv2.VideoWriter(tmp_out.name, fourcc, fps, (w, h))
                    break
                else:
                    print(f"❌ Test write failed for {codec_name}")
                    writer.release()
                    writer = None
            else:
                print(f"❌ Could not open writer for {codec_name}")
                if writer:
                    writer.release()
                    writer = None
                    
        except Exception as e:
            print(f"❌ Exception with codec {codec_name}: {e}")
            if writer:
                writer.release()
                writer = None

    if not writer or not writer.isOpened():
        cap.release()
        os.remove(tmp_in.name)
        raise HTTPException(500, f"Could not initialize video writer. Dimensions: {w}x{h}, FPS: {fps}")

    print(f"📹 Processing video: {w}x{h} @ {fps:.1f}fps using {used_codec}")
    
    try:
        idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Ensure frame has correct dimensions
            if frame.shape[:2] != (h, w):
                frame = cv2.resize(frame, (w, h))
                
            # Process frame
            pil = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            pil = detect_and_draw(pil, ids, conf)
            processed_frame = cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
            
            # Write frame
            success = writer.write(processed_frame)
            if success is False:
                print(f"⚠️ Warning: Frame {idx} write failed")
                
            idx += 1
            if idx % 30 == 0:
                print(f"Processed {idx} frames…")

    except Exception as e:
        print(f"❌ Error during processing: {e}")
        cap.release()
        writer.release()
        os.remove(tmp_in.name)
        os.remove(tmp_out.name)
        raise HTTPException(500, f"Error during video processing: {str(e)}")

    cap.release()
    writer.release()
    
    # Check output file
    if not os.path.exists(tmp_out.name):
        os.remove(tmp_in.name)
        raise HTTPException(500, "Output video file was not created")
        
    file_size = os.path.getsize(tmp_out.name)
    if file_size == 0:
        os.remove(tmp_in.name)
        os.remove(tmp_out.name)
        raise HTTPException(500, "Output video file is empty")
    
    print(f"✅ Video done in {time.time()-tic:.2f}s ({idx} frames, {file_size} bytes) using {used_codec}")

    headers = {"Content-Disposition": 'attachment; filename="result.mp4"'}
    return StreamingResponse(
        stream_and_cleanup(tmp_out.name, tmp_in.name),
        media_type="video/mp4",
        headers=headers,
    )
