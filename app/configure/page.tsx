"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProcessingScreen } from "@/components/processing-screen";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
    pureMinIOService,
    MinIOFile,
    MinIOProcessingResult,
} from "@/lib/pure-minio-service";

interface ObjectSettings {
    blastRig: boolean;
    dumperTruck: boolean;
    excavator: boolean;
    car: boolean;
}

export default function ConfigurePage() {
    const router = useRouter();
    const [uploadedFiles, setUploadedFiles] = useState<MinIOFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedObjects, setSelectedObjects] = useState<
        Record<string, boolean>
    >({
        "Blast Rig": true,
        "Dumper Truck": true,
        Excavator: true,
        Car: true,
        "Traffic Cars": true,
    });

    useEffect(() => {
        const loadFiles = async () => {
            try {
                const files = await pureMinIOService.getFiles();
                if (!files || files.length === 0) {
                    router.push("/");
                    return;
                }

                setUploadedFiles(files);
            } catch (error) {
                console.error("Error loading files:", error);
                setError(
                    "Failed to load uploaded files. Please try uploading again."
                );
                // Clear invalid data
                pureMinIOService.clearAll();
                router.push("/");
            }
        };

        loadFiles();
    }, [router]);

    const handleProcess = async () => {
        if (!uploadedFiles.length) return;

        try {
            setIsProcessing(true);
            setError(null);

            // Get selected object types
            const selectedTypes = Object.entries(selectedObjects)
                .filter(([_, selected]) => selected)
                .map(([type]) => type);

            if (selectedTypes.length === 0) {
                throw new Error(
                    "Please select at least one object type to detect"
                );
            }

            console.log("Processing files with MinIO:", {
                fileCount: uploadedFiles.length,
                selectedTypes,
            });

            // Process each file using pure MinIO service
            const results: MinIOProcessingResult[] = await Promise.all(
                uploadedFiles.map(async (file) => {
                    try {
                        console.log(`Processing file: ${file.fileName}`);
                        return await pureMinIOService.processFile(
                            file,
                            selectedTypes
                        );
                    } catch (error) {
                        console.error(
                            `Error processing file ${file.fileName}:`,
                            error
                        );
                        throw new Error(
                            `Failed to process ${file.fileName}: ${
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error"
                            }`
                        );
                    }
                })
            );

            // Store results
            pureMinIOService.saveResults(results);

            // Navigate to results page
            router.push("/results");
        } catch (error) {
            console.error("Error processing files:", error);
            setError(
                error instanceof Error
                    ? error.message
                    : "Failed to process files"
            );
        } finally {
            setIsProcessing(false);
        }
    };

    if (isProcessing) {
        return (
            <div className="min-h-screen flex flex-col bg-gray-50">
                <Header />
                <ProcessingScreen />
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />

            <main className="container mx-auto px-4 py-8 flex-grow">
                <div className="max-w-7xl mx-auto">
                    {error && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="grid grid-cols-3 gap-4">
                                {uploadedFiles.map((file) => (
                                    <div key={file.id} className="relative">
                                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                            {file.type === "image" ? (
                                                <img
                                                    src={`/api/storage/download?bucket=${file.bucketName}&object=${file.objectName}`}
                                                    alt="Uploaded"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <video
                                                    src={`/api/storage/download?bucket=${file.bucketName}&object=${file.objectName}`}
                                                    className="w-full h-full object-cover"
                                                    muted
                                                />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg p-6 border">
                                <div className="flex items-center space-x-2 mb-4">
                                    <img
                                        src="/select.svg"
                                        alt="Select Object"
                                        width={120}
                                        height={140}
                                        className="object-contain mx-auto w-full"
                                    />
                                </div>
                                <p className="text-gray-600 text-sm mb-6">
                                    Enable or Disable the objects you want to
                                    annotate
                                </p>

                                <div className="space-y-6">
                                    {[
                                        {
                                            key: "Blast Rig",
                                            label: "Blast Rig",
                                            description:
                                                "Enable annotation for blast rigs in this file",
                                        },
                                        {
                                            key: "Dumper Truck",
                                            label: "Dumper Truck",
                                            description:
                                                "Enable annotation for dumper trucks in this file",
                                        },
                                        {
                                            key: "Excavator",
                                            label: "Excavator",
                                            description:
                                                "Enable annotation for excavators in this file",
                                        },
                                        {
                                            key: "Car",
                                            label: "Car",
                                            description:
                                                "Enable annotation for cars in this file",
                                        },
                                        {
                                            key: "Traffic Cars",
                                            label: "Traffic Cars",
                                            description:
                                                "Enable annotation for traffic cars in this file",
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.key}
                                            className="flex items-center justify-between"
                                        >
                                            <div className="flex-1">
                                                <h3 className="font-medium">
                                                    {item.label}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {item.description}
                                                </p>
                                            </div>
                                            <Switch
                                                checked={
                                                    selectedObjects[item.key]
                                                }
                                                onCheckedChange={(checked) => {
                                                    if (item.key === "Traffic Cars") {
                                                        // If Traffic Cars is selected, disable all others
                                                        setSelectedObjects({
                                                            "Blast Rig": false,
                                                            "Dumper Truck": false,
                                                            Excavator: false,
                                                            Car: false,
                                                            "Traffic Cars": checked,
                                                        });
                                                    } else {
                                                        // If any other option is selected, disable Traffic Cars
                                                        setSelectedObjects(
                                                            (prev) => ({
                                                                ...prev,
                                                                [item.key]: checked,
                                                                "Traffic Cars": checked ? false : prev["Traffic Cars"],
                                                            })
                                                        );
                                                    }
                                                }}
                                                disabled={
                                                    item.key !== "Traffic Cars" && 
                                                    selectedObjects["Traffic Cars"]
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>

                                <Button
                                    onClick={handleProcess}
                                    className="w-full mt-8 bg-[#AE4B4B] hover:bg-[#AE4B4B]/90"
                                    disabled={isProcessing}
                                >
                                    Start Processing
                                    <span className="ml-2">→</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
