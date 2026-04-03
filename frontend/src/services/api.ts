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
    const initialLength = patients.length;
    patients = patients.filter((p) => !(p.patient_id === patientId && p.created_by === user?.id));

    if (patients.length === initialLength) return mockError(404, "Patient not found");

    setStorageItem(KEYS.PATIENTS, patients);
    return mockResponse({
      success: true,
      message: "Patient deleted",
    });
  },
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

// ============= Auto Annotate APIs (HF Spaces) =============

const FEMORAL_API = "https://sam9198-femoral-head-detection.hf.space";
const ENDPLATES_API = "https://sam9198-vertebral-endplate-detection.hf.space";

/** Fetch blob from data URL */
const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const res = await fetch(dataUrl);
  return res.blob();
};

/** Get base64 data URL from blob */
const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string) || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

/** Get base64 string only */
const blobToBase64 = async (blob: Blob): Promise<string> => {
  const s = await blobToDataUrl(blob);
  return s.includes(",") ? s.split(",")[1]! : s;
};

type TryResponse = { ok: true; data: any } | { ok: false; status: number; text: string };

const tryFetchJson = async (url: string, init: RequestInit): Promise<TryResponse> => {
  const res = await fetch(url, { ...init, mode: "cors" });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, text };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    // Some SDKs may return plain text; still pass through for debugging
    return { ok: true, data: text };
  }
};

/** Call HF Space predict endpoint (Docker SDK style). Tries multipart + JSON base64. */
const callHfPredict = async (baseUrl: string, imageBlob: Blob): Promise<any> => {
  const file = new File([imageBlob], "image.png", { type: imageBlob.type || "image/png" });
  const base64 = await blobToBase64(imageBlob);
  const dataUrl = `data:${file.type};base64,${base64}`;

  const endpoint = `${baseUrl}/predict`;

  const attempts: Array<() => Promise<TryResponse>> = [
    // multipart: file
    async () => {
      const fd = new FormData();
      fd.append("file", file);
      return tryFetchJson(endpoint, { method: "POST", body: fd });
    },
    // multipart: image
    async () => {
      const fd = new FormData();
      fd.append("image", file);
      return tryFetchJson(endpoint, { method: "POST", body: fd });
    },
    // multipart: upload
    async () => {
      const fd = new FormData();
      fd.append("upload", file);
      return tryFetchJson(endpoint, { method: "POST", body: fd });
    },
    // JSON: base64 fields
    async () =>
      tryFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      }),
    async () =>
      tryFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_data: base64 }),
      }),
    async () =>
      tryFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      }),
    async () =>
      tryFetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: dataUrl }),
      }),
  ];

  const errors: Array<{ status: number; text: string }> = [];
  for (const attempt of attempts) {
    const r = await attempt();
    if (r.ok) return r.data;
    errors.push({ status: r.status, text: r.text });
  }

  if (import.meta.env?.DEV) {
    console.warn("[HF API] All /predict attempts failed", endpoint, errors);
  }
  throw new Error(`All /predict attempts failed for ${baseUrl}`);
};

export interface FemoralHeadResult {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface EndplateResult {
  label: string;
  endplate?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  detected?: boolean;
}

export interface EndplatesApiResponse {
  confidence?: number;
  image_shape?: { height: number; width: number };
  image_width?: number;
  image_height?: number;
  endplates: EndplateResult[];
}

/** Normalize ellipse/head to { cx, cy, rx, ry } */
const toFemoralHead = (item: any): FemoralHeadResult | null => {
  if (!item) return null;
  if (Array.isArray(item) && item.length >= 4) {
    return { cx: +item[0], cy: +item[1], rx: +item[2], ry: +item[3] };
  }
  const cx = item.cx ?? item.center_x ?? item.x ?? item[0];
  const cy = item.cy ?? item.center_y ?? item.y ?? item[1];
  const rx = item.rx ?? item.radius_x ?? item.radius ?? item[2];
  const ry = item.ry ?? item.radius_y ?? item.radius ?? item[3];
  if (typeof cx !== "number" && typeof cx !== "string") return null;
  const ncx = +cx, ncy = +cy, nrx = +(rx ?? 0), nry = +(ry ?? 0);
  if (isNaN(ncx) || isNaN(ncy)) return null;
  return { cx: ncx, cy: ncy, rx: nrx || 20, ry: nry || 20 };
};

/** Flatten and extract femoral heads from Gradio-style response */
const extractFemoralHeads = (data: any): FemoralHeadResult[] => {
  const heads: FemoralHeadResult[] = [];

  const process = (v: any) => {
    const h = toFemoralHead(v);
    if (h) {
      heads.push(h);
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x) => process(x));
    } else if (v && typeof v === "object") {
      if (v.femoral_heads) process(v.femoral_heads);
      else if (v.heads) process(v.heads);
      else if (v.predictions) process(v.predictions);
      else if (Array.isArray(v.data)) process(v.data);
    }
  };

  const payload = data?.data ?? data;
  if (Array.isArray(payload)) {
    payload.forEach((x: any) => process(x));
  } else {
    process(data);
  }
  return heads;
};

export const autoAnnotateApi = {
  femoralHeads: async (imageDataUrl: string): Promise<FemoralHeadResult[]> => {
    const blob = await dataUrlToBlob(imageDataUrl);
    const data = await callHfPredict(FEMORAL_API, blob);
    const heads = extractFemoralHeads(data);
    if (heads.length === 0 && import.meta.env?.DEV) {
      console.warn("[femoral API] 0 heads parsed. Raw response:", JSON.stringify(data)?.slice(0, 500));
    }
    return heads;
  },

  endplates: async (imageDataUrl: string): Promise<EndplatesApiResponse> => {
    const blob = await dataUrlToBlob(imageDataUrl);
    const data = await callHfPredict(ENDPLATES_API, blob);
    const payload = data?.data ?? data;
    if (Array.isArray(payload) && payload[0]) {
      const first = payload[0];
      if (first?.endplates) return first;
      if (typeof first === "object") return { endplates: first.endplates || [], ...first };
    }
    if (data?.endplates) return data;
    if (data?.data?.endplates) return { endplates: data.data.endplates, ...data.data };
    return { endplates: [] };
  },
};

export default { authApi, patientsApi, annotationsApi, reportsApi, imagesApi, uploadImage, autoAnnotateApi };
