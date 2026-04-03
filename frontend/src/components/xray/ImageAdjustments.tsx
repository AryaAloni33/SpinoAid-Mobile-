import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sun, Contrast, CircleDot } from "lucide-react";

interface ImageAdjustmentsProps {
  brightness: number;
  contrast: number;
  gamma: number;
  invert: boolean;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onGammaChange: (value: number) => void;
  onInvertChange: (value: boolean) => void;
  onReset: () => void;
  hasImage: boolean;
}

const ImageAdjustments = ({
  brightness,
  contrast,
  gamma,
  invert,
  onBrightnessChange,
  onContrastChange,
  onGammaChange,
  onInvertChange,
  onReset,
  hasImage,
}: ImageAdjustmentsProps) => {
  return (
    <div className="flex flex-col border-b border-border">
      {/* Header */}
      <div className="p-3 bg-muted/30">
        <h2 className="text-sm font-semibold text-foreground">Image Adjustments</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">Enhance X-Ray clarity</p>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Brightness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5 text-muted-foreground" />
              Brightness
            </Label>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {brightness}%
            </span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={(v) => onBrightnessChange(v[0])}
            min={0}
            max={200}
            step={1}
            disabled={!hasImage}
            className="cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <Contrast className="h-3.5 w-3.5 text-muted-foreground" />
              Contrast
            </Label>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {contrast}%
            </span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={(v) => onContrastChange(v[0])}
            min={0}
            max={200}
            step={1}
            disabled={!hasImage}
            className="cursor-pointer"
          />
        </div>

        {/* Gamma */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
              Gamma
            </Label>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {(gamma / 100).toFixed(2)}
            </span>
          </div>
          <Slider
            value={[gamma]}
            onValueChange={(v) => onGammaChange(v[0])}
            min={20}
            max={300}
            step={1}
            disabled={!hasImage}
            className="cursor-pointer"
          />
        </div>


        {/* Invert Toggle */}
        <div className="flex items-center justify-between py-2 px-1 rounded-lg bg-muted/50">
          <Label className="text-xs font-medium cursor-pointer">
            Invert Colors
          </Label>
          <Switch
            checked={invert}
            onCheckedChange={onInvertChange}
            disabled={!hasImage}
          />
        </div>
      </div>

      {/* Reset Button */}
      <div className="p-3 border-t border-border bg-muted/30">
        <Button
          onClick={onReset}
          variant="outline"
          size="sm"
          disabled={!hasImage}
          className="w-full flex items-center justify-center gap-2"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Adjustments
        </Button>
      </div>
    </div>
  );
};

export { ImageAdjustments };
