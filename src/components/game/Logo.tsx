import logo from "@/assets/civitas-logo.png";
import { cn } from "@/lib/utils";

export function Logo({ className, showText = true, size = 36 }: { className?: string; showText?: boolean; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src={logo} alt="" width={size} height={size} style={{ width: size, height: size }} />
      {showText && (
        <span className="font-display text-xl font-bold tracking-[0.22em] text-foreground">CIVITAS</span>
      )}
    </span>
  );
}
