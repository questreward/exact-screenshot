import { Component, Suspense, useEffect, useState, type ReactNode } from "react";
import { Bell, ChevronLeft, Home, Wifi, WifiOff, X } from "lucide-react";
import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { notificationsQuery } from "@/services/game";
import { useWorldClock } from "./WorldClock";
import { ExperienceState } from "./ExperienceState";

class AppBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <ExperienceState kind="error" title="Cette application est momentanément indisponible" description="Vous pouvez réessayer ou revenir à votre téléphone." onRetry={() => { this.props.onRetry(); this.setState({ failed: false }); }} /> : this.props.children; }
}

export function PhoneFrame({ app, title, onHome, onBack, onClose, onNotifications, children }: {
  app?: string | undefined; title?: string | undefined; onHome: () => void; onBack?: (() => void) | undefined; onClose: () => void; onNotifications: () => void; children: ReactNode;
}) {
  const { time } = useWorldClock();
  const { data: notices } = useSuspenseQuery(notificationsQuery);
  const unread = notices.filter(n => !n.read).length;
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update(); window.addEventListener("online", update); window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  return <div className="phone-shell" data-app={app ?? "home"}>
    <div className="phone-status">
      <time className="text-xs font-semibold tabular-nums">{time.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</time>
      <span className="text-[10px] font-semibold text-muted-foreground">CIVITAS</span>
      <div className="flex items-center gap-1">{online ? <Wifi aria-label="Connexion disponible" className="h-4 w-4 text-muted-foreground" /> : <WifiOff aria-label="Hors connexion" className="h-4 w-4 text-warning" />}
        <Button size="icon" variant="ghost" title="Notifications" onClick={onNotifications} aria-label={`Notifications${unread ? ` : ${unread} non lues` : ""}`} className="relative"><Bell />{unread > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>}</Button>
        <Button size="icon" variant="ghost" title="Fermer le téléphone" aria-label="Fermer le téléphone" onClick={onClose}><X /></Button>
      </div>
    </div>
    {!online && <ExperienceState compact kind="info" title="Hors connexion" description="Les informations déjà chargées restent visibles. Les nouvelles actions nécessitent une connexion." />}
    <div className="phone-screen">
      {app && <header className="mb-4 flex items-center gap-2 border-b border-border pb-3"><Button variant="ghost" size="icon" className="min-h-12 min-w-12" onClick={onBack ?? onHome} title="Revenir à l’écran précédent" aria-label="Revenir à l’écran précédent"><ChevronLeft /></Button><h1 className="min-w-0 flex-1 break-words text-xl font-bold">{title}</h1></header>}
      <QueryErrorResetBoundary>{({ reset }) => <AppBoundary key={app ?? 'home'} onRetry={reset}><Suspense fallback={<ExperienceState kind="loading" title="Ouverture de l’application…" />}><div className="phone-app-content" key={app ?? "home"}>{children}</div></Suspense></AppBoundary>}</QueryErrorResetBoundary>
    </div>
    <Button variant="ghost" className="phone-home-button" onClick={onHome} aria-label="Écran d’accueil du téléphone" title="Écran d’accueil du téléphone"><Home className="h-4 w-4" /><span aria-hidden className="h-1 w-20 rounded-full bg-muted-foreground/50" /></Button>
  </div>;
}