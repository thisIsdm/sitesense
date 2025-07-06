# MinIO Setup Guide for SiteSense

This guide will help you set up MinIO (S3-compatible object storage) for your SiteSense project.

## 🚀 Quick Start

### Option 1: Using Docker (Recommended)

1. **Start MinIO server:**
   ```bash
   pnpm minio:start
   ```

2. **Access MinIO Console:**
   - Open your browser and go to: http://localhost:9001
   - Username: `minioadmin`
   - Password: `minioadmin`

3. **Test the setup:**
   ```bash
   pnpm minio:test
   ```

4. **Stop MinIO server:**
   ```bash
   pnpm minio:stop
   ```

### Option 2: Using Direct Download (Windows)

1. **Start MinIO server:**
   - Double-click `start-minio.bat`
   - Or run in PowerShell: `.\start-minio.ps1`

2. **Access MinIO Console:**
   - Open your browser and go to: http://localhost:9001
   - Username: `minioadmin`
   - Password: `minioadmin`

## 📁 Project Structure

```
├── lib/
│   └── minio-client.ts      # MinIO client configuration
├── scripts/
│   └── test-minio.ts        # Test script for MinIO setup
├── minio-data/              # Local MinIO data storage
├── docker-compose.yml       # Docker configuration
├── start-minio.ps1         # PowerShell startup script
├── start-minio.bat         # Batch file for easy startup
└── .env.local              # Environment variables
```

## 🔧 Configuration

### Environment Variables (.env.local)

```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Next.js Configuration
NEXT_PUBLIC_MINIO_ENDPOINT=localhost
NEXT_PUBLIC_MINIO_PORT=9000
```

### Available npm Scripts

- `pnpm minio:start` - Start MinIO using Docker
- `pnpm minio:stop` - Stop MinIO Docker container
- `pnpm minio:logs` - View MinIO logs
- `pnpm minio:test` - Test MinIO connection and operations

## 📝 Usage Examples

### Basic Operations

```typescript
import { createBucket, uploadFile, getFile, deleteFile } from '@/lib/minio-client';

// Create a bucket
await createBucket('my-bucket');

// Upload a file
const fileBuffer = Buffer.from('Hello World!');
const fileUrl = await uploadFile('my-bucket', 'hello.txt', fileBuffer, 'text/plain');

// Download a file
const fileStream = await getFile('my-bucket', 'hello.txt');

// Delete a file
await deleteFile('my-bucket', 'hello.txt');
```

### File Upload Component Example

```typescript
// components/file-upload.tsx
import { uploadFile, createBucket } from '@/lib/minio-client';

const handleFileUpload = async (file: File) => {
  try {
    // Ensure bucket exists
    await createBucket('uploads');
    
    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    
    // Upload file
    const fileUrl = await uploadFile(
      'uploads',
      `${Date.now()}-${file.name}`,
      Buffer.from(buffer),
      file.type
    );
    
    console.log('File uploaded:', fileUrl);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## 🔍 Troubleshooting

### Common Issues

1. **Port already in use:**
   - Make sure no other service is running on ports 9000 or 9001
   - Use `netstat -an | findstr 9000` to check

2. **Docker not found:**
   - Install Docker Desktop for Windows
   - Or use the PowerShell script option

3. **Permission denied:**
   - Run PowerShell as Administrator
   - Or change execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

4. **Connection refused:**
   - Ensure MinIO server is running
   - Check if Windows Firewall is blocking the ports

### Checking MinIO Status

```bash
# View running containers
docker ps

# View MinIO logs
pnpm minio:logs

# Test connection
pnpm minio:test
```

## 🛡️ Security Notes

- Default credentials (`minioadmin/minioadmin`) are for development only
- Change credentials for production use
- Consider using environment-specific configuration files
- Enable SSL/TLS for production deployments

## 📚 Additional Resources

- [MinIO Documentation](https://docs.min.io/)
- [MinIO JavaScript SDK](https://docs.min.io/docs/javascript-client-quickstart-guide.html)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 🆘 Need Help?

If you encounter any issues:

1. Check the MinIO console at http://localhost:9001
2. Run the test script: `pnpm minio:test`
3. Check Docker logs: `pnpm minio:logs`
4. Ensure all environment variables are set correctly
