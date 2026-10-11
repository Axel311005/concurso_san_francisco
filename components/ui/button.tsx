import * as React from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "@/components/ui/spinner";

type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "soft";

type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  success?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-tight transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary-hover focus-visible:outline-primary",
  secondary:
    "bg-muted text-foreground border border-border hover:bg-muted/80 focus-visible:outline-muted-foreground",
  soft:
    "bg-primary/10 text-primary border border-primary/15 hover:bg-primary/15 focus-visible:outline-primary",
  destructive:
    "bg-destructive text-white shadow-sm hover:brightness-110 focus-visible:outline-destructive",
  outline:
    "border border-border bg-card text-foreground shadow-sm hover:bg-muted/60 focus-visible:outline-primary",
  ghost: "text-foreground hover:bg-muted/80 focus-visible:outline-primary",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-11 min-h-[44px] px-5 text-sm",
  sm: "h-9 min-h-[36px] px-3.5 text-sm",
  lg: "h-14 min-h-[56px] px-8 text-base",
  icon: "h-11 w-11 min-h-[44px] min-w-[44px] p-0",
};

export function buttonClasses(
  variant: ButtonVariant = "default",
  size: ButtonSize = "default",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  className,
  variant = "default",
  size = "default",
  loading = false,
  success = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const showExtras = loading || success;

  return (
    <button
      {...props}
      className={cn(
        buttonClasses(variant, size, className),
        loading && "relative cursor-wait",
        success && "animate-btn-success",
      )}
      disabled={disabled || loading}
      {...(loading ? { "aria-busy": true } : {})}
    >
      {showExtras ? (
        <>
          {loading && <Spinner className="size-5" />}
          {success && !loading && (
            <span className="text-lg leading-none" aria-hidden>✓</span>
          )}
          <span className={cn(loading && "opacity-90")}>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "default",
  size = "default",
  className,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <a
      href={href}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {children}
    </a>
  );
}
