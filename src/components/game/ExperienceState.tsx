import { CheckCircle2, Info, LoaderCircle, AlertTriangle, PackageOpen } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS = { loading: LoaderCircle, success: CheckCircle2, error: AlertTriangle, empty: PackageOpen, info: Info };

/** Presentation only: callers supply the actual recorded result and existing action. */
export function ExperienceState({ kind, title, description, onRetry, children, compact = false }: {
  kind: keyof typeof ICONS; title: string; description?: string; onRetry?: () => void; children?: ReactNode; compact?: boolean;
}) {
  const Icon = ICONS[kind];
  return <div role={kind === "error" ? "alert" : "status"} className={cn("experience-state", compact && "experience-state-compact")} data-kind={kind}>
    <Icon aria-hidden className={cn("mt-0.5 h-5 w-5 shrink-0", kind === "loading" && "animate-spin")} />
    <div className="min-w-0 flex-1"><p className="font-semibold leading-relaxed">{title}</p>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {onRetry && <Button variant="outline" className="mt-3" onClick={onRetry}>Réessayer</Button>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  </div>;
}

export function ExperienceLoading() {
  return <div className="mx-auto w-full max-w-2xl py-8" aria-busy="true">
    <ExperienceState kind="loading" title="Préparation de votre espace…" description="Votre partie reste en cours." />
    <div aria-hidden className="mt-6 space-y-3"><div className="h-36 rounded-lg bg-muted/50" /><div className="h-5 w-2/3 rounded bg-muted/50" /><div className="h-5 w-1/2 rounded bg-muted/50" /></div>
  </div>;
}