import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { MedicalButton } from '../medical/MedicalButton';
import { Camera as CameraIcon, Upload, Trash2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { useCallback } from 'react';
import getCroppedImg from '@/lib/cropImage';
import { RotateCw, CornerUpLeft } from 'lucide-react';

interface XRayScannerProps {
    patientId?: string;
}

export const XRayScanner: React.FC<XRayScannerProps> = ({ patientId }) => {
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const captureImage = async (source: CameraSource) => {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false, // User requested natively skipping crop
                resultType: CameraResultType.Base64,
                source: source,
                saveToGallery: false, // Save to gallery is for Camera only, handled natively
            });

            if (image.base64String) {
                setCapturedImage(`data:image/${image.format};base64,${image.base64String}`);
                toast({
                    title: "Image loaded",
                    description: "X-Ray has been loaded successfully.",
                });
            }
        } catch (error) {
            console.error('Camera error:', error);
            toast({
                title: "Scan Cancelled",
                description: "Operation was aborted.",
                variant: "destructive"
            });
        }
    };

    const handleProceed = async () => {
        if (!capturedImage || !croppedAreaPixels) return;
        setIsProcessing(true);
        try {
            const finalImage = await getCroppedImg(capturedImage, croppedAreaPixels, rotation);
            navigate('/xray-annotation', {
                state: {
                    imageSrc: finalImage,
                    imageName: `Mobile_Scan_${new Date().toLocaleDateString()}.jpg`,
                    patientId: patientId
                }
            });
        } catch (e) {
            console.error(e);
            toast({ title: "Error cropping", description: "Failed to crop image properly", variant: "destructive" });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full h-full relative">
            {!capturedImage ? (
                <div className="flex-1 flex flex-col items-center justify-center p-4 mt-6 w-full">
                    <h2 className="text-2xl font-black mb-1 text-center tracking-tight text-foreground">Upload Spinal X-Ray</h2>
                    <p className="text-muted-foreground text-sm mb-8 text-center">Upload or capture a spinal X-ray to begin analysis</p>

                    <div className="w-full flex flex-col gap-4 max-w-sm">
                        <MedicalButton
                            variant="primary"
                            size="lg"
                            onClick={() => captureImage(CameraSource.Camera)}
                            className="w-full h-16 flex-row items-center justify-center gap-4 rounded-2xl shadow-xl hover:scale-[1.02] transition-all bg-[#0F766E] border-none"
                            leftIcon={<CameraIcon className="h-6 w-6 text-white opacity-90" />}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black uppercase tracking-widest text-white">Capture X-Ray</span>
                            </div>
                        </MedicalButton>

                        <MedicalButton
                            variant="outline"
                            size="lg"
                            onClick={() => captureImage(CameraSource.Photos)}
                            className="w-full h-16 flex-row items-center justify-center gap-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-all border-2 border-border bg-card"
                            leftIcon={<Upload className="h-6 w-6 text-primary opacity-90" />}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black uppercase tracking-widest text-foreground">Upload From Gallery</span>
                            </div>
                        </MedicalButton>
                    </div>
                </div>
            ) : (
                <div className="fixed inset-0 z-50 bg-black flex flex-col pt-12 pb-8 px-4 w-screen h-screen">
                    <div className="flex items-center justify-between mb-4 mt-2 px-2 z-50 relative pointer-events-auto">
                        <button
                            onClick={() => { setCapturedImage(null); setRotation(0); setZoom(1); }}
                            className="p-3 bg-white/10 text-white rounded-full border border-white/20 active:scale-95"
                        >
                            <Trash2 size={24} />
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRotation((prev) => prev + 90)}
                                className="px-5 py-3 bg-secondary text-secondary-foreground font-black uppercase text-[10px] tracking-widest rounded-full shadow-lg border border-white/10 flex flex-row items-center gap-2 active:scale-95 transition-all"
                            >
                                <RotateCw size={16} /> Rotate
                            </button>
                            <MedicalButton
                                variant="success"
                                className="px-6 py-3 rounded-full text-[10px] uppercase tracking-widest font-black shadow-xl border border-white/10 active:scale-95 transition-all"
                                onClick={handleProceed}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Saving...' : 'Proceed'}
                            </MedicalButton>
                        </div>
                    </div>

                    <div className="relative flex-1 w-full rounded-3xl overflow-hidden shadow-2xl bg-black/80 border border-white/10 mt-2 pointer-events-auto">
                        <Cropper
                            image={capturedImage}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={9 / 16}
                            onCropChange={setCrop}
                            onRotationChange={setRotation}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
