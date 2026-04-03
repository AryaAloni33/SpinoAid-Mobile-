import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import {
  MedicalCard,
  MedicalCardHeader,
  MedicalCardTitle,
  MedicalCardContent,
} from "@/components/medical/MedicalCard";
import { MedicalButton } from "@/components/medical/MedicalButton";
import { MedicalBadge } from "@/components/medical/MedicalBadge";
import { MedicalInput } from "@/components/medical/MedicalInput";
import {
  ArrowLeft,
  Maximize2,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { patientsApi, imagesApi, type Patient } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { AnimatedBackground } from "@/components/AnimatedBackground";

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<any | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showImageModal, setShowImageModal] = useState(false);

  // Form states
  const [imageForm, setImageForm] = useState({
    title: "",
    file: null as File | null,
    previewUrl: ""
  });

  useEffect(() => {
    if (patientId) {
      fetchData();
    }
  }, [patientId]);

  const fetchData = () => {
    if (!patientId) return;
    setLoading(true);
    Promise.all([
      patientsApi.get(patientId),
      imagesApi.list(patientId)
    ]).then(([pRes, iRes]) => {
      setPatient(pRes.data.patient);
      setImages(iRes.data.images);
    }).catch((err) => {
      console.error(err);
      toast({ title: "Error", description: "Could not load patient details", variant: "destructive" });
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageForm(prev => ({
          ...prev,
          file,
          previewUrl: reader.result as string,
          title: prev.title || file.name.split('.')[0]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !imageForm.previewUrl || !imageForm.title) {
      toast({ title: "Error", description: "Please select an image and enter a title", variant: "destructive" });
      return;
    }

    try {
      await imagesApi.upload(patientId, imageForm.title, imageForm.previewUrl);
      const res = await imagesApi.list(patientId);
      setImages(res.data.images);
      setShowImageModal(false);
      setImageForm({ title: "", file: null, previewUrl: "" });
      toast({ title: "Image Uploaded", description: `Successfully saved ${imageForm.title}.` });
    } catch {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    }
  };

  const handleDeleteImage = async (imageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // @ts-ignore
      if (imagesApi.delete) {
        // @ts-ignore
        await imagesApi.delete(imageId);
        setImages(prev => prev.filter(img => img.id !== imageId));
        toast({ title: "Deleted", description: "Image removed from records" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete image", variant: "destructive" });
    }
  };

  const handleAnalyzeImage = () => {
    if (images.length === 0) {
      toast({ title: "No images", description: "Please upload a radiograph first." });
      return;
    }
    const latest = images[images.length - 1];
    navigate(`/xray-annotation`, {
      state: {
        imageSrc: latest.url,
        imageName: latest.title,
        patientId: patientId
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative flex items-center justify-center">
        <AnimatedBackground />
        <div className="text-foreground animate-pulse">Loading Patient Data...</div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background relative flex flex-col items-center justify-center">
        <AnimatedBackground />
        <h2 className="text-xl font-semibold text-foreground mb-4">Patient Not Found</h2>
        <MedicalButton onClick={() => navigate("/dashboard")}>Back to Dashboard</MedicalButton>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />
      <Navbar />

      <main className="container px-4 py-6 md:px-6 lg:py-8 relative z-10">
        <div className="mb-6">
          <MedicalButton
            variant="ghost"
            size="sm"
            onClick={() => navigate("/patients")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4"
          >
            Back to Patients
          </MedicalButton>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xl border border-primary/20 backdrop-blur-sm">
                {patient.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">
                    {patient.name}
                  </h1>
                  <MedicalBadge variant="success">Active</MedicalBadge>
                </div>
                <p className="text-muted-foreground mt-0.5">
                  Patient ID: {patient.patient_id} • {patient.age} years old •{" "}
                  {patient.gender}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <MedicalButton variant="outline" onClick={() => navigate(`/view`)}>View Annotations</MedicalButton>
              <MedicalButton variant="primary" onClick={handleAnalyzeImage}>Analyze Image</MedicalButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MedicalCard variant="default" padding="md">
            <MedicalCardHeader>
              <MedicalCardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Contact Info</MedicalCardTitle>
            </MedicalCardHeader>
            <MedicalCardContent>
              <div className="space-y-2 text-sm text-foreground">
                <p><span className="text-muted-foreground">Phone:</span> {patient.phone || "Not provided"}</p>
                <p><span className="text-muted-foreground">Email:</span> {patient.email || "Not provided"}</p>
              </div>
            </MedicalCardContent>
          </MedicalCard>
          <MedicalCard variant="default" padding="md">
            <MedicalCardHeader>
              <MedicalCardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Clinical Info</MedicalCardTitle>
            </MedicalCardHeader>
            <MedicalCardContent>
              <div className="space-y-2 text-sm text-foreground">
                <p><span className="text-muted-foreground">Blood Type:</span> {patient.blood_type || "N/A"}</p>
                <p><span className="text-muted-foreground">Created:</span> {new Date(patient.created_at).toLocaleDateString()}</p>
              </div>
            </MedicalCardContent>
          </MedicalCard>
          <MedicalCard variant="default" padding="md">
            <MedicalCardHeader>
              <MedicalCardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Medical History</MedicalCardTitle>
            </MedicalCardHeader>
            <MedicalCardContent>
              <p className="text-sm text-foreground italic">
                {patient.medical_history || "No medical history recorded."}
              </p>
            </MedicalCardContent>
          </MedicalCard>
        </div>

        <div className="animate-fade-in relative z-10">
          <MedicalCard variant="default" padding="md">
            <MedicalCardHeader>
              <div className="flex items-center justify-between">
                <MedicalCardTitle>Radiographs & Medical Images</MedicalCardTitle>
                <MedicalButton variant="primary" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={() => setShowImageModal(true)}>
                  Upload Image
                </MedicalButton>
              </div>
            </MedicalCardHeader>
            <MedicalCardContent>
              {images.length === 0 ? (
                <div className="text-center py-12">
                  <Maximize2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No radiographic images found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Use the upload button to select an image from your computer.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div
                      key={image.id}
                      onClick={() => setSelectedImage(image)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover-lift border border-border shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                    >
                      <img
                        src={image.url}
                        alt={image.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Actions Overlay */}
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          onClick={(e) => handleDeleteImage(image.id, e)}
                          className="p-1.5 rounded-md bg-destructive/90 text-destructive-foreground backdrop-blur-sm border border-destructive/20 hover:bg-destructive transition-colors"
                          title="Delete Image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="p-1.5 rounded-md bg-background/90 text-foreground backdrop-blur-sm border border-border">
                          <Maximize2 className="h-4 w-4" />
                        </div>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-3 text-primary-foreground translate-y-2 group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100">
                        <p className="text-sm font-medium truncate">
                          {image.title}
                        </p>
                        <p className="text-xs opacity-80">{image.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </MedicalCardContent>
          </MedicalCard>
        </div>

        {/* MODAL: UPLOAD IMAGE */}
        {showImageModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowImageModal(false)}>
            <MedicalCard variant="elevated" padding="lg" className="w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Upload Radiograph
                </h2>
                <button onClick={() => setShowImageModal(false)} className="p-1 hover:bg-muted rounded-md"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={handleUploadImageSubmit} className="space-y-4">
                <div
                  className="w-full aspect-video rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imageForm.previewUrl ? (
                    <img src={imageForm.previewUrl} className="w-full h-full object-contain" alt="Preview" />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-muted-foreground">Click to select an image file</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG or WebP</p>
                    </>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                <MedicalInput
                  label="Image Title / Label"
                  placeholder="e.g. Lumbar Spine X-Ray"
                  value={imageForm.title}
                  onChange={e => setImageForm(f => ({ ...f, title: e.target.value }))}
                />
                <div className="flex gap-3 mt-6">
                  <MedicalButton variant="outline" className="flex-1" onClick={() => setShowImageModal(false)}>Cancel</MedicalButton>
                  <MedicalButton variant="primary" className="flex-1" type="submit" disabled={!imageForm.file}>Upload to Record</MedicalButton>
                </div>
              </form>
            </MedicalCard>
          </div>
        )}

        {/* FULL IMAGE VIEW MODAL */}
        {selectedImage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] mx-4 scale-up-center">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-muted/80 hover:bg-muted text-foreground transition-colors border border-border"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="overflow-hidden rounded-xl border border-border shadow-2xl bg-card">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.title}
                  className="max-w-full max-h-[80vh] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="bg-muted/90 backdrop-blur-sm p-4 text-center border-t border-border">
                  <p className="font-semibold text-foreground text-lg">{selectedImage.title}</p>
                  <p className="text-sm text-muted-foreground tracking-wide uppercase font-medium mt-1">{selectedImage.date}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
