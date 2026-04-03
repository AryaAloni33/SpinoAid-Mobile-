import { useRef, useState, MouseEvent, useEffect, WheelEvent, TouchEvent } from "react";
import { cn } from "@/lib/utils";
import { ImageIcon } from "lucide-react";
import type { AnnotationTool } from "./AnnotationToolbar";

interface Annotation {
  id: string;
  type: AnnotationTool;
  points: { x: number; y: number }[];
  color: string;
  text?: string;
  label?: string;
  locked?: boolean;
  hideAngle?: boolean;
  hidden?: boolean;
  hideFirstLine?: boolean;
  hideLines?: boolean;
  isDashed?: boolean;
}

interface ImageFilters {
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
}

type ResizeHandle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null;

interface ImageCanvasProps {
  imageSrc: string | null;
  activeTool: AnnotationTool;
  zoom: number;
  position: { x: number; y: number };
  isPanning: boolean;
  annotations: Annotation[];
  filters: ImageFilters;
  onAnnotationsChange: (annotations: Annotation[], skipHistory?: boolean) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  selectedAnnotation: string | null;
  onSelectedAnnotationChange: (id: string | null) => void;
  onToolChange: (tool: AnnotationTool) => void;
  showAngles?: boolean;
  showLabels?: boolean;
}

const ANNOTATION_COLORS = {
  marker: "#f43f5e",
  box: "#22c55e",
  circle: "#3b82f6",
  ellipse: "#ec4899",
  line: "#f59e0b",
  freehand: "#ef4444",
  ruler: "#8b5cf6",
  angle: "#06b6d4",
  text: "#a855f7",
  select: "#60a5fa",
  eraser: "#60a5fa",
};

