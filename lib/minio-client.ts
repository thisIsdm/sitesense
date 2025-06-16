import * as Minio from 'minio';

// Initialize MinIO client
const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
});

// Create bucket if it doesn't exist
const createBucket = async (bucketName: string) => {
    try {
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`Bucket ${bucketName} created successfully`);
        }
    } catch (error) {
        console.error('Error creating bucket:', error);
        throw error;
    }
};

// Upload file to MinIO
const uploadFile = async (bucketName: string, objectName: string, file: Buffer, contentType: string) => {
    try {
        await minioClient.putObject(bucketName, objectName, file, undefined, {
            'Content-Type': contentType
        });
        return `http://localhost:9000/${bucketName}/${objectName}`;
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

// Get file from MinIO
const getFile = async (bucketName: string, objectName: string) => {
    try {
        return await minioClient.getObject(bucketName, objectName);
    } catch (error) {
        console.error('Error getting file:', error);
        throw error;
    }
};

// Delete file from MinIO
const deleteFile = async (bucketName: string, objectName: string) => {
    try {
        await minioClient.removeObject(bucketName, objectName);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

// Get file URL for public access
const getFileUrl = (bucketName: string, objectName: string) => {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
    return `${protocol}://${endpoint}:${port}/${bucketName}/${objectName}`;
};

// List files in bucket
const listFiles = async (bucketName: string, prefix?: string) => {
    try {
        const objectsList: any[] = [];
        const stream = minioClient.listObjects(bucketName, prefix, true);
        
        return new Promise((resolve, reject) => {
            stream.on('data', (obj) => objectsList.push(obj));
            stream.on('error', reject);
            stream.on('end', () => resolve(objectsList));
        });
    } catch (error) {
        console.error('Error listing files:', error);
        throw error;
    }
};

// Upload file from browser File object
const uploadFileFromBrowser = async (bucketName: string, file: File, objectName?: string) => {
    try {
        const fileName = objectName || `${Date.now()}-${file.name}`;
        const buffer = await file.arrayBuffer();
        
        await minioClient.putObject(bucketName, fileName, Buffer.from(buffer), undefined, {
            'Content-Type': file.type,
            'Content-Length': file.size
        });
        
        return {
            url: getFileUrl(bucketName, fileName),
            objectName: fileName,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export { 
    minioClient, 
    createBucket, 
    uploadFile, 
    getFile, 
    deleteFile, 
    getFileUrl, 
    listFiles, 
    uploadFileFromBrowser 
};