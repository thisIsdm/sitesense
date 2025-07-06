import { createBucket, uploadFile, getFile, deleteFile } from '../lib/minio-client';
import fs from 'fs';
import path from 'path';

async function testMinIOSetup() {
    try {
        console.log('🧪 Testing MinIO setup...');
        
        // Test bucket creation
        const testBucket = 'test-bucket';
        console.log('📁 Creating test bucket...');
        await createBucket(testBucket);
        console.log('✅ Bucket created successfully!');
        
        // Test file upload
        const testContent = Buffer.from('Hello MinIO! This is a test file.');
        const testFileName = 'test-file.txt';
        console.log('📤 Uploading test file...');
        const fileUrl = await uploadFile(testBucket, testFileName, testContent, 'text/plain');
        console.log('✅ File uploaded successfully!');
        console.log('🔗 File URL:', fileUrl);
        
        // Test file download
        console.log('📥 Downloading test file...');
        const downloadedFile = await getFile(testBucket, testFileName);
        console.log('✅ File downloaded successfully!');
        
        // Test file deletion
        console.log('🗑️ Deleting test file...');
        await deleteFile(testBucket, testFileName);
        console.log('✅ File deleted successfully!');
        
        console.log('🎉 All MinIO tests passed! Your setup is working correctly.');
        
    } catch (error) {
        console.error('❌ MinIO test failed:', error);
        console.log('💡 Make sure MinIO server is running on localhost:9000');
    }
}

// Run the test
testMinIOSetup();
