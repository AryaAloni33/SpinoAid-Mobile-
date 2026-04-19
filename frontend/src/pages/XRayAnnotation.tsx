import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Loader2, Upload } from "lucide-react";
import { AnnotationToolbar, type AnnotationTool } from "@/components/xray/AnnotationToolbar";
import { ImageCanvas, type Annotation } from "@/components/xray/ImageCanvas";
import { ImageAdjustments } from "@/components/xray/ImageAdjustments";
import { ShapeDimensions } from "@/components/xray/ShapeDimensions";
import { AnnotationList } from "@/components/xray/AnnotationList";
import { MedicalButton } from "@/components/medical/MedicalButton";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { annotationsApi, autoAnnotateApi } from "@/services/api";
import { XRayScanner } from "@/components/xray/XRayScanner";
import { Settings2, Hammer, Wand2, X, Camera as CameraIcon } from "lucide-react";

// Helper for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

const computeDerivedAnnotations = (baseAnnotations: Annotation[]): Annotation[] => {
  const derived: Annotation[] = [];

  // 1. Identify Femoral Heads
  const femoralAnnotations = baseAnnotations.filter((a) => a.label && a.label.startsWith("Femoral head"));
  // 2. Identify S1 Endplate
  const s1Annotation = baseAnnotations.find((a) => a.label && a.label.includes("S1"));

  if (femoralAnnotations.length === 2 && s1Annotation && s1Annotation.points.length >= 2) {
    const f1 = femoralAnnotations[0].points;
    const cx1 = (f1[0].x + f1[1].x) / 2;
    const cy1 = (f1[0].y + f1[1].y) / 2;
    const f2 = femoralAnnotations[1].points;
    const cx2 = (f2[0].x + f2[1].x) / 2;
    const cy2 = (f2[0].y + f2[1].y) / 2;

    const fMid = { x: (cx1 + cx2) / 2, y: (cy1 + cy2) / 2 };

    const s1p1 = s1Annotation.points[0];
    const s1p2 = s1Annotation.points[1];
    const s1Mid = { x: (s1p1.x + s1p2.x) / 2, y: (s1p1.y + s1p2.y) / 2 };

    const s1Vector = { x: s1p2.x - s1p1.x, y: s1p2.y - s1p1.y };
    let sPerpX = -s1Vector.y;
    let sPerpY = s1Vector.x;
    if (sPerpY < 0) {
      sPerpX = s1Vector.y;
      sPerpY = -s1Vector.x;
    }
    const sPerpLen = Math.hypot(sPerpX, sPerpY) || 1;
    const sPerpScale = 300 / sPerpLen; // Much longer, 300px visible line
    const s1PerpEnd = { x: s1Mid.x + sPerpX * sPerpScale, y: s1Mid.y + sPerpY * sPerpScale };

    // PT requires a vertical line from the femoral midpoint.
    const fVerticalEnd = { x: fMid.x, y: fMid.y - 300 }; // 300px long UP

    // PI (Pelvic Incidence) at S1
    derived.push({
      id: `derived_angle_pi`,
      type: "angle",
      points: [s1PerpEnd, s1Mid, fMid],
      color: "#06b6d4",
      label: "PI",
      locked: true,
    });

    // PT (Pelvic Tilt) at Femoral Heads
    derived.push({
      id: `derived_angle_pt`,
      type: "angle",
      points: [fVerticalEnd, fMid, s1Mid],
      color: "#06b6d4",
      label: "PT",
      locked: true,
    });

    // SS (Sacral Slope) Angle
    // Take the lower x,y point of S1 endplate, draw a horizontal line, angle between horizontal and S1 endplate
    const s1LowerY = s1p1.y > s1p2.y ? s1p1 : s1p2;
    const s1HigherY = s1p1.y > s1p2.y ? s1p2 : s1p1;
    const horizontalEnd = { x: s1LowerY.x + 150, y: s1LowerY.y };

    derived.push({
      id: `derived_angle_ss`,
      type: "angle",
      points: [s1HigherY, s1LowerY, horizontalEnd],
      color: "#a855f7",
      label: "SS",
      locked: true,
      hideFirstLine: true,
    });

    const piTextPos = { x: s1Mid.x + 80, y: s1Mid.y - 80 };
    derived.push({
      id: `derived_text_pi`,
      type: "text",
      points: [piTextPos, { x: piTextPos.x + 80, y: piTextPos.y + 40 }],
      color: "#06b6d4",
      label: "PI Text",
      text: "PI",
      locked: true,
    });

    const ptTextPos = { x: fMid.x + 80, y: fMid.y - 80 };
    derived.push({
      id: `derived_text_pt`,
      type: "text",
      points: [ptTextPos, { x: ptTextPos.x + 80, y: ptTextPos.y + 40 }],
      color: "#06b6d4",
      label: "PT Text",
      text: "PT",
      locked: true,
    });

    const ssTextPos = { x: s1LowerY.x + 40, y: s1LowerY.y - 40 };
    derived.push({
      id: `derived_text_ss`,
      type: "text",
      points: [ssTextPos, { x: ssTextPos.x + 80, y: ssTextPos.y + 40 }],
      color: "#a855f7",
      label: "SS Text",
      text: "SS",
      locked: true,
    });
  }

  // 3. Identify L1 Superior Endplate for Lumbar Lordosis (LL)
  const l1Annotation = baseAnnotations.find((a) => a.label === "L1" || a.label === "L1 - Superior");
  if (s1Annotation && s1Annotation.points.length >= 2 && l1Annotation && l1Annotation.points.length >= 2) {
    const s1p1 = s1Annotation.points[0];
    const s1p2 = s1Annotation.points[1];

    const l1p1 = l1Annotation.points[0];
    const l1p2 = l1Annotation.points[1];

    // Ensure points are ordered left to right for consistency in "extending to the right"
    const s1L = s1p1.x < s1p2.x ? s1p1 : s1p2;
    const s1R = s1p1.x < s1p2.x ? s1p2 : s1p1;

    const l1L = l1p1.x < l1p2.x ? l1p1 : l1p2;
    const l1R = l1p1.x < l1p2.x ? l1p2 : l1p1;

    // Vectors representing the endplates
    const vS1 = { x: s1R.x - s1L.x, y: s1R.y - s1L.y };
    const vL1 = { x: l1R.x - l1L.x, y: l1R.y - l1L.y };

    const lenS1 = Math.hypot(vS1.x, vS1.y) || 1;
    const lenL1 = Math.hypot(vL1.x, vL1.y) || 1;

    // Extend lines FAR to the right to ensure they cross visually if they converge
    const EXTENSION = 2000;

    // We extend from the rightmost points (s1R, l1R)
    // To go right, the x component must be positive.
    // vS1 and vL1 were defined as R - L, so their x component is already positive!
    const extS1 = {
      x: s1R.x + (vS1.x / lenS1) * EXTENSION,
      y: s1R.y + (vS1.y / lenS1) * EXTENSION
    };

    const extL1 = {
      x: l1R.x + (vL1.x / lenL1) * EXTENSION,
      y: l1R.y + (vL1.y / lenL1) * EXTENSION
    };

    // Calculate intersection of the two endplate lines mathematically
    const dx1 = vL1.x; // l1R.x - l1L.x
    const dy1 = vL1.y; // l1R.y - l1L.y
    const dx2 = vS1.x; // s1R.x - s1L.x
    const dy2 = vS1.y; // s1R.y - s1L.y

    const det = dx1 * dy2 - dy1 * dx2;

    if (Math.abs(det) > 0.0001) {
      // Find intersection point 
      const dx3 = l1R.x - s1R.x;
      const dy3 = l1R.y - s1R.y;

      const t1 = (dx3 * dy2 - dy3 * dx2) / det;
      const intersectPoint = {
        x: l1R.x - t1 * dx1,
        y: l1R.y - t1 * dy1
      };

      // We draw dashed extensions from the endplates to the intersection explicitly
      // However, if they don't visually cross (intersect on the left), we still 
      // just draw them out to the intersection point as requested, so the angle is formed.
      derived.push({
        id: `derived_line_l1_ext`,
        type: "line",
        points: [l1R, intersectPoint],
        color: "#10b981", // Emerald
        label: "L1 Ext",
        locked: true,
        hidden: false,
        isDashed: true
      });

      derived.push({
        id: `derived_line_s1_ext`,
        type: "line",
        points: [s1R, intersectPoint],
        color: "#10b981",
        label: "S1 Ext",
        locked: true,
        hidden: false,
        isDashed: true
      });

      // Ensure we draw the acute angle at the intersection using hideLines!
      let ptL1Angle = l1R;
      const ptS1Angle = s1R;

      const vA = { x: ptL1Angle.x - intersectPoint.x, y: ptL1Angle.y - intersectPoint.y };
      const vB = { x: ptS1Angle.x - intersectPoint.x, y: ptS1Angle.y - intersectPoint.y };

      if (vA.x * vB.x + vA.y * vB.y < 0) {
        ptL1Angle = {
          x: intersectPoint.x - vA.x,
          y: intersectPoint.y - vA.y
        };
      }

      derived.push({
        id: `derived_angle_ll`,
        type: "angle",
        points: [ptL1Angle, intersectPoint, ptS1Angle],
        color: "#10b981",
        label: "LL",
        locked: true,
        hideLines: true // DO NOT draw angle lines over our extensions
      });

      const llTextPos = { x: intersectPoint.x + 80, y: intersectPoint.y };
      derived.push({
        id: `derived_text_ll`,
        type: "text",
        points: [llTextPos, { x: llTextPos.x + 80, y: llTextPos.y + 40 }],
        color: "#10b981",
        label: "LL Text",
        text: "LL",
        locked: true,
      });
    }
  }


  return derived;
};

