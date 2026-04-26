import axios from "axios";

// Helper to simulate API responses and wrap data in the format Axios would return
const mockResponse = <T>(data: T): Promise<{ data: T }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ data });
    }, 300); // Simulate network delay
  });
};

const mockError = (status: number, message: string) => {
  const error = new Error(message) as any;
  error.response = { status, data: { detail: message } };
  return Promise.reject(error);
};

// ============= Local Storage Helpers =============

const KEYS = {
  USERS: "spinoaid_users",
  PATIENTS: "spinoaid_patients",
  ANNOTATIONS: "spinoaid_annotations",
  REPORTS: "spinoaid_reports",
  IMAGES: "spinoaid_images",
  TOKEN: "token",
  CURRENT_USER: "user",
};

const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  return item ? JSON.parse(item) : defaultValue;
};

const setStorageItem = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// ============= Auth API =============

export const authApi = {
  register: async (data: { name: string; email: string; password: string }) => {
    const users = getStorageItem<any[]>(KEYS.USERS, []);
    if (users.find((u) => u.email === data.email)) {
      return mockError(400, "Email already registered");
    }

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.name,
      email: data.email,
      password: data.password, // In a real app, this should be hashed, but for local storage it's simplified
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    setStorageItem(KEYS.USERS, users);

    const token = "mock-jwt-token-" + newUser.id;
    const userResponse = { id: newUser.id, name: newUser.name, email: newUser.email };

    return mockResponse({
      success: true,
      message: "Registration successful",
      token,
      user: userResponse,
    });
  },

  login: async (data: { email: string; password: string }) => {
    const users = getStorageItem<any[]>(KEYS.USERS, []);

    // Check for hardcoded test user first or in the list
    let user = users.find((u) => u.email === data.email && u.password === data.password);

    // Hardcoded test user support for immediate use
    if (!user && data.email === "test@gmail.com" && data.password === "test1234") {
      user = {
        id: "test-user-id",
        name: "Test User",
        email: "test@gmail.com",
        password: "test1234"
      };
      // Optionally seed it into the users list if it doesn't exist
      if (!users.find(u => u.email === "test@gmail.com")) {
        users.push(user);
        setStorageItem(KEYS.USERS, users);
      }
    }

    if (!user) {
      return mockError(401, "Invalid email or password");
    }

    const token = "mock-jwt-token-" + user.id;
    const userResponse = { id: user.id, name: user.name, email: user.email };

    return mockResponse({
      success: true,
      message: "Login successful",
      token,
      user: userResponse,
    });
  },

  getMe: async () => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    if (!user) return mockError(401, "Unauthorized");
    return mockResponse(user);
  },
};

// ============= Patients API =============

export interface Patient {
  id: string;
  patient_id: string;
  name: string;
  age: number;
  gender: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  medical_history?: string;
  created_by: string;
  created_at: string;
}

export interface PatientCreate {
  name: string;
  age: number;
  gender: string;
  date_of_birth?: string;
  phone?: string;
  email?: string;
  address?: string;
  blood_type?: string;
  allergies?: string[];
  conditions?: string[];
  medical_history?: string;
}

export const patientsApi = {
  list: async () => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    if (!user) return mockError(401, "Unauthorized");

    const patients = getStorageItem<Patient[]>(KEYS.PATIENTS, []);
    const userPatients = patients.filter((p) => p.created_by === user.id);

    return mockResponse({
      success: true,
      patients: userPatients,
    });
  },

  get: async (patientId: string) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    const patients = getStorageItem<Patient[]>(KEYS.PATIENTS, []);
    const patient = patients.find((p) => p.patient_id === patientId && p.created_by === user?.id);

    if (!patient) return mockError(404, "Patient not found");

    return mockResponse({
      success: true,
      patient,
    });
  },

  create: async (data: PatientCreate) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    if (!user) return mockError(401, "Unauthorized");

    const patients = getStorageItem<Patient[]>(KEYS.PATIENTS, []);

    // Generate next patient ID
    const lastNum = patients.length > 0
      ? Math.max(...patients.map(p => parseInt(p.patient_id.split("-")[1]) || 1000))
      : 1000;
    const patient_id = `P-${lastNum + 1}`;

    const newPatient: Patient = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      patient_id,
      created_by: user.id,
      created_at: new Date().toISOString(),
    };

    patients.push(newPatient);
    setStorageItem(KEYS.PATIENTS, patients);

    return mockResponse({
      success: true,
      patient: newPatient,
    });
  },

  update: async (patientId: string, data: Partial<PatientCreate>) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    let patients = getStorageItem<Patient[]>(KEYS.PATIENTS, []);
    const index = patients.findIndex((p) => p.patient_id === patientId && p.created_by === user?.id);

    if (index === -1) return mockError(404, "Patient not found");

    patients[index] = { ...patients[index], ...data };
    setStorageItem(KEYS.PATIENTS, patients);

    return mockResponse({
      success: true,
      patient: patients[index],
    });
  },

  delete: async (patientId: string) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    let patients = getStorageItem<Patient[]>(KEYS.PATIENTS, []);
    let images = getStorageItem<any[]>(KEYS.IMAGES, []);

    const initialLength = patients.length;
    patients = patients.filter((p) => !(p.patient_id === patientId && p.created_by === user?.id));
    images = images.filter((img) => img.patient_id !== patientId);

    if (patients.length === initialLength) return mockError(404, "Patient not found");

    setStorageItem(KEYS.PATIENTS, patients);
    setStorageItem(KEYS.IMAGES, images);
    return mockResponse({
      success: true,
      message: "Patient deleted",
    });
  },

  getImages: async (patientId: string) => {
    const images = getStorageItem<any[]>(KEYS.IMAGES, []);
    return mockResponse({
      success: true,
      images: images.filter(img => img.patient_id === patientId).map(img => img.src)
    });
  },

  addImage: async (patient_id: string, src: string) => {
    const images = getStorageItem<any[]>(KEYS.IMAGES, []);
    images.push({ patient_id, src, id: Date.now().toString() });
    setStorageItem(KEYS.IMAGES, images);
    return mockResponse({ success: true });
  }
};

