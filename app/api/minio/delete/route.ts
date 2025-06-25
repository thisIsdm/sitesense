import { NextRequest, NextResponse } from "next/server";
import { deleteFile } from "@/lib/minio-client";
import { auth } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
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

        const { bucketName, objectName } = await request.json();

        if (!bucketName || !objectName) {
            return NextResponse.json(
                { error: "Bucket name and object name are required" },
                { status: 400 }
            );
        }

        await deleteFile(bucketName, objectName);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("MinIO delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete file from MinIO" },
            { status: 500 }
        );
    }
}
