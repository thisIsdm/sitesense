import { createBucket } from '../lib/minio-client';

async function initializeMinIOBuckets() {
    try {
        console.log('🚀 Initializing MinIO buckets...');
        
        // Create required buckets
        const buckets = [
            'sitesense-uploads',
            'sitesense-processed',
            'sitesense-backups'
        ];
        
        for (const bucket of buckets) {
            await createBucket(bucket);
            console.log(`✅ Bucket '${bucket}' created/verified`);
        }
        
        console.log('🎉 All MinIO buckets initialized successfully!');
        
    } catch (error) {
        console.error('❌ Failed to initialize MinIO buckets:', error);
        process.exit(1);
    }
}

// Run the initialization
initializeMinIOBuckets();
