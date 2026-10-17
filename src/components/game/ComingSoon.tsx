import { Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { COMING_SOON } from "@/game/navigation";

export function ComingSoon({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-3xl border border-border bg-gradient-card p-10 text-center shadow-card animate-rise">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-accent">
        <Icon className="h-9 w-9 text-primary" />
        <span className="absolute -right-2 -bottom-2 flex h-8 w-8 items-center justify-center rounded-full bg-background">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </span>
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description}</p>
      <p className="mt-6 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
        {COMING_SOON}
      </p>
    </div>
  );
}
