import { NextRequest, NextResponse } from 'next/server'
import { listFiles } from '@/lib/minio-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const prefix = searchParams.get('prefix')

    if (!bucket) {
      return NextResponse.json(
        { error: 'Bucket name is required' }, 
        { status: 400 }
      )
    }

    const files = await listFiles(bucket, prefix || undefined)

    return NextResponse.json(files)

  } catch (error) {
    console.error('MinIO list error:', error)
    return NextResponse.json(
      { error: 'Failed to list files from MinIO' }, 
      { status: 500 }
    )
  }
}