// ============= Annotations API =============

export const annotationsApi = {
  save: async (data: { patient_id: string; image_name: string; image_src: string; annotations: any[] }) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    if (!user) return mockError(401, "Unauthorized");

    const annotations = getStorageItem<any[]>(KEYS.ANNOTATIONS, []);
    const newRecord = {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    annotations.push(newRecord);
    setStorageItem(KEYS.ANNOTATIONS, annotations);

    return mockResponse({
      success: true,
      message: `Saved ${data.annotations.length} annotations`,
      id: newRecord.id,
    });
  },

  getByPatient: async (patientId: string) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    const annotations = getStorageItem<any[]>(KEYS.ANNOTATIONS, []);
    const records = annotations
      .filter((a) => a.patient_id === patientId && a.created_by === user?.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return mockResponse({
      success: true,
      records: records,
    });
  },

  delete: async (annotationId: string) => {
    const user = getStorageItem<any>(KEYS.CURRENT_USER, null);
    let annotations = getStorageItem<any[]>(KEYS.ANNOTATIONS, []);
    const initialLength = annotations.length;
    annotations = annotations.filter((a) => !(a.id === annotationId && a.created_by === user?.id));

    if (annotations.length === initialLength) return mockError(404, "Annotation record not found");

    setStorageItem(KEYS.ANNOTATIONS, annotations);
    return mockResponse({
      success: true,
      message: "Annotation deleted",
    });
  },
};

// ============= Reports API =============

export const reportsApi = {
  list: async (patientId: string) => {
    const reports = getStorageItem<any[]>(KEYS.REPORTS, []);
    const filtered = reports.filter((r) => r.patient_id === patientId);
    return mockResponse({ success: true, reports: filtered });
  },
  create: async (data: { patient_id: string; type: string; doctor: string; status: string; date: string }) => {
    const reports = getStorageItem<any[]>(KEYS.REPORTS, []);
    const newReport = { ...data, id: "R-" + Math.random().toString(36).substr(2, 5) };
    reports.push(newReport);
    setStorageItem(KEYS.REPORTS, reports);
    return mockResponse({ success: true, report: newReport });
  },
};

// ============= Images API =============

export const imagesApi = {
  list: async (patientId: string) => {
    const images = getStorageItem<any[]>(KEYS.IMAGES, []);
    const filtered = images.filter((i) => i.patient_id === patientId);
    return mockResponse({ success: true, images: filtered });
  },
  upload: async (patientId: string, title: string, url: string) => {
    const images = getStorageItem<any[]>(KEYS.IMAGES, []);
    const newImage = {
      id: Math.random().toString(36).substr(2, 9),
      patient_id: patientId,
      title,
      url,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    };
    images.push(newImage);
    setStorageItem(KEYS.IMAGES, images);
    return mockResponse({ success: true, image: newImage });
  },
  delete: async (imageId: string) => {
    let images = getStorageItem<any[]>(KEYS.IMAGES, []);
    images = images.filter((i) => i.id !== imageId);
    setStorageItem(KEYS.IMAGES, images);
    return mockResponse({ success: true, message: "Image deleted" });
  },
};

// ============= Upload Image (Placeholder) =============
export const uploadImage = async (file: File) => {
  // In a pure browser version, we can store image as Base64 if small, 
  // or just mock the success and use the file name
  return mockResponse({
    success: true,
    message: "Image uploaded successfully",
    image_id: "img_" + Math.random().toString(36).substr(2, 9),
    filename: file.name,
  });
};

export const autoAnnotateApi = {
  /** Call the specialized hosted endpoints */
  analyzeBackend: async (imageDataUrl: string): Promise<any> => {
    // Strip data URL prefix if present for the hosted backend
    const base64Data = imageDataUrl.includes(',') ? imageDataUrl.split(',')[1] : imageDataUrl;

    try {
      // 1. Fetch Femoral Detections
      const femRes = await fetch("https://spine-backend-xox7.onrender.com/api/femoral/detect-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: base64Data }),
      });
      const femData = await femRes.json();

      // 2. Fetch Endplate Detections
      const epRes = await fetch("https://spine-backend-xox7.onrender.com/api/endplates/detect-base64", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: base64Data }),
      });
      const epData = await epRes.json();

      // Combine results based on backend route responses
      return {
        // Femoral route returns { success, detections: [...] }
        femoral_heads: femData.detections || [],
        // Endplates route returns { success, endplates: [...], ... }
        endplates: epData.endplates || [],
        image_info: epData // Contains image_width, image_height for scaling
      };
    } catch (err) {
      console.error("API Call failed:", err);
      throw err;
    }
  }
};

export default { authApi, patientsApi, annotationsApi, reportsApi, imagesApi, uploadImage, autoAnnotateApi };
