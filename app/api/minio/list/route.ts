import { NextRequest, NextResponse } from "next/server";
import { listFiles } from "@/lib/minio-client";
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
        const prefix = searchParams.get("prefix");

        if (!bucket) {
            return NextResponse.json(
                { error: "Bucket name is required" },
                { status: 400 }
            );
        }

        const files = await listFiles(bucket, prefix || undefined);

        return NextResponse.json(files);
    } catch (error) {
        console.error("MinIO list error:", error);
        return NextResponse.json(
            { error: "Failed to list files from MinIO" },
            { status: 500 }
        );
    }
}
