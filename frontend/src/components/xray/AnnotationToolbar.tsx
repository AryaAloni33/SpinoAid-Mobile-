import {
  Upload,
  Square,
  Pencil,
  Circle,
  Type,
  Eraser,
  Undo2,
  Redo2,
  Save,
  MousePointer2,
  RotateCcw,
  Ruler,
  Slash,
  Crosshair,
  Triangle,
  Ellipsis
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AnnotationTool =
  | "select"
  | "marker"
  | "box"
  | "freehand"
  | "circle"
  | "ellipse"
  | "line"
  | "ruler"
  | "angle"
  | "text"
  | "eraser";

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onUpload: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasImage: boolean;
  isMobile?: boolean;
}

interface ToolItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

const ToolItem = ({ icon: Icon, label, isActive, disabled, onClick, isMobile }: ToolItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "group relative flex items-center transition-all duration-200 focus-ring disabled:opacity-40 disabled:pointer-events-none",
      isMobile
        ? "flex-col justify-center min-w-[64px] h-full gap-1 px-2 rounded-lg py-1"
        : "gap-3 w-full px-3 py-2.5 rounded-lg",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-foreground hover:bg-accent",
    )}
  >
    <Icon className={cn(isMobile ? "h-6 w-6" : "h-4 w-4", "shrink-0")} />
    {!isMobile && <span className="text-sm font-medium truncate">{label}</span>}
  </button>
);

const AnnotationToolbar = ({
  activeTool,
  onToolChange,
  onUpload,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasImage,
  isMobile = false,
}: AnnotationToolbarProps) => {
  const allTools = [
    { id: "select" as const, icon: MousePointer2, label: "Select" },
    { id: "marker" as const, icon: Crosshair, label: "Marker" },
    { id: "box" as const, icon: Square, label: "Box" },
    { id: "circle" as const, icon: Circle, label: "Circle" },
    { id: "ellipse" as const, icon: Ellipsis, label: "Ellipse" },
    { id: "line" as const, icon: Slash, label: "Line" },
    { id: "ruler" as const, icon: Ruler, label: "Ruler" },
    { id: "angle" as const, icon: Triangle, label: "Angle" },
    { id: "freehand" as const, icon: Pencil, label: "Freehand" },
    { id: "text" as const, icon: Type, label: "Text" },
    { id: "eraser" as const, icon: Eraser, label: "Eraser" },
  ];

  const content = (
    <div className={cn(
      "flex h-full",
      isMobile ? "flex-row items-center gap-1 px-2" : "flex-col w-52 bg-card border-r border-border shadow-sm")
    }>
      {!isMobile && (
        <div className="p-3 border-b border-border bg-muted/30">
          <h2 className="text-sm font-semibold text-foreground">Annotation Tools</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">X-Ray Workspace</p>
        </div>
      )}

      {!isMobile && (
        <div className="p-2">
          <button onClick={onUpload} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all font-medium text-sm shadow-sm">
            <Upload className="h-4 w-4" />
            <span>Upload Image</span>
          </button>
        </div>
      )}

      {/* Tools List */}
      <div className={cn(
        "flex",
        isMobile ? "flex-row h-full overflow-x-auto no-scrollbar items-center gap-1" : "flex-col flex-1 overflow-y-auto"
      )}>
        {isMobile && (
          <div className="flex items-center gap-1 pr-2 border-r border-border h-10 mr-1">
            <button onClick={onUndo} disabled={!canUndo} className="p-2 rounded-lg bg-muted disabled:opacity-30"><Undo2 size={18} /></button>
            <button onClick={onRedo} disabled={!canRedo} className="p-2 rounded-lg bg-muted disabled:opacity-30"><Redo2 size={18} /></button>
          </div>
        )}

        {allTools.map((tool) => (
          <ToolItem
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            isActive={activeTool === tool.id}
            onClick={() => onToolChange(tool.id)}
            disabled={!hasImage && tool.id !== "select"}
            isMobile={isMobile}
          />
        ))}
      </div>

      {!isMobile && (
        <div className="p-2 border-t border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-1">
            <button onClick={onUndo} disabled={!canUndo} className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all disabled:opacity-40 text-sm">
              <Undo2 className="h-3.5 w-3.5" />
              <span>Undo</span>
            </button>
            <button onClick={onRedo} disabled={!canRedo} className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-all disabled:opacity-40 text-sm">
              <Redo2 className="h-3.5 w-3.5" />
              <span>Redo</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) return content;
  return <aside className="h-full shrink-0">{content}</aside>;
};

export { AnnotationToolbar };
