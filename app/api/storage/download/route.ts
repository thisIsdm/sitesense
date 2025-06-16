import { NextRequest, NextResponse } from 'next/server'
import { getFile } from '@/lib/minio-client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bucket = searchParams.get('bucket')
    const objectName = searchParams.get('object')

    if (!bucket || !objectName) {
      return NextResponse.json(
        { error: 'Bucket and object name are required' }, 
        { status: 400 }
      )
    }

    const fileStream = await getFile(bucket, objectName)
    
    // Convert stream to buffer
    const chunks: any[] = []
    for await (const chunk of fileStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Return the file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${objectName}"`
      }
    })

  } catch (error) {
    console.error('MinIO download error:', error)
    return NextResponse.json(
      { error: 'Failed to download file from MinIO' }, 
      { status: 500 }
    )
  }
}
