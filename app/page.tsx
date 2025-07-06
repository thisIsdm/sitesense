"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { pureMinIOService, MinIOFile } from "@/lib/pure-minio-service";
import ProtectedRoute from "@/components/protectedRoute";

interface UploadedFile extends MinIOFile {
    // Use MinIOFile interface
}

export default function HomePage() {
    const router = useRouter();
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const MAX_FILES = 10;
    // const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file - REMOVED
    const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total

    const handleFileSelect = useCallback(
        async (files: FileList) => {
            const fileArray = Array.from(files);

            if (fileArray.length === 0) return;

            // Check file count limit
            if (uploadedFiles.length + fileArray.length > MAX_FILES) {
                setAlertMessage("Cannot upload more than 10 files!");
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 5000);
                return;
            }

            // Check total size (including existing files)
            const currentTotalSize = uploadedFiles.reduce(
                (acc, file) => acc + file.fileSize,
                0
            );
            const newFilesTotalSize = fileArray.reduce(
                (acc, file) => acc + file.size,
                0
            );
            if (currentTotalSize + newFilesTotalSize > MAX_TOTAL_SIZE) {
                setAlertMessage("Total upload size cannot exceed 500MB!");
                setShowAlert(true);
                setTimeout(() => setShowAlert(false), 5000);
                return;
            }

            setIsUploading(true);
            setUploadProgress(0);

            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(progressInterval);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 200);

            try {
                // Upload files directly to MinIO
                const uploadedFiles = await pureMinIOService.uploadFiles(
                    fileArray
                );

                setUploadedFiles(uploadedFiles);
                setIsUploading(false);
                setUploadProgress(0);

                // Navigate to configure page
                router.push("/configure");
            } catch (error) {
                console.error("Error processing files:", error);
                setAlertMessage(
                    "Error uploading files to storage. Please try again."
                );
                setShowAlert(true);
                setIsUploading(false);
                setUploadProgress(0);
            }
        },
        [uploadedFiles.length, router]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    if (isUploading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen flex flex-col bg-gray-50">
                    <Header />
                    <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
                        <div className="max-w-md w-full">
                            <div className="bg-white p-8 rounded-lg border shadow-sm">
                                <div className="flex flex-col items-center space-y-6">
                                    <div className="w-16 h-16 bg-[#AE4B4B]/10 rounded-full flex items-center justify-center">
                                        <Upload className="w-8 h-8 text-[#AE4B4B] animate-pulse" />
                                    </div>
                                    <div className="text-center">
                                        <h2 className="text-xl font-semibold text-gray-900">
                                            Uploading Files
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Please wait while we upload your
                                            files...
                                        </p>
                                    </div>
                                    <div className="w-full">
                                        <Progress
                                            value={uploadProgress}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-gray-500 mt-2 text-center">
                                            {uploadProgress}% Complete
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                    <Footer />
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />

                <main className="container mx-auto px-4 py-8 flex-grow">
                    <div className="max-w-4xl mx-auto">
                        {showAlert && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {alertMessage}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="text-center mb-8">
                            <div className="flex justify-center mb-4">
                                <Image
                                    src="/logo.png"
                                    alt="SiteSenseAI"
                                    width={400}
                                    height={80}
                                />
                            </div>
                            <p className="text-gray-600">
                                Turn site images into actionable insights
                            </p>
                        </div>

                        <div
                            className="border-2 border-dashed border-[#AE4B4B] rounded-lg p-12 text-center bg-white"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <div className="flex flex-col items-center space-y-4">
                                <div className="w-16 h-16 bg-[#AE4B4B]/10 rounded-full flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-[#AE4B4B]" />
                                </div>
                                <div>
                                    <p className="text-lg font-medium text-gray-900">
                                        Drop your files here or{" "}
                                        <button
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="text-[#AE4B4B] hover:underline"
                                        >
                                            browse
                                        </button>
                                    </p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Upload your image or video in jpeg, png,
                                        or mp4
                                        <br />
                                        Maximum file size: 50 MB
                                    </p>
                                </div>
                                <Button
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload
                                </Button>
                            </div>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={(e) =>
                                e.target.files &&
                                handleFileSelect(e.target.files)
                            }
                        />
                    </div>
                </main>

                <Footer />
            </div>
        </ProtectedRoute>
    );
}
