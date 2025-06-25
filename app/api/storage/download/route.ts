import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/minio-client";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        if (session == null) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const bucket = searchParams.get("bucket");
        const objectName = searchParams.get("object");

        if (!bucket || !objectName) {
            return NextResponse.json(
                { error: "Bucket and object name are required" },
                { status: 400 }
            );
        }

        console.log(`📥 Downloading: ${objectName} from bucket: ${bucket}`);
        const fileStream = await getFile(bucket, objectName);

        // Convert stream to buffer
        const chunks: any[] = [];
        for await (const chunk of fileStream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        console.log(`✅ Downloaded: ${buffer.length} bytes`);

        // Determine content type based on file extension
        const fileExtension = objectName.toLowerCase().split(".").pop();
        let contentType = "application/octet-stream";

        if (fileExtension === "mp4" || fileExtension === "mov") {
            contentType = "video/mp4";
        } else if (fileExtension === "avi") {
            contentType = "video/avi";
        } else if (fileExtension === "jpg" || fileExtension === "jpeg") {
            contentType = "image/jpeg";
        } else if (fileExtension === "png") {
            contentType = "image/png";
        }

        // Handle range requests for video streaming
        const range = request.headers.get("range");
        const fileSize = buffer.length;

        if (
            range &&
            (contentType.startsWith("video/") ||
                contentType.startsWith("audio/"))
        ) {
            // Parse range header
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunkSize = end - start + 1;
            const chunk = buffer.slice(start, end + 1);

            console.log(
                `📺 Range request: ${start}-${end}/${fileSize} (${chunkSize} bytes)`
            );

            return new NextResponse(chunk, {
                status: 206, // Partial Content
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": chunkSize.toString(),
                    "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                },
            });
        }

        // Return the full file with proper headers
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": buffer.length.toString(),
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
                "Accept-Ranges": "bytes", // Enable video seeking
            },
        });
    } catch (error) {
        console.error("❌ MinIO download error:", error);
        return NextResponse.json(
            { error: "Failed to download file from MinIO" },
            { status: 500 }
        );
    }
}
