#!/usr/bin/env node

// Script to properly set up MinIO buckets with correct policies
import { minioClient } from '../lib/minio-client'

const BUCKETS = [
  'sitesense-uploads',
  'sitesense-processed', 
  'sitesense-backups'
]

// Public read policy template
const getPublicReadPolicy = (bucketName: string) => ({
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: ['*'] },
      Action: ['s3:GetObject'],
      Resource: [`arn:aws:s3:::${bucketName}/*`]
    }
  ]
})

async function setupBuckets() {
  try {
    console.log('🚀 Setting up MinIO buckets...')

    for (const bucketName of BUCKETS) {
      try {
        // Check if bucket exists
        const exists = await minioClient.bucketExists(bucketName)
        
        if (!exists) {
          console.log(`📦 Creating bucket: ${bucketName}`)
          await minioClient.makeBucket(bucketName, 'us-east-1')
        } else {
          console.log(`✅ Bucket already exists: ${bucketName}`)
        }

        // Set public read policy
        const policy = getPublicReadPolicy(bucketName)
        console.log(`🔧 Setting public read policy for: ${bucketName}`)
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy))
        console.log(`✅ Policy set for: ${bucketName}`)

      } catch (error) {
        console.error(`❌ Error setting up bucket ${bucketName}:`, error)
        // Continue with other buckets
      }
    }

    console.log('🎉 MinIO bucket setup completed!')
    
    // Test bucket access
    console.log('\n🧪 Testing bucket access...')
    for (const bucketName of BUCKETS) {
      try {
        const policy = await minioClient.getBucketPolicy(bucketName)
        console.log(`✅ ${bucketName}: Policy active`)
      } catch (error) {
        console.log(`⚠️ ${bucketName}: Policy check failed`)
      }
    }

  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  setupBuckets()
}

export { setupBuckets }
