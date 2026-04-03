import { forwardRef, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface MedicalCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

const MedicalCard = forwardRef<HTMLDivElement, MedicalCardProps>(
  ({ className, variant = "default", padding = "md", children, ...props }, ref) => {
    const baseStyles = "rounded-lg transition-shadow duration-200";

    const variants = {
      default: "bg-card border border-border shadow-card",
      elevated: "bg-card border border-border shadow-md hover:shadow-lg",
      outlined: "bg-transparent border-2 border-border",
    };

    const paddings = {
      none: "",
      sm: "p-3",
      md: "p-5",
      lg: "p-6",
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

MedicalCard.displayName = "MedicalCard";

interface MedicalCardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const MedicalCardHeader = forwardRef<HTMLDivElement, MedicalCardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 pb-4", className)}
      {...props}
    />
  )
);

MedicalCardHeader.displayName = "MedicalCardHeader";

interface MedicalCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

const MedicalCardTitle = forwardRef<HTMLHeadingElement, MedicalCardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-lg font-semibold text-foreground leading-none tracking-tight", className)}
      {...props}
    />
  )
);

MedicalCardTitle.displayName = "MedicalCardTitle";

interface MedicalCardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

const MedicalCardDescription = forwardRef<HTMLParagraphElement, MedicalCardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);

MedicalCardDescription.displayName = "MedicalCardDescription";

interface MedicalCardContentProps extends HTMLAttributes<HTMLDivElement> {}

const MedicalCardContent = forwardRef<HTMLDivElement, MedicalCardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);

MedicalCardContent.displayName = "MedicalCardContent";

interface MedicalCardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const MedicalCardFooter = forwardRef<HTMLDivElement, MedicalCardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center pt-4", className)}
      {...props}
    />
  )
);

MedicalCardFooter.displayName = "MedicalCardFooter";

export {
  MedicalCard,
  MedicalCardHeader,
  MedicalCardTitle,
  MedicalCardDescription,
  MedicalCardContent,
  MedicalCardFooter,
};
