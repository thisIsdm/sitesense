import { NextRequest, NextResponse } from "next/server";
import { createBucket, uploadFileFromBrowser } from "@/lib/minio-client";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const bucket =
            (formData.get("bucket") as string) || "sitesense-uploads";
        const objectName = formData.get("objectName") as string;

        if (!file) {
            return NextResponse.json(
                { error: "No file provided" },
                { status: 400 }
            );
        }

        // Ensure bucket exists
        await createBucket(bucket);

        // Upload file
        const result = await uploadFileFromBrowser(bucket, file, objectName);

        return NextResponse.json({
            success: true,
            url: result.url,
            objectName: result.objectName,
            size: result.size,
            type: result.type,
        });
    } catch (error) {
        console.error("MinIO upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file to MinIO" },
            { status: 500 }
        );
    }
}
