# MinIO Server Startup Script for Windows
# This script downloads and runs MinIO server locally

# Create minio directory if it doesn't exist
if (!(Test-Path ".\minio-server")) {
    New-Item -ItemType Directory -Path ".\minio-server"
}

# Download MinIO server if not exists
$minioExe = ".\minio-server\minio.exe"
if (!(Test-Path $minioExe)) {
    Write-Host "Downloading MinIO server..."
    Invoke-WebRequest -Uri "https://dl.min.io/server/minio/release/windows-amd64/minio.exe" -OutFile $minioExe
    Write-Host "MinIO server downloaded successfully!"
}

# Set environment variables
$env:MINIO_ROOT_USER = "minioadmin"
$env:MINIO_ROOT_PASSWORD = "minioadmin"

# Start MinIO server
Write-Host "Starting MinIO server..."
Write-Host "MinIO Console will be available at: http://localhost:9001"
Write-Host "MinIO API will be available at: http://localhost:9000"
Write-Host "Username: minioadmin"
Write-Host "Password: minioadmin"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"

& $minioExe server .\minio-data --console-address ":9001"