const XRayAnnotation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Router state data
  const stateData = location.state as { imageSrc?: string; imageName?: string; patientId?: string } | null;

  // Image state
  const [imageSrc, setImageSrc] = useState<string | null>(stateData?.imageSrc || null);
  const [imageName, setImageName] = useState<string>(stateData?.imageName || "");
  const [patientId, setPatientId] = useState<string>(stateData?.patientId || "");

  // Tool state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [isPanning, setIsPanning] = useState(false);
  const [showAngles, setShowAngles] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // View state
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Mobile UI States
  const isMobile = useIsMobile();
  const [isLhsOpen, setIsLhsOpen] = useState(false);
  const [isRhsOpen, setIsRhsOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const [activeAdjustment, setActiveAdjustment] = useState<'brightness' | 'contrast' | 'gamma' | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'adjust' | 'results' | 'annotate'>('adjust');
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);

  const handleBack = () => {
    if (window.confirm('Are you sure you want to discard your changes and go back?')) {
      navigate('/');
    }
  };

  // Initialize view when image is loaded from state
  useEffect(() => {
    if (stateData?.imageSrc) {
      const img = new Image();
      img.onload = () => {
        // Fix: Use full container width on mobile (no sidebar)
        const containerWidth = isMobile ? window.innerWidth : window.innerWidth - 320;
        const containerHeight = isMobile ? window.innerHeight - 200 : window.innerHeight - 150;

        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        const fitZoom = Math.min(scaleX, scaleY, 1) * 0.85;

        setZoom(fitZoom);
        const centeredX = (containerWidth - img.naturalWidth * fitZoom) / 2;
        const centeredY = (containerHeight - img.naturalHeight * fitZoom) / 2;

        // Ensure values don't push it too far off on small screens
        setPosition({
          x: isMobile ? centeredX : Math.max(20, centeredX),
          y: isMobile ? centeredY : Math.max(20, centeredY)
        });
      };
      img.src = stateData.imageSrc;
    }
  }, [stateData, isMobile]);

  // Callback for wheel zoom
  const handleWheelZoom = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Image filter state
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    gamma: 1,
    invert: false,
  });

  // Femoral detection state
  const [isDetecting, setIsDetecting] = useState(false);

  const resetFilters = useCallback(() => {
    setFilters({
      brightness: 100,
      contrast: 100,
      gamma: 1,
      invert: false,
    });
  }, []);

  // Get selected annotation object
  const getSelectedAnnotationObject = (): Annotation | null => {
    if (!selectedAnnotation) return null;
    return annotations.find((a) => a.id === selectedAnnotation) || null;
  };

  // Handle tool change - clear panning when switching to a non-pan tool
  const handleToolChange = useCallback((tool: AnnotationTool) => {
    setActiveTool(tool);
    // When switching to select or any drawing tool, ensure panning is disabled
    if (tool !== "select") {
      setIsPanning(false);
    }
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          handleToolChange("select");
          break;
        case "p":
          handleToolChange("marker");
          break;
        case "b":
          handleToolChange("box");
          break;
        case "c":
          handleToolChange("circle");
          break;
        case "o":
          handleToolChange("ellipse");
          break;
        case "l":
          handleToolChange("line");
          break;
        case "d":
          handleToolChange("freehand");
          break;
        case "m":
          handleToolChange("ruler");
          break;
        case "a":
          handleToolChange("angle");
          break;
        case "t":
          handleToolChange("text");
          break;
        case "e":
          handleToolChange("eraser");
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case " ":
          e.preventDefault();
          setIsPanning(true);
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
          }
          break;
        case "delete":
        case "backspace":
          if (selectedAnnotation) {
            e.preventDefault();
            setAnnotations((prev) => prev.filter((a) => a.id !== selectedAnnotation));
            setSelectedAnnotation(null);
          }
          break;
        case "escape":
          handleToolChange("select");
          setIsPanning(false);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [historyIndex, history, selectedAnnotation]);

  const handleUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, DICOM, etc.)",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const imgData = event.target?.result as string;

        const img = new Image();
        img.onload = () => {
          const containerWidth = isMobile ? window.innerWidth : window.innerWidth - 320;
          const containerHeight = isMobile ? window.innerHeight - 200 : window.innerHeight - 150;

          const scaleX = containerWidth / img.naturalWidth;
          const scaleY = containerHeight / img.naturalHeight;
          const fitZoom = Math.min(scaleX, scaleY, 1) * 0.85;

          setImageSrc(imgData);
          setImageName(file.name);
          setZoom(fitZoom);
          const centeredX = (containerWidth - img.naturalWidth * fitZoom) / 2;
          const centeredY = (containerHeight - img.naturalHeight * fitZoom) / 2;
          setPosition({
            x: isMobile ? centeredX : Math.max(20, centeredX),
            y: isMobile ? centeredY : Math.max(20, centeredY)
          });
          setAnnotations([]);
          setSelectedAnnotation(null);
          setHistory([[]]);
          setHistoryIndex(0);
          toast({
            title: "Image loaded",
            description: `${file.name} loaded at ${Math.round(fitZoom * 100)}% zoom.`,
          });
        };
        img.src = imgData;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.2));
  }, []);

  const handleAnnotationsChange = useCallback(
    (newAnnotations: Annotation[], skipHistory = false) => {
      const baseAnnotations = newAnnotations.filter(a => !a.id.startsWith("derived_"));
      const derivedAnnotations = computeDerivedAnnotations(baseAnnotations);
      const finalAnnotations = [...baseAnnotations, ...derivedAnnotations];

      setAnnotations(finalAnnotations);
      if (!skipHistory) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(finalAnnotations);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    },
    [history, historyIndex]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedAnnotation(null);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedAnnotation(null);
    }
  }, [historyIndex, history]);

  const handleDeleteAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => {
      const filtered = prev.filter((a) => a.id !== id);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(filtered);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return filtered;
    });
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
  }, [history, historyIndex, selectedAnnotation]);

  const handleLabelChange = useCallback((id: string, newLabel: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => ann.id === id ? { ...ann, label: newLabel } : ann)
    );
  }, []);

  const handleToggleLock = useCallback((id: string) => {
    setAnnotations((prev) => {
      const updated = prev.map((ann) => ann.id === id ? { ...ann, locked: !ann.locked } : ann);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(updated);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return updated;
    });
  }, [history, historyIndex]);

  const handleToggleVisibility = useCallback((id: string) => {
    setAnnotations((prev) => {
      const updated = prev.map((ann) => ann.id === id ? { ...ann, hidden: !ann.hidden } : ann);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(updated);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      return updated;
    });
  }, [history, historyIndex]);

  const handleSave = useCallback(async () => {
    if (!imageSrc) return;

    toast({
      title: "Annotations saved",
      description: `${annotations.length} annotation(s) saved locally.`,
    });
  }, [imageSrc, annotations, navigate]);

  const handlePanToggle = useCallback(() => {
    setIsPanning((prev) => !prev);
  }, []);

  // Auto Annotate: call femoral + endplates APIs and plot circles/lines
  const handleAutoAnnotate = useCallback(async () => {
    if (!imageSrc) {
      toast({
        title: "No image",
        description: "Please upload an X-ray image first.",
        variant: "destructive",
      });
      return;
    }

    setIsDetecting(true);
    try {
      // Get image dimensions for coordinate scaling
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageSrc;
      });
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;

      // Call both APIs in parallel
      const [femoralHeads, endplatesResult] = await Promise.all([
        autoAnnotateApi.femoralHeads(imageSrc),
        autoAnnotateApi.endplates(imageSrc),
      ]);

      const newAnnotations: Annotation[] = [];
      const ts = Date.now();

      // Femoral heads → circle annotations (points = bounding box corners)
      femoralHeads.forEach((head: { cx: number; cy: number; rx: number; ry: number }, idx: number) => {
        const r = (head.rx + head.ry) / 2;
        newAnnotations.push({
          id: `auto_femoral_${ts}_${idx}`,
          type: "circle",
          points: [
            { x: head.cx - r, y: head.cy - r },
            { x: head.cx + r, y: head.cy + r },
          ],
          color: "#3b82f6",
          label: `Femoral head ${idx + 1}`,
        });
      });

      // Endplates → line annotations; scale if API image size differs
      const apiWidth = endplatesResult.image_shape?.width || (endplatesResult as any).image_width;
      const apiHeight = endplatesResult.image_shape?.height || (endplatesResult as any).image_height;
      const scaleX = apiWidth ? imgW / apiWidth : 1;
      const scaleY = apiHeight ? imgH / apiHeight : 1;

      const rawEndplates = (endplatesResult.endplates || []).filter((ep: { detected?: boolean }) => ep.detected !== false);

      const s1Endplates = rawEndplates.filter((ep: any) => ep.label === "S1");
      const otherEndplates = rawEndplates.filter((ep: any) => ep.label !== "S1");

      otherEndplates.forEach((ep: any, idx: number) => {
        const x1 = ep.x1 * scaleX;
        const y1 = ep.y1 * scaleY;
        const x2 = ep.x2 * scaleX;
        const y2 = ep.y2 * scaleY;
        const labelText = ep.endplate ? `${ep.label} - ${ep.endplate}` : ep.label;
        newAnnotations.push({
          id: `auto_endplate_${ts}_${idx}`,
          type: "line",
          points: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
          color: "#f59e0b",
          label: labelText,
        });
      });

      if (s1Endplates.length > 0) {
        let sumX1 = 0, sumY1 = 0, sumX2 = 0, sumY2 = 0;
        s1Endplates.forEach((ep: any) => {
          sumX1 += ep.x1;
          sumY1 += ep.y1;
          sumX2 += ep.x2;
          sumY2 += ep.y2;
        });
        const c = s1Endplates.length;
        newAnnotations.push({
          id: `auto_endplate_${ts}_s1_merged`,
          type: "line",
          points: [
            { x: (sumX1 / c) * scaleX, y: (sumY1 / c) * scaleY },
            { x: (sumX2 / c) * scaleX, y: (sumY2 / c) * scaleY }
          ],
          color: "#f59e0b",
          label: "S1",
        });
      }

      if (newAnnotations.length > 0) {
        // We do not compute PT/PI/LL/SS here anymore. 
        // handleAnnotationsChange will automatically apply computeDerivedAnnotations.
        handleAnnotationsChange([...annotations, ...newAnnotations]);
        toast({
          title: "Auto Annotate complete",
          description: `Added ${femoralHeads.length} femoral head(s) and ${(endplatesResult.endplates || []).filter((e: any) => e.detected !== false).length} endplate line(s).`,
        });
      } else {
        toast({
          title: "No detections",
          description: "No femoral heads or endplates detected in this image.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Auto annotate error:", error);
      toast({
        title: "Auto Annotate error",
        description: "Could not reach the detection APIs. Check your connection or try again.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  }, [imageSrc, annotations, handleAnnotationsChange]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 transition-all duration-300">
        <div className="flex items-center gap-3">
          <MedicalButton
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className={cn("hover:bg-muted font-semibold", isMobile && "px-2")}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            {!isMobile && "Back to Dashboard"}
          </MedicalButton>
          {!isMobile && <div className="w-px h-6 bg-border mx-1" />}
          {!isMobile && (
            <div>
              <h1 className="text-base font-bold text-foreground">X-Ray Analysis</h1>
              <p className="text-[10px] text-muted-foreground -mt-1 uppercase tracking-widest font-medium">SpinoAid Diagnostic Workspace</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowAngles(!showAngles)}
            className="p-2 ml-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors focus-ring"
            aria-label="Toggle Angles"
            title={showAngles ? "Hide Angles" : "Show Angles"}
          >
            {showAngles ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
            )}
          </button>
          <MedicalButton
            variant="success"
            size="sm"
            onClick={handleSave}
            disabled={!imageSrc}
          >
            Save Annotations
          </MedicalButton>
          <button
            onClick={toggleTheme}
            className="p-2 ml-1 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors focus-ring"
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative pb-24">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {!isMobile && (
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onUpload={handleUpload}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            hasImage={!!imageSrc}
          />
        )}

        {isMobile && !imageSrc && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-background/80 backdrop-blur-md">
            <h2 className="text-2xl font-bold mb-6 text-center">Load X-Ray Image</h2>
            <XRayScanner patientId={patientId} />
            <div className="mt-4 w-full max-w-sm space-y-3">
              <MedicalButton
                variant="primary"
                className="w-full h-14"
                onClick={() => {
                  // XRayScanner's takePhoto already handles camera
                  toast({ title: "Scanner Ready", description: "Use the Scan New X-Ray button above." });
                }}
                leftIcon={<CameraIcon className="h-5 w-5" />}
              >
                Scan with Camera
              </MedicalButton>
              <MedicalButton
                variant="outline"
                className="w-full h-14"
                onClick={handleUpload}
                leftIcon={<Upload className="h-5 w-5" />}
              >
                Choose from Gallery
              </MedicalButton>
            </div>
          </div>
        )}

        <ImageCanvas
          imageSrc={imageSrc}
          activeTool={activeTool}
          zoom={zoom}
          position={position}
          isPanning={isPanning}
          annotations={annotations}
          filters={filters}
          onAnnotationsChange={handleAnnotationsChange}
          onPositionChange={setPosition}
          onZoomChange={handleWheelZoom}
          selectedAnnotation={selectedAnnotation}
          onSelectedAnnotationChange={setSelectedAnnotation}
          onToolChange={handleToolChange}
          showAngles={showAngles}
          showLabels={false}
        />

        {!isMobile && (
          <aside className="w-64 bg-card border-l border-border flex flex-col shadow-sm shrink-0 h-full overflow-hidden">
            <ImageAdjustments
              brightness={filters.brightness}
              contrast={filters.contrast}
              gamma={filters.gamma}
              invert={filters.invert}
              onBrightnessChange={(v) => setFilters((f) => ({ ...f, brightness: v }))}
              onContrastChange={(v) => setFilters((f) => ({ ...f, contrast: v }))}
              onGammaChange={(v) => setFilters((f) => ({ ...f, gamma: v }))}
              onInvertChange={(v) => setFilters((f) => ({ ...f, invert: v }))}
              onReset={resetFilters}
              hasImage={!!imageSrc}
            />

            <ShapeDimensions
              selectedAnnotation={getSelectedAnnotationObject()}
              onLabelChange={handleLabelChange}
            />

            <AnnotationList
              annotations={annotations}
              selectedAnnotation={selectedAnnotation}
              onSelect={setSelectedAnnotation}
              onDelete={handleDeleteAnnotation}
              onToggleLock={handleToggleLock}
              onToggleVisibility={handleToggleVisibility}
              showAngles={showAngles}
              onToggleShowAngles={() => setShowAngles(!showAngles)}
            />
          </aside>
        )}
      </div>

      <footer className={cn(
        "bg-card border-t border-border flex transition-all duration-500 ease-in-out absolute bottom-0 left-0 right-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]",
        isMobile
          ? ((isLhsOpen ? "h-24" : isRhsOpen ? "h-56" : currentPhase === 'results' ? "h-40" : "h-20") + " px-2")
          : "h-10 px-4 justify-between text-xs text-muted-foreground w-full"
      )}>
        {!isMobile ? (
          <>
            <div className="flex items-center gap-4 min-w-0">
              <span>
                Tool: <strong className="text-foreground">{activeTool}</strong>
              </span>
              {isPanning && <span className="text-primary">Panning mode</span>}
              {selectedAnnotation && (
                <span className="text-primary">Shape selected</span>
              )}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden lg:inline">
                Shortcuts: V=Select, P=Marker, B=Box, C=Circle, A=Angle
              </span>
              {imageSrc && (
                <MedicalButton
                  variant="primary"
                  size="sm"
                  onClick={handleAutoAnnotate}
                  disabled={isDetecting}
                  className="shrink-0"
                >
                  {isDetecting ? "Auto Annotating..." : "Auto Annotate"}
                </MedicalButton>
              )}
            </div>
          </>
        ) : (
          imageSrc && (
            <div className="w-full flex flex-col items-center justify-center relative">
              {/* FAB / Floating Auto Annotate - Just above the bar */}
              {!isLhsOpen && !isRhsOpen && (
                <div className="absolute -top-16 left-0 right-0 flex justify-center pointer-events-none">
                  <button
                    onClick={async () => {
                      await handleAutoAnnotate();
                      setCurrentPhase('results');
                      setIsRhsOpen(false);
                    }}
                    disabled={isDetecting}
                    className="pointer-events-auto h-14 px-8 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all text-xs font-bold uppercase tracking-widest ring-8 ring-background"
                  >
                    {isDetecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-5 w-5" />}
                    {isDetecting ? "Processing..." : "Auto Annotate"}
                  </button>
                </div>
              )}

              {/* Main Buttons */}
              {!isLhsOpen && !isRhsOpen && (
                <div className="flex w-full items-center justify-around gap-4 px-6 h-full pb-2">
                  <button
                    onClick={() => setIsLhsOpen(true)}
                    className="flex-1 flex flex-col items-center justify-center h-14 rounded-2xl bg-muted/50 active:bg-primary/10 transition-all border border-border/50"
                  >
                    <Hammer size={22} className="mb-1 opacity-80" />
                    <span className="text-[9px] uppercase font-bold tracking-[0.1em]">Selection Tools</span>
                  </button>

                  <button
                    onClick={() => setIsRhsOpen(true)}
                    className="flex-1 flex flex-col items-center justify-center h-14 rounded-2xl bg-muted/50 active:bg-primary/10 transition-all border border-border/50"
                  >
                    <Settings2 size={22} className="mb-1 opacity-80" />
                    <span className="text-[9px] uppercase font-bold tracking-[0.1em]">Adjust Photo</span>
                  </button>
                </div>
              )}

              {/* Selection Toolbar Mode */}
              {isLhsOpen && (
                <div className="w-full h-full flex flex-col p-1 animate-in slide-in-from-bottom duration-300">
                  <div className="flex items-center justify-between px-4 h-10 mb-2">
                    <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest">Draw & Measure</span>
                    <button onClick={() => { setIsLhsOpen(false); setActiveTool('select'); }} className="text-white text-xs font-black px-5 py-2 rounded-xl bg-primary shadow-lg shadow-primary/20 active:scale-95 transition-all">Done</button>
                  </div>
                  <div className="flex-1 w-full overflow-x-auto no-scrollbar pb-1">
                    <AnnotationToolbar
                      activeTool={activeTool}
                      onToolChange={handleToolChange}
                      onUpload={handleUpload}
                      onUndo={handleUndo}
                      onRedo={handleRedo}
                      canUndo={historyIndex > 0}
                      canRedo={historyIndex < history.length - 1}
                      hasImage={!!imageSrc}
                      isMobile={true}
                    />
                  </div>
                </div>
              )}

              {/* Comprehensive Image Adjustments & View Options Mode */}
              {isRhsOpen && (
                <div className="w-full h-full flex flex-col p-2 animate-in slide-in-from-bottom duration-300 bg-background/50 backdrop-blur-xl border-t border-primary/20">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <button onClick={resetFilters} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground bg-muted px-3 py-1.5 rounded-full">Reset Filters</button>
                    <button onClick={() => setIsRhsOpen(false)} className="text-white text-xs font-black px-5 py-1.5 rounded-xl bg-primary shadow-lg shadow-primary/20 active:scale-95 transition-all">Done</button>
                  </div>

                  <div className="flex-1 flex flex-col gap-2 px-1 overflow-y-auto no-scrollbar">
                    {/* Adjustment Categories as Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setActiveAdjustment(activeAdjustment === 'brightness' ? null : 'brightness')}
                        className={cn(
                          "flex flex-row items-center justify-center gap-2 py-2 rounded-xl border transition-all",
                          activeAdjustment === 'brightness' ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-card border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <Sun className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Bright</span>
                      </button>
                      <button
                        onClick={() => setActiveAdjustment(activeAdjustment === 'contrast' ? null : 'contrast')}
                        className={cn(
                          "flex flex-row items-center justify-center gap-2 py-2 rounded-xl border transition-all",
                          activeAdjustment === 'contrast' ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-card border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <Moon className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Contrast</span>
                      </button>
                      <button
                        onClick={() => setActiveAdjustment(activeAdjustment === 'gamma' ? null : 'gamma')}
                        className={cn(
                          "flex flex-row items-center justify-center gap-2 py-2 rounded-xl border transition-all",
                          activeAdjustment === 'gamma' ? "bg-primary border-primary text-white shadow-md shadow-primary/20" : "bg-card border-border text-foreground hover:bg-muted"
                        )}
                      >
                        <Settings2 className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Gamma</span>
                      </button>
                    </div>

                    {/* Level 2: Active Slider Section (Compact) */}
                    {activeAdjustment && (
                      <div className="p-3 pb-4 rounded-2xl bg-secondary/80 border border-border mt-auto animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{activeAdjustment}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-black text-primary">
                              {activeAdjustment === 'brightness' ? `${filters.brightness}%` :
                                activeAdjustment === 'contrast' ? `${filters.contrast}%` :
                                  `${filters.gamma.toFixed(1)}`}
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={activeAdjustment === 'gamma' ? "0.1" : "0"}
                          max={activeAdjustment === 'gamma' ? "3" : "200"}
                          step={activeAdjustment === 'gamma' ? "0.1" : "1"}
                          value={activeAdjustment === 'brightness' ? filters.brightness :
                            activeAdjustment === 'contrast' ? filters.contrast :
                              filters.gamma}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFilters(f => ({ ...f, [activeAdjustment]: val }));
                          }}
                          className="w-full accent-primary h-2 rounded-lg bg-slate-300 dark:bg-slate-700 appearance-none cursor-pointer border border-black/10 dark:border-white/10"
                        />
                        <div className="flex justify-between mt-1 px-0.5">
                          <span className="text-[8px] font-bold text-muted-foreground/50">MIN</span>
                          <span className="text-[8px] font-bold text-muted-foreground/50">MAX</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Phase Results Navbar (Labels) */}
              {currentPhase === 'results' && !isLhsOpen && !isRhsOpen && (
                <div className="w-full h-full bg-background/90 backdrop-blur-md p-3 animate-in fade-in slide-in-from-bottom duration-500">
                  <div className="flex items-center justify-between mb-2 px-2">
                    <span className="text-[10px] font-bold uppercase text-primary tracking-widest">Detected Annotations</span>
                    <button
                      onClick={() => setCurrentPhase('adjust')}
                      className="text-[10px] font-bold text-muted-foreground underline"
                    >
                      Back to Adjust
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    {annotations.filter(a => a.label && !a.id.startsWith('derived_')).map((ann) => (
                      <div
                        key={ann.id}
                        className="px-3 py-1.5 rounded-full bg-secondary border border-border flex items-center gap-2 shrink-0"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ann.color }} />
                        <span className="text-[10px] font-bold whitespace-nowrap">{ann.label}</span>
                      </div>
                    ))}
                    {annotations.length === 0 && (
                      <span className="text-xs text-muted-foreground italic px-2">No labels detected yet.</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => setIsLhsOpen(true)}
                      className="py-2.5 rounded-xl bg-muted/50 text-[10px] font-bold uppercase tracking-wider"
                    >
                      Add/Edit Manually
                    </button>
                    <button
                      onClick={handleSave}
                      className="py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider"
                    >
                      Finalize & Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </footer>
    </div>
  );
}

export default XRayAnnotation;
