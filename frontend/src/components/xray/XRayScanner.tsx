import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MedicalButton } from '../medical/MedicalButton';
import { Camera as CameraIcon, Upload, Trash2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface XRayScannerProps {
    patientId?: string;
}

export const XRayScanner: React.FC<XRayScannerProps> = ({ patientId }) => {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const takePhoto = async () => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: true, // This provides the cropping/rotation UI natively!
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera,
                saveToGallery: true,
            });

            if (image.base64String) {
                setCapturedImage(`data:image/${image.format};base64,${image.base64String}`);
                toast({
                    title: "Capture successful",
                    description: "Image has been captured and pre-processed.",
                });
            }
        } catch (error) {
            console.error('Camera error:', error);
            toast({
                title: "Scan Cancelled",
                description: "Camera was closed without capturing.",
                variant: "destructive"
            });
        }
    };

    const handleAnalyze = () => {
        if (!capturedImage) return;

        // Pass the scanned image to the XRayAnnotation page
        navigate('/xray-annotation', {
            state: {
                imageSrc: capturedImage,
                imageName: `Mobile_Scan_${new Date().toLocaleDateString()}.jpg`,
                patientId: patientId
            }
        });
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full p-4">
            {!capturedImage ? (
                <MedicalButton
                    variant="primary"
                    size="lg"
                    onClick={takePhoto}
                    className="w-full max-w-sm h-32 flex-col gap-2 border-dashed border-2"
                    leftIcon={<CameraIcon className="h-8 w-8" />}
                >
                    <span className="text-lg">Scan New X-Ray</span>
                    <span className="text-xs opacity-60">Use native camera with auto-crop</span>
                </MedicalButton>
            ) : (
                <div className="w-full max-w-sm space-y-4">
                    <div className="relative rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-black aspect-[3/4]">
                        <img
                            src={capturedImage}
                            alt="Scanned X-Ray"
                            className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 right-2 flex gap-2">
                            <button
                                onClick={() => setCapturedImage(null)}
                                className="p-2 bg-destructive text-white rounded-full shadow-lg"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <MedicalButton
                            variant="outline"
                            className="flex-1"
                            onClick={() => setCapturedImage(null)}
                            leftIcon={<Upload className="h-4 w-4" />}
                        >
                            Retake
                        </MedicalButton>
                        <MedicalButton
                            variant="success"
                            className="flex-1"
                            onClick={handleAnalyze}
                            leftIcon={<Check className="h-4 w-4" />}
                        >
                            Analyze Scan
                        </MedicalButton>
                    </div>
                </div>
            )}
        </div>
    );
};
