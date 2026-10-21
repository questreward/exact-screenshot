import { Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Home, Briefcase, GraduationCap } from "lucide-react";
import { lifeQuery, notificationsQuery } from "@/services/game";
import { useWorldClock } from "./WorldClock";
import { nextStep } from "@/game/next-step";

export function NextStepCard({ cityName }: { cityName?: string | null }) {
  const { data: life } = useSuspenseQuery(lifeQuery);
  const { data: notifs } = useSuspenseQuery(notificationsQuery);
  const { time } = useWorldClock();
  const step = nextStep({
    now: time, activities: life.activities, notifications: notifs,
    hasHousing: !!life.housing, studying: !!life.enrollment, working: !!life.employment, age: life.character.age,
  });
  const date = time.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const role = life.employment?.job?.title ?? (life.enrollment ? `Études : ${life.enrollment.field_name}` : null);
  return (
    <section aria-label="Ma journée" className="space-y-3">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-card animate-rise">
        <p className="font-display text-lg font-bold capitalize">{date}</p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-3">
          <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {life.position?.location_id ? "En ville" : "Chez toi"} · {cityName}</li>
          <li className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> {life.housing ? life.housing.name : "Pas encore de logement"}</li>
          {role && <li className="flex items-center gap-2">{life.employment ? <Briefcase className="h-4 w-4 text-primary" /> : <GraduationCap className="h-4 w-4 text-primary" />} {role}</li>}
        </ul>
      </div>
      <Link to={step.to as "/agenda"}
        className="flex min-h-20 items-center gap-4 rounded-3xl border-2 border-primary bg-gradient-card p-4 shadow-elegant transition-transform active:scale-[0.98] animate-rise">
        <span className="text-3xl" aria-hidden>{step.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-wide text-primary">Prochaine étape</span>
          <span className="block font-display text-lg font-bold leading-tight">{step.title}</span>
          <span className="line-clamp-2 block text-sm text-muted-foreground">{step.detail}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">{step.cta}<ArrowRight className="h-4 w-4" /></span>
      </Link>
    </section>
  );
}
