import { Ruler } from "lucide-react";
import type { Annotation } from "./ImageCanvas";

interface ShapeDimensionsProps {
  selectedAnnotation: Annotation | null;
  onLabelChange?: (id: string, newLabel: string) => void;
}

const DimensionRow = ({ label, value, unit = "px" }: { label: string; value: string; unit?: string; key?: string }) => (
  <div className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <span className="text-xs font-mono text-foreground">
      {value}<span className="text-muted-foreground ml-0.5">{unit}</span>
    </span>
  </div>
);

const ShapeDimensions = ({ selectedAnnotation, onLabelChange }: ShapeDimensionsProps) => {
  if (!selectedAnnotation) {
    return (
      <div className="flex flex-col border-b border-border bg-card/50">
        <div className="p-3 bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            Shape Dimensions
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Select a shape to view size</p>
        </div>
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center">
            No shape selected.<br />
            Draw or select a shape to see its dimensions.
          </p>
        </div>
      </div>
    );
  }

  const { type, points } = selectedAnnotation;

  // Calculate dimensions based on annotation type
  const getDimensions = () => {
    switch (type) {
      case "box":
        if (points.length < 2) return null;
        const boxWidth = Math.abs(points[1].x - points[0].x);
        const boxHeight = Math.abs(points[1].y - points[0].y);
        return {
          width: boxWidth.toFixed(1),
          height: boxHeight.toFixed(1),
        };

      case "circle":
        if (points.length < 2) return null;
        const radius = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) +
          Math.pow(points[1].y - points[0].y, 2)
        );
        const diameter = radius * 2;
        return {
          radius: radius.toFixed(1),
          diameter: diameter.toFixed(1),
        };

      case "ellipse":
        if (points.length < 2) return null;
        const rx = Math.abs(points[1].x - points[0].x) / 2;
        const ry = Math.abs(points[1].y - points[0].y) / 2;
        return {
          width: (rx * 2).toFixed(1),
          height: (ry * 2).toFixed(1),
        };

      case "line":
      case "ruler":
        if (points.length < 2) return null;
        const length = Math.sqrt(
          Math.pow(points[1].x - points[0].x, 2) +
          Math.pow(points[1].y - points[0].y, 2)
        );
        return {
          length: length.toFixed(1),
        };

      case "angle":
        if (points.length < 3) return null;
        // Calculate angle
        const v1 = { x: points[0].x - points[1].x, y: points[0].y - points[1].y };
        const v2 = { x: points[2].x - points[1].x, y: points[2].y - points[1].y };
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        const angleRad = Math.acos(cosAngle);
        const angleDeg = (angleRad * 180) / Math.PI;
        return {
          angle: angleDeg.toFixed(1),
          line1Length: mag1.toFixed(1),
          line2Length: mag2.toFixed(1),
        };

      case "marker":
        if (points.length < 1) return null;
        return {
          x: points[0].x.toFixed(1),
          y: points[0].y.toFixed(1),
        };

      case "text":
        if (points.length < 2) return null;
        const textWidth = Math.abs(points[1].x - points[0].x);
        const textHeight = Math.abs(points[1].y - points[0].y);
        return {
          width: textWidth.toFixed(1),
          height: textHeight.toFixed(1),
        };

      case "freehand":
        if (points.length < 2) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach((p) => {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        });
        return {
          boundingWidth: (maxX - minX).toFixed(1),
          boundingHeight: (maxY - minY).toFixed(1),
          pointCount: points.length.toString(),
        };

      default:
        return null;
    }
  };

  const dimensions = getDimensions();

  if (!dimensions) {
    return (
      <div className="flex flex-col border-b border-border bg-card/50">
        <div className="p-3 bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <Ruler className="h-4 w-4 text-muted-foreground" />
            Shape Dimensions
          </h2>
        </div>
        <div className="flex-1 p-4">
          <p className="text-xs text-muted-foreground">Unable to calculate dimensions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-b border-border">
      <div className="p-3 bg-muted/30">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Ruler className="h-4 w-4 text-muted-foreground" />
          Shape Dimensions
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{type} selected</p>
      </div>

      <div className="p-3 space-y-2">
        {Object.entries(dimensions).map(([key, value]) => {
          let label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
          let unit = "px";

          if (key === "angle") unit = "°";
          else if (key === "pointCount") {
            label = "Points";
            unit = "";
          }

          return <DimensionRow key={key} label={label} value={value} unit={unit} />;
        })}

        <div className="mt-3 flex flex-col gap-1.5 py-1.5 px-2 rounded bg-primary/5 border border-primary/10">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Shape Label</span>
          <input
            type="text"
            value={selectedAnnotation.label || ""}
            onChange={(e) => {
              if (onLabelChange) {
                onLabelChange(selectedAnnotation.id, e.target.value);
              }
            }}
            className="bg-transparent border-none text-xs font-bold text-primary focus:outline-none p-0 w-full"
            placeholder="No Label"
          />
        </div>
      </div>
    </div>
  );
};

export { ShapeDimensions };
