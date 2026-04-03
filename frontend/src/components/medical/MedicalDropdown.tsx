import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

interface MedicalDropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function MedicalDropdown({
  trigger,
  items,
  align = "left",
  className,
}: MedicalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer"
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={cn(
            "absolute z-50 mt-2 min-w-48 rounded-lg border border-border bg-popover p-1.5 shadow-lg",
            "animate-scale-in origin-top",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-popover-foreground",
                "transition-colors duration-150",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:outline-none focus:bg-accent focus:text-accent-foreground",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
              role="menuitem"
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface MedicalDropdownButtonProps {
  children: React.ReactNode;
  items: DropdownItem[];
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}

export function MedicalDropdownButton({
  children,
  items,
  variant = "primary",
  className,
}: MedicalDropdownButtonProps) {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary:
      "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline:
      "border border-border bg-background text-foreground hover:bg-muted",
  };

  return (
    <MedicalDropdown
      items={items}
      trigger={
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
            "transition-all duration-200 focus-ring",
            variants[variant],
            className
          )}
        >
          {children}
          <ChevronDown className="h-4 w-4" />
        </div>
      }
    />
  );
}
