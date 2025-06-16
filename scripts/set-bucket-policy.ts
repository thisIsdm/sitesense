import { minioClient } from '../lib/minio-client';

async function setBucketPolicy() {
    try {
        console.log('🔧 Setting MinIO bucket policies for public read access...');
        
        // Policy to allow public read access
        const policy = {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: ['arn:aws:s3:::sitesense-uploads/*']
                },
                {
                    Effect: 'Allow',
                    Principal: { AWS: ['*'] },
                    Action: ['s3:GetObject'],
                    Resource: ['arn:aws:s3:::sitesense-processed/*']
                }
            ]
        };

        await minioClient.setBucketPolicy('sitesense-uploads', JSON.stringify(policy));
        console.log('✅ Policy set for sitesense-uploads bucket');

        await minioClient.setBucketPolicy('sitesense-processed', JSON.stringify(policy));
        console.log('✅ Policy set for sitesense-processed bucket');
        
        console.log('🎉 Bucket policies configured successfully!');
        
    } catch (error) {
        console.error('❌ Failed to set bucket policies:', error);
        console.log('💡 Note: You can also set policies via MinIO Console at http://localhost:9001');
    }
}

setBucketPolicy();
