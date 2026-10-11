import { cn } from "@/lib/cn";

export function Alert({
  variant = "default",
  children,
  className,
}: {
  variant?: "default" | "success" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        variant === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        variant === "error" && "border-red-200 bg-red-50 text-red-900",
        variant === "default" &&
          "border-border bg-card text-foreground shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
