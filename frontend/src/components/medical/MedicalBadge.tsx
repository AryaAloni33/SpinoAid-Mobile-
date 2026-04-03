import { cn } from "@/lib/utils";

interface MedicalBadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function MedicalBadge({
  children,
  variant = "default",
  size = "sm",
  className,
}: MedicalBadgeProps) {
  const variants = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-success/15 text-success border border-success/20",
    warning: "bg-warning/15 text-warning border border-warning/20",
    error: "bg-destructive/15 text-destructive border border-destructive/20",
    info: "bg-primary/15 text-primary border border-primary/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
