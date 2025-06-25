"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    pureMinIOService,
    MinIOFile,
    MinIOProcessingResult,
} from "@/lib/pure-minio-service";
import {
    ReactCompareSlider,
    ReactCompareSliderImage,
} from "react-compare-slider";
import VideoPlayer from "@/components/video-player";

export default function ResultsPage() {
    const router = useRouter();
    const [uploadedFiles, setUploadedFiles] = useState<MinIOFile[]>([]);
    const [results, setResults] = useState<MinIOProcessingResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [selectedFileIndex, setSelectedFileIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [videoMode, setVideoMode] = useState(false);

    const currentResult = results[selectedFileIndex];
    const currentFile = uploadedFiles[selectedFileIndex];

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                console.log("Loading data for results page...");

                const files = pureMinIOService.getFiles();
                const processingResults = pureMinIOService.getResults();

                console.log("Loaded data:", {
                    filesCount: files?.length,
                    resultsCount: processingResults?.length,
                });

                if (!files || files.length === 0) {
                    console.log("No files found, redirecting to home");
                    router.push("/");
                    return;
                }

                setUploadedFiles(files);
                setResults(processingResults);
            } catch (error) {
                console.error("Error loading data:", error);
                setError("Failed to load results. Please try again.");
                pureMinIOService.clearAll();
                router.push("/");
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [router]);

    const handleNewUpload = () => {
        pureMinIOService.clearAll();
        router.push("/");
    };

    const handleConfigureAgain = () => {
        router.push("/configure");
    };

    useEffect(() => {
        console.log("RESULTS", results);

        const foundVideoIndex = results.findIndex((result) => {
            return result.type === "video";
        });

        if (foundVideoIndex !== -1) {
            setVideoMode(true);
            setSelectedFileIndex(foundVideoIndex);
        } else {
            setVideoMode(false);
        }
    }, [results]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Loading results...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!currentResult || !currentFile) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <main className="container mx-auto px-4 py-8 flex-grow">
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">
                            No Results Found
                        </h1>
                        <p className="text-gray-600 mb-8">
                            Please upload and process some files first.
                        </p>
                        <Button onClick={handleNewUpload}>
                            Start New Upload
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    // Get file URLs using download API to avoid 403 errors
    const getOriginalFileUrl = (file: MinIOFile) => {
        return `/api/storage/download?bucket=${
            file.bucketName
        }&object=${encodeURIComponent(file.objectName)}`;
    };

    const getProcessedFileUrl = (result: MinIOProcessingResult) => {
        // Extract bucket and object from processed URL
        const urlParts = result.processedUrl.split("/");
        const objectName = urlParts[urlParts.length - 1];
        return `/api/storage/download?bucket=sitesense-processed&object=${encodeURIComponent(
            objectName
        )}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="container mx-auto px-4 py-8 flex-grow">
                <div className="max-w-7xl mx-auto">
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {/* Results Display */}
                    <div
                        className={`${
                            videoMode ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                        } grid gap-8`}
                    >
                        {!videoMode && (
                            <div className="bg-white rounded-lg p-6 border grid grid-cols-2 md:grid-cols-3 gap-4">
                                {results.map((result, index) => (
                                    <button
                                        className="bg-[#F3F3F3] p-2 aspect-square rounded-lg"
                                        onClick={() =>
                                            setSelectedFileIndex(index)
                                        }
                                        key={index}
                                        style={{
                                            backgroundImage: `url(${getProcessedFileUrl(
                                                result
                                            )})`,
                                            backgroundSize: "contain",
                                            backgroundPosition: "center center",
                                            backgroundRepeat: "no-repeat",
                                        }}
                                    ></button>
                                ))}
                            </div>
                        )}
                        <div
                            className={`${
                                videoMode ? "bg-white" : "bg-[#F3F3F3]"
                            } rounded-lg p-6 border`}
                        >
                            <h2 className="text-xl font-semibold mb-6">
                                {currentFile.fileName}
                            </h2>

                            {currentFile.type === "image" ? (
                                <div className="space-y-6">
                                    <div className="w-full max-w-4xl mx-auto">
                                        <ReactCompareSlider
                                            itemOne={
                                                <ReactCompareSliderImage
                                                    src={getOriginalFileUrl(
                                                        currentFile
                                                    )}
                                                    alt="Original"
                                                />
                                            }
                                            itemTwo={
                                                <ReactCompareSliderImage
                                                    src={getProcessedFileUrl(
                                                        currentResult
                                                    )}
                                                    alt="Processed"
                                                />
                                            }
                                            position={50}
                                            className="w-full h-auto rounded-lg overflow-hidden"
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">
                                            Drag the slider to compare original
                                            vs processed image
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h3 className="text-lg font-medium mb-3">
                                                Original Video
                                            </h3>
                                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                                <VideoPlayer
                                                    src={getOriginalFileUrl(
                                                        currentFile
                                                    )}
                                                    title={`Original - ${currentFile.fileName}`}
                                                    className="aspect-video"
                                                    onError={(error) => {
                                                        console.error(
                                                            "Original video error:",
                                                            error
                                                        );
                                                        setError(
                                                            "Unable to play original video. You can still download it."
                                                        );
                                                    }}
                                                    onReady={() => {
                                                        console.log(
                                                            "✅ Original video player ready"
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-medium mb-3">
                                                Processed Video
                                            </h3>
                                            <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                                <VideoPlayer
                                                    src={getProcessedFileUrl(
                                                        currentResult
                                                    )}
                                                    title={`Processed - ${currentFile.fileName}`}
                                                    className="aspect-video"
                                                    onError={(error) => {
                                                        console.error(
                                                            "Processed video error:",
                                                            error
                                                        );
                                                        setError(
                                                            "Processed video format may not be supported by your browser. The video was processed successfully but cannot be played. Try downloading it instead."
                                                        );
                                                    }}
                                                    onReady={() => {
                                                        console.log(
                                                            "✅ Processed video player ready"
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Processing Info */}
                            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                                <h3 className="text-lg font-medium mb-3">
                                    Information
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">
                                            File Type:
                                        </span>{" "}
                                        {currentFile.type}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            File Size:
                                        </span>{" "}
                                        {(
                                            currentFile.fileSize /
                                            1024 /
                                            1024
                                        ).toFixed(2)}{" "}
                                        MB
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Detected Objects:
                                        </span>{" "}
                                        {currentResult.objectTypes.join(", ")}
                                    </div>
                                    <div>
                                        <span className="font-medium">
                                            Processed At:
                                        </span>{" "}
                                        {new Date(
                                            currentResult.timestamp
                                        ).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end mt-8">
                        <div className="flex space-x-4">
                            <Button
                                variant="outline"
                                onClick={handleConfigureAgain}
                            >
                                Configure Again
                            </Button>
                            <Button onClick={handleNewUpload}>
                                New Upload
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
