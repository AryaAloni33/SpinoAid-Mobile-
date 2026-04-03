import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MedicalButton } from "@/components/medical/MedicalButton";
import {
  ArrowLeft,
  Plus,
  Search,
  User,
  X,
  ChevronDown,
  ChevronRight,
  Save,
  Upload,
  FileText,
  Database,
  Monitor,
  MoreVertical,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { patientsApi, type Patient, type PatientCreate } from "@/services/api";
import { toast } from "@/hooks/use-toast";

export default function PatientsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadedReports, setUploadedReports] = useState<{ name: string, date: string }[]>([]);
  const [collaborators, setCollaborators] = useState<{ name: string, email: string }[]>([]);
  const [showAddStaffForm, setShowAddStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", email: "" });
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    if (menuOpenId) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [menuOpenId]);

  const [form, setForm] = useState<PatientCreate>({
    name: "",
    age: 0,
    gender: "",
    phone: "",
    email: "",
    blood_type: "",
    medical_history: "",
  });

  const fetchPatients = useCallback(async () => {
    try {
      const res = await patientsApi.list();
      setPatients(res.data.patients);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.age) {
      toast({
        title: "Error",
        description: "Name and age are required",
        variant: "destructive",
      });
      return;
    }

    const normalizedBloodType = form.blood_type?.toUpperCase().trim() || "";

    if (normalizedBloodType && !/^[A-Z]+[+-]$/.test(normalizedBloodType)) {
      toast({
        title: "Invalid Blood Group",
        description: "Blood group must be capital letters followed by + or - (e.g., A+, AB-)",
        variant: "destructive",
      });
      return;
    }

    try {
      await patientsApi.create({ ...form, blood_type: normalizedBloodType });
      toast({ title: "Created", description: "Patient added successfully" });
      setShowForm(false);
      setForm({
        name: "",
        age: 0,
        gender: "",
        phone: "",
        email: "",
        blood_type: "",
        medical_history: "",
      });
      fetchPatients();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.response?.data?.detail || "Failed to save",
        variant: "destructive",
      });
    }
  };

  const handleSendToPACS = (patient: Patient) => {
    toast({
      title: "PACS Transfer",
      description: `Sending record for ${patient.name} to PACS server...`,
    });
  };

  const handleDelete = async (patientId: string) => {
    try {
      await patientsApi.delete(patientId);
      toast({ title: "Deleted", description: "Patient removed" });
      if (activePatient?.patient_id === patientId) {
        setActivePatient(null);
      }
      fetchPatients();
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImages((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    toast({
      title: "Upload Success",
      description: `${files.length} images added to session`,
    });
  };

  const filtered = useMemo(() => {
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.patient_id.toLowerCase().includes(search.toLowerCase()),
    );
  }, [patients, search]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement instanceof HTMLInputElement ||
          activeElement instanceof HTMLTextAreaElement;

        if (!isInputFocused) {
          e.preventDefault();
          const filteredIds = filtered.map((p) => p.patient_id);
          if (
            selectedPatients.length === filteredIds.length &&
            filteredIds.length > 0
          ) {
            setSelectedPatients([]);
          } else {
            setSelectedPatients(filteredIds);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedPatients]);

  const toggleSelectAll = () => {
    const filteredIds = filtered.map((p) => p.patient_id);
    if (
      selectedPatients.length === filteredIds.length &&
      filteredIds.length > 0
    ) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(filteredIds);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedPatients((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  if (!patients)
    return (
      <div className="min-h-screen bg-[#0f171c] flex items-center justify-center text-slate-500 font-mono">
        INITIALIZING DATAFRAME...
      </div>
    );

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      <main className="flex h-screen overflow-hidden">
        {/* Left Side - Patient List Area */}
        <div className="w-[45%] flex flex-col border-r border-border bg-card/50">
          {/* List Toolbar */}
          <div className="p-3 border-b border-border flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-md text-muted-foreground transition-colors shrink-0"
              title="Go Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                placeholder="Search database..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setForm({
                  name: "",
                  age: 0,
                  gender: "",
                  phone: "",
                  email: "",
                  blood_type: "",
                  medical_history: "",
                });
                setShowForm(true);
              }}
              className="p-2 bg-secondary border border-border rounded-md text-muted-foreground hover:text-primary hover:border-primary/30 transition-all active:scale-95"
              title="Register New Patient"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* List Headers */}
          <div className="grid grid-cols-[30px_1fr_1fr_120px_40px] px-4 py-2 text-[10px] font-bold text-muted-foreground tracking-wider uppercase border-b border-border bg-muted/30">
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 &&
                  selectedPatients.length === filtered.length
                }
                onChange={toggleSelectAll}
                className="accent-primary rounded border-border bg-transparent"
              />
            </div>
            <div>Name</div>
            <div>ID</div>
            <div>Date</div>
            <div></div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar text-foreground">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm italic underline decoration-primary/30">
                Synchronizing database...
              </div>
            ) : (
              <div className="divide-y divide-border pb-20">
                {filtered.map((p) => (
                  <div
                    key={p.patient_id}
                    onClick={() => setActivePatient(p)}
                    className={cn(
                      "grid grid-cols-[30px_1fr_1fr_120px_40px] px-4 py-3 items-center group cursor-pointer transition-colors text-sm relative",
                      activePatient?.patient_id === p.patient_id
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-muted/30",
                      menuOpenId === p.patient_id ? "z-[50]" : "z-0"
                    )}
                  >
                    <div
                      className="flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(p.patient_id)}
                        onChange={() => toggleSelect(p.patient_id)}
                        className="accent-primary rounded border-border bg-transparent"
                      />
                    </div>

                    <div className="flex items-center gap-2 pr-2 overflow-hidden">
                      <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs text-primary shrink-0 font-bold">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="truncate font-medium text-foreground uppercase tracking-tight">
                        {p.name}
                      </span>
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">
                      {p.patient_id}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>

                    <div className="flex justify-center relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.top, left: rect.left });
                          setMenuOpenId(menuOpenId === p.patient_id ? null : p.patient_id);
                        }}
                        className={cn(
                          "p-1.5 rounded-full transition-all hover:bg-muted shrink-0",
                          menuOpenId === p.patient_id ? "text-primary bg-muted" : "text-muted-foreground"
                        )}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPatients.length > 0 && (
            <div className="p-3 bg-primary/5 border-t border-primary/30 flex justify-between items-center animate-in slide-in-from-bottom-2">
              <span className="text-xs font-bold text-primary tracking-wide">
                {selectedPatients.length} ROWS SELECTED
              </span>
              <button
                onClick={async () => {
                  try {
                    await Promise.all(
                      selectedPatients.map((id) => patientsApi.delete(id)),
                    );
                    toast({
                      title: "Operation Complete",
                      description: "Records purged successfuly",
                    });
                    setSelectedPatients([]);
                    fetchPatients();
                  } catch {
                    toast({
                      title: "Error",
                      description: "Batch deletion failed",
                      variant: "destructive",
                    });
                  }
                }}
                className="text-xs font-bold text-destructive hover:text-destructive/80 flex items-center gap-1.5 px-3 py-1.5 rounded bg-destructive/10 hover:bg-destructive/20 transition-all"
              >
                <Trash2 className="h-3 w-3" /> DELETE SELECTED
              </button>
            </div>
          )}
        </div>

        {/* Right Side - Preview & Secondary Sidebar */}
        <div className="flex-1 flex flex-col bg-card">
          {activePatient ? (
            <>
              {/* Preview Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                <div className="flex items-center gap-3">
                  <X
                    className="h-5 w-5 text-primary cursor-pointer"
                    onClick={() => setActivePatient(null)}
                  />
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-[11px] font-black text-primary uppercase tracking-[0.1em]">
                      PATIENT / {activePatient.name} /{" "}
                      {activePatient.created_at
                        ? new Date(
                          activePatient.created_at,
                        ).toLocaleDateString()
                        : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2
                      className="h-5 w-5"
                      onClick={() => handleDelete(activePatient.patient_id)}
                    />
                  </button>
                  <button
                    onClick={() => handleSendToPACS(activePatient)}
                    className="flex items-center gap-2 px-5 py-2 bg-secondary hover:bg-muted text-foreground text-[11px] font-black rounded shadow-md active:scale-95 transition-all outline-none border border-border"
                  >
                    <Upload className="h-3.5 w-3.5" /> SEND TO PACS
                  </button>
                  <button className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-black rounded shadow-xl active:scale-95 transition-all outline-none">
                    <Monitor className="h-3.5 w-3.5" /> OPEN VIEWER
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 space-y-8 pb-32">
                  {/* Accordion Sections - Globus Style */}
                  <div className="space-y-[2px] bg-border border-2 border-border rounded-xl overflow-hidden shadow-lg">
                    <details className="group" open>
                      <summary className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-secondary/20 transition-colors select-none">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                          Thumbnails
                        </span>
                        <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-6 bg-background space-y-6 border-t-2 border-border animate-in fade-in duration-300">
                        <div className="flex items-center justify-end">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              id="image-upload"
                              className="hidden"
                              multiple
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                            <label
                              htmlFor="image-upload"
                              className="flex items-center gap-2 p-2 px-5 bg-primary text-primary-foreground rounded-md text-xs font-black tracking-widest cursor-pointer hover:bg-primary/90 transition-all shadow-md active:scale-95"
                            >
                              <Upload className="h-4 w-4" /> UPLOAD IMAGE
                            </label>
                          </div>
                        </div>

                        <div className="space-y-4">
                          {uploadedImages.length > 0 ? (
                            <div className="grid grid-cols-3 gap-4">
                              {uploadedImages.map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setSelectedImage(img)}
                                  className="aspect-square bg-muted/40 border-2 border-border rounded-lg overflow-hidden relative group cursor-pointer shadow-sm hover:border-primary/50 transition-all"
                                >
                                  <img
                                    src={img}
                                    alt={`Uploaded ${idx}`}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm">
                                    <span className="text-[10px] font-black text-white uppercase">
                                      Series {idx + 1}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUploadedImages((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      );
                                    }}
                                    className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-40 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground/40 gap-3">
                              <Upload className="h-10 w-10" />
                              <span className="text-sm font-black uppercase tracking-widest">
                                No images uploaded for this session
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-secondary/20 transition-colors select-none">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                          Patient Details
                        </span>
                        <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-6 bg-background grid grid-cols-2 gap-y-6 gap-x-12 border-t-2 border-border animate-in fade-in duration-300">
                        <div>
                          <label className="text-xs text-muted-foreground font-black uppercase tracking-wider block mb-2">
                            Age / Gender
                          </label>
                          <span className="text-base font-black text-foreground">
                            {activePatient.age} / {activePatient.gender}
                          </span>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground font-black uppercase tracking-wider block mb-2">
                            Blood Type
                          </label>
                          <span className="text-base font-black text-foreground">
                            {activePatient.blood_type || "N/A"}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs text-muted-foreground font-black uppercase tracking-wider block mb-2">
                            Contact Link
                          </label>
                          <span className="text-base font-black text-foreground block">
                            {activePatient.phone || "---"}
                          </span>
                          <span className="text-sm font-bold text-muted-foreground">
                            {activePatient.email || "---"}
                          </span>
                        </div>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-secondary/20 transition-colors select-none">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                          Medical Reports
                        </span>
                        <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-6 bg-background space-y-6 border-t-2 border-border animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Document Management
                          </span>
                          <button
                            className="flex items-center gap-2 px-4 py-1.5 bg-secondary text-foreground text-[10px] font-black rounded hover:bg-muted transition-all"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.onchange = (e: any) => {
                                const file = e.target.files[0];
                                if (file) {
                                  setUploadedReports(prev => [...prev, {
                                    name: file.name,
                                    date: new Date().toLocaleDateString()
                                  }]);
                                  toast({
                                    title: "Report Added",
                                    description: `${file.name} successfully attached`
                                  });
                                }
                              };
                              input.click();
                            }}
                          >
                            <Plus className="h-3 w-3" /> ATTACH REPORT
                          </button>
                        </div>

                        <div className="space-y-2">
                          {uploadedReports.length > 0 ? (
                            uploadedReports.map((report, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-secondary/10 border border-border rounded-lg group hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded">
                                    <FileText className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-black text-foreground uppercase truncate max-w-[200px]">
                                      {report.name}
                                    </div>
                                    <div className="text-[10px] font-bold text-muted-foreground">
                                      UPLOADED: {report.date}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setUploadedReports(prev => prev.filter((_, i) => i !== idx))}
                                  className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="py-8 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                              <FileText className="h-8 w-8" />
                              <span className="text-[10px] font-bold uppercase tracking-widest">
                                No medical reports on file
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>

                    <details className="group">
                      <summary className="flex items-center justify-between p-4 bg-card cursor-pointer hover:bg-secondary/20 transition-colors select-none">
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground">
                          Patient Collaborators
                        </span>
                        <ChevronDown className="h-5 w-5 text-muted-foreground group-open:rotate-180 transition-transform" />
                      </summary>
                      <div className="p-6 bg-background space-y-4 border-t-2 border-border animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Assigned Staff
                          </span>
                          {!showAddStaffForm && (
                            <button
                              onClick={() => setShowAddStaffForm(true)}
                              className="text-[10px] font-black text-primary hover:underline uppercase tracking-wider"
                            >
                              + Add Staff
                            </button>
                          )}
                        </div>

                        {showAddStaffForm && (
                          <div className="p-4 bg-secondary/5 border border-dashed border-primary/30 rounded-lg space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Enter Name</label>
                                <input
                                  placeholder="Enter Name..."
                                  value={staffForm.name}
                                  onChange={(e) => setStaffForm(s => ({ ...s, name: e.target.value }))}
                                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">Enter Email</label>
                                <input
                                  placeholder="Enter Email..."
                                  value={staffForm.email}
                                  onChange={(e) => setStaffForm(s => ({ ...s, email: e.target.value }))}
                                  className="w-full bg-background border border-border rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => {
                                  setShowAddStaffForm(false);
                                  setStaffForm({ name: "", email: "" });
                                }}
                                className="flex-1 py-1.5 text-[10px] font-bold text-muted-foreground hover:bg-muted rounded transition-colors"
                              >
                                CANCEL
                              </button>
                              <button
                                onClick={() => {
                                  if (!staffForm.name || !staffForm.email) {
                                    toast({ title: "Error", description: "Name and Email are required", variant: "destructive" });
                                    return;
                                  }
                                  setCollaborators(prev => [...prev, staffForm]);
                                  setStaffForm({ name: "", email: "" });
                                  setShowAddStaffForm(false);
                                  toast({ title: "Collaborator Added", description: "New staff member assigned successfully" });
                                }}
                                className="flex-1 py-1.5 bg-primary text-primary-foreground text-[10px] font-black rounded shadow-md active:scale-95 transition-all"
                              >
                                ASSIGN STAFF
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          {collaborators.length > 0 ? (
                            <>
                              <div className="grid grid-cols-[1fr_1fr_40px] px-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                <span>Name</span>
                                <span>Email</span>
                                <span></span>
                              </div>
                              <div className="space-y-1.5">
                                {collaborators.map((c, idx) => (
                                  <div key={idx} className="grid grid-cols-[1fr_1fr_40px] items-center px-4 py-2.5 bg-secondary/10 border border-border rounded-lg group hover:border-primary/30 transition-all">
                                    <div className="text-xs font-black text-foreground uppercase truncate pr-2">{c.name}</div>
                                    <div className="text-[10px] font-bold text-muted-foreground truncate opacity-70 lowercase">{c.email}</div>
                                    <div className="flex justify-end">
                                      <button
                                        onClick={() => setCollaborators(prev => prev.filter((_, i) => i !== idx))}
                                        className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : !showAddStaffForm && (
                            <div className="py-6 border border-dashed border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground/30 gap-2">
                              <Users className="h-6 w-6" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">No staff members assigned</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t-2 border-border flex gap-4 bg-secondary/20">
                <button className="flex-1 px-6 py-4 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-black rounded-lg transition-all uppercase tracking-widest shadow-md">
                  Export Case Study
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
              <div className="p-10 rounded-full bg-muted/20 border-2 border-border border-dashed">
                <Database className="h-16 w-16 opacity-20" />
              </div>
              <div className="text-center">
                <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  NO PATIENT LOADED
                </h2>
                <p className="text-xs text-muted-foreground/80">
                  Please select an entry from the database to view session
                  details
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add/Edit Patient Modal - Professional Themed */}
      {showForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/60 backdrop-blur-md px-4 animate-in fade-in duration-300"
          onClick={() => setShowForm(false)}
        >
          <div
            className="w-full max-w-lg bg-card border border-border rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-secondary/50 px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground tracking-[0.1em] uppercase">
                REGISTER NEW PATIENT
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                  Full Name
                </label>
                <input
                  required
                  placeholder=""
                  value={form.name}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                    setForm((f) => ({ ...f, name: val }));
                  }}
                  className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary ring-offset-0 placeholder:text-muted-foreground/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                    Age
                  </label>
                  <input
                    type="number"
                    value={form.age || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        age: parseInt(e.target.value) || 0,
                      }))
                    }
                    className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                    Gender
                  </label>
                  <select
                    value={form.gender}
                    required
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gender: e.target.value }))
                    }
                    className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="" disabled></option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                    Blood Type
                  </label>
                  <input
                    placeholder=""
                    value={form.blood_type || ""}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z+-]/g, "");
                      const match = val.match(/^[A-Z]+[+-]?/);
                      const sanitized = match ? match[0] : "";
                      setForm((f) => ({ ...f, blood_type: sanitized }));
                    }}
                    className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                    Phone
                  </label>
                  <input
                    placeholder="+91"
                    value={form.phone || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                      setForm((f) => ({ ...f, phone: val }));
                    }}
                    className="w-full h-11 bg-background border border-border rounded-lg px-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:bg-muted/5 rounded-lg transition-all"
                >
                  DISCARD
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-lg shadow-primary/40 active:scale-[0.98] transition-all"
                >
                  REGISTER PATIENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Viewer Dialog */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
          onClick={() => setSelectedImage(null)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <button
              className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all hover:rotate-90"
              onClick={() => setSelectedImage(null)}
            >
              <X className="h-8 w-8" />
            </button>
          </div>
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center">
            <img
              src={selectedImage}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Floating Professional PACS Menu (Overlays everything) */}
      {menuOpenId && (
        <div
          className="fixed z-[500] animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: `${menuPos.top}px`,
            left: `${menuPos.left + 40}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-card border border-border rounded-lg shadow-2xl overflow-visible min-w-[200px] py-1.5 backdrop-blur-md">
            <div className="relative group/submenu px-4 py-3 hover:bg-secondary cursor-pointer flex items-center justify-between text-xs font-black uppercase tracking-wider text-foreground transition-all">
              <div className="flex items-center gap-3">
                <Upload className="h-4 w-4 text-primary" />
                <span>Send to PACS</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-50" />

              {/* Secondary Cascade Menu */}
              <div className="absolute left-full top-0 ml-[4px] hidden group-hover/submenu:block animate-in fade-in slide-in-from-left-1">
                <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden min-w-[180px] py-1 border-l-2 border-l-primary/30">
                  <div
                    className="px-5 py-3 hover:bg-primary hover:text-primary-foreground cursor-pointer text-xs font-black uppercase tracking-[0.1em] text-foreground transition-all"
                    onClick={() => {
                      const p = patients.find(patient => patient.patient_id === menuOpenId);
                      if (p) handleSendToPACS(p);
                      setMenuOpenId(null);
                    }}
                  >
                    Hospital PACS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
