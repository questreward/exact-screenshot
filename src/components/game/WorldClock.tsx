import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Moon, Sun } from "lucide-react";
import { clockQuery, weatherQuery } from "@/services/game";
import { dayPhase, PHASE_LABELS, worldTime } from "@/game/world";

export function useWorldClock() {
  const { data } = useSuspenseQuery(clockQuery);
  const [now, setNow] = useState(data.receivedAt);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [data.receivedAt]);
  const time = worldTime(data.anchor, now - data.receivedAt, data.speed);
  return { time, phase: dayPhase(time.getUTCHours()), season: data.season };
}

export function WorldClock({ cityId }: { cityId?: string }) {
  const { time, phase, season } = useWorldClock();
  const Icon = phase === "nuit" ? Moon : Sun;
  return <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
    <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-primary" />
      <time>{time.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · {time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</time>
    </span><span>{PHASE_LABELS[phase]} · {season}</span>
    {cityId && <Weather cityId={cityId} />}
  </div>;
}
function Weather({ cityId }: { cityId: string }) {
  const { data } = useSuspenseQuery(weatherQuery(cityId));
  return data ? <span>{data.condition === "clair" ? "Ciel clair" : data.condition} · {data.temperature} °C · Météo simulée</span> : null;
}