const ImageCanvas = ({
  imageSrc,
  activeTool,
  zoom,
  position,
  isPanning: isGlobalPanning,
  annotations,
  filters,
  onAnnotationsChange,
  onPositionChange,
  onZoomChange,
  selectedAnnotation,
  onSelectedAnnotationChange,
  onToolChange,
  showAngles = true,
  showLabels = true,
}: ImageCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number } | null>(null);
  const [resizeAnchor, setResizeAnchor] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);

  // Touch specific states
  const [touchDistStart, setTouchDistStart] = useState<number | null>(null);
  const [touchCenterStart, setTouchCenterStart] = useState<{ x: number; y: number } | null>(null);

  const getRelativePosition = (e: MouseEvent | { clientX: number, clientY: number }): { x: number; y: number } => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - position.x) / zoom,
      y: (e.clientY - rect.top - position.y) / zoom,
    };
  };

  const getTouchDist = (touches: React.TouchList) => {
    return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
  };

  const getTouchCenter = (touches: React.TouchList) => {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const isPointNearAnnotation = (pos: { x: number; y: number }, ann: Annotation): boolean => {
    const threshold = 15 / zoom;
    // Simplified hit detection for mobile
    return ann.points.some(p => Math.abs(p.x - pos.x) < threshold && Math.abs(p.y - pos.y) < threshold);
  };

  const handleMouseDown = (e: MouseEvent | { clientX: number, clientY: number, preventDefault: () => void }) => {
    if (!imageSrc) return;
    const pos = getRelativePosition(e);

    if (isGlobalPanning || activeTool === "select") {
      const clicked = annotations.find(ann => isPointNearAnnotation(pos, ann));
      if (clicked && activeTool === "select") {
        onSelectedAnnotationChange(clicked.id);
        setIsDragging(true);
        setDragOffset(pos);
      } else {
        setIsPanning(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
      return;
    }

    if (activeTool === "eraser") {
      setIsErasing(true);
      onAnnotationsChange(annotations.filter(ann => !isPointNearAnnotation(pos, ann)));
      return;
    }

    setIsDrawing(true);
    const newAnn: Annotation = {
      id: Date.now().toString(),
      type: activeTool,
      points: [pos, pos],
      color: ANNOTATION_COLORS[activeTool] || "#ffffff",
      label: `${activeTool} ${annotations.length + 1}`
    };
    setCurrentAnnotation(newAnn);
  };

  const handleMouseMove = (e: MouseEvent | { clientX: number, clientY: number }) => {
    if (!imageSrc) return;
    const pos = getRelativePosition(e);

    if (isPanning && dragStart) {
      onPositionChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    if (isDragging && selectedAnnotation && dragOffset) {
      const dx = pos.x - dragOffset.x;
      const dy = pos.y - dragOffset.y;
      onAnnotationsChange(annotations.map(ann =>
        ann.id === selectedAnnotation
          ? { ...ann, points: ann.points.map(p => ({ x: p.x + dx, y: p.y + dy })) }
          : ann
      ), true);
      setDragOffset(pos);
      return;
    }

    if (isDrawing && currentAnnotation) {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: currentAnnotation.type === "freehand"
          ? [...currentAnnotation.points, pos]
          : [currentAnnotation.points[0], pos]
      });
    }

    if (isErasing) {
      onAnnotationsChange(annotations.filter(ann => !isPointNearAnnotation(pos, ann)));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentAnnotation) {
      onAnnotationsChange([...annotations, currentAnnotation]);
      onSelectedAnnotationChange(currentAnnotation.id);
    }
    setIsDrawing(false);
    setIsPanning(false);
    setIsDragging(false);
    setIsErasing(false);
    setDragStart(null);
    setDragOffset(null);
    setCurrentAnnotation(null);
  };

  const handleWheel = (e: WheelEvent) => {
    if (!imageSrc) return;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 0.1), 10);
    onZoomChange(newZoom);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2) {
      setTouchDistStart(getTouchDist(e.touches));
      setTouchCenterStart(getTouchCenter(e.touches));
      setIsDrawing(false);
      return;
    }
    const touch = e.touches[0];
    handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY, preventDefault: () => { } });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!imageSrc) return;
    if (e.touches.length === 2 && touchDistStart && touchCenterStart) {
      const currentDist = getTouchDist(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      const deltaZoom = currentDist / touchDistStart;
      const newZoom = Math.min(Math.max(zoom * deltaZoom, 0.1), 10);

      const newX = currentCenter.x - (touchCenterStart.x - position.x) * (newZoom / zoom);
      const newY = currentCenter.y - (touchCenterStart.y - position.y) * (newZoom / zoom);

      onZoomChange(newZoom);
      onPositionChange({ x: newX, y: newY });
      setTouchDistStart(currentDist);
      setTouchCenterStart(currentCenter);
      return;
    }
    const touch = e.touches[0];
    handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
  };

  const handleTouchEnd = () => handleMouseUp();

  // Draw annotations on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%)`;
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";

      const allAnnotations = [...annotations];
      if (currentAnnotation) allAnnotations.push(currentAnnotation);

      allAnnotations.forEach(ann => {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        if (ann.type === "marker") {
          ctx.arc(ann.points[0].x, ann.points[0].y, 10 / zoom, 0, Math.PI * 2);
          ctx.stroke();
        } else if (ann.type === "box" && ann.points.length > 1) {
          ctx.strokeRect(ann.points[0].x, ann.points[0].y, ann.points[1].x - ann.points[0].x, ann.points[1].y - ann.points[0].y);
        } else {
          ann.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();
        }

        // Draw label if enabled
        if (showLabels && ann.label && ann.type !== "text") {
          ctx.fillStyle = ann.color;
          ctx.font = `${14 / zoom}px Inter, sans-serif`;
          ctx.fillText(ann.label, ann.points[0].x, ann.points[0].y - (10 / zoom));
        }
      });
    };
  }, [imageSrc, annotations, currentAnnotation, filters, zoom, showLabels]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 relative overflow-hidden touch-none select-none bg-black/5 dark:bg-black/40",
        isGlobalPanning && "cursor-grab active:cursor-grabbing"
      )}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {!imageSrc ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-4 opacity-20" />
          <p>No image loaded</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
      )}
    </div>
  );
};

export { ImageCanvas, type Annotation };
export default ImageCanvas;
