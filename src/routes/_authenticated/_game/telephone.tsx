import { lazy } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { PHONE_APPS, COMING_SOON } from "@/game/navigation";
import { gameMeta } from "@/game/metadata";
import { preparePhone } from "@/services/phone";
import { PhoneFrame } from "@/components/game/PhoneFrame";
import { PhoneHome, NotificationsApp } from "@/components/game/PhoneHome";
import { ExperienceState } from "@/components/game/ExperienceState";
import { Button } from "@/components/ui/button";
import { PhoneLoading } from '@/components/game/PhoneLoading';

const MessagesApp = lazy(() => import("@/components/game/CommunicationApps").then(m => ({ default: m.MessagesApp })));
const CiviApp = lazy(() => import("@/components/game/CommunicationApps").then(m => ({ default: m.CiviApp })));
const PoliticsApp = lazy(() => import("@/components/game/PoliticsApp").then(m => ({ default: m.PoliticsApp })));
const SocialContacts = lazy(() => import("@/components/game/SocialContacts").then(m => ({ default: m.SocialContacts })));
const SocialHub = lazy(() => import("@/components/game/SocialHub").then(m => ({ default: m.SocialHub })));
const NetworkPanel = lazy(() => import("@/components/game/NetworkPanel").then(m => ({ default: m.NetworkPanel })));
const BankApp = lazy(() => import("@/components/game/PhoneAccountApps").then(m => ({ default: m.BankApp })));
const ProfileApp = lazy(() => import("@/components/game/PhoneAccountApps").then(m => ({ default: m.ProfileApp })));
const PhoneWork = lazy(() => import("@/components/game/PhoneWork").then(m => ({ default: m.PhoneWork })));
const PhoneWeather = lazy(() => import("@/components/game/PhoneWeather").then(m => ({ default: m.PhoneWeather })));

export const Route = createFileRoute("/_authenticated/_game/telephone")({
  validateSearch: (s: Record<string, unknown>): { app?: string | undefined; thread?: string | undefined } => ({ app: typeof s["app"] === "string" ? s["app"] : undefined, thread: typeof s["thread"] === "string" ? s["thread"] : undefined }),
  head: () => ({ meta: gameMeta("Mon téléphone", "Messages, notifications, banque et activités : retrouvez votre vie dans le smartphone CIVITAS.") }),
  loaderDeps: ({ search }) => ({ app: search.app }),
  loader: ({ context: { queryClient }, deps }) => preparePhone(queryClient, deps.app),
  pendingMs: 0,
  pendingMinMs: 0,
  pendingComponent: PhoneLoading,
  errorComponent: PhoneError,
  component: PhonePage,
});

function PhoneError() {
  const router = useRouter();
  return <PhoneLoading failed onRetry={() => void router.invalidate()} />;
}

function PhonePage() {
  const { app, thread } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const open = (id?: string) => id === "ma-ville" ? navigate({ to: "/ma-ville" }) : id === "actualites" ? navigate({ to: "/actualites" }) : id === "jt" ? navigate({ to: "/jt", search: {} }) : id === "organisations" ? navigate({ to: "/organisations" }) : id === "carte" ? navigate({ to: "/carte", search: {} }) : id === "agenda" ? navigate({ to: "/agenda" }) : id === "vie" ? navigate({ to: "/vie" }) : id === "demarches" ? navigate({ to: "/demarches" }) : id === "evenements" ? navigate({ to: "/evenements" }) : navigate({ search: { app: id, thread: undefined }, resetScroll: false });
  const current = app === "notifications" ? { id: "notifications", label: "Notifications", icon: Bell, available: true } : app === "vie-sociale" ? { id: "vie-sociale", label: "Vie sociale", icon: Bell, available: true } : PHONE_APPS.find(a => a.id === app);
  return <div className="flex min-w-0 justify-center"><PhoneFrame app={current?.id} title={current?.label} onHome={() => void open(undefined)} onBack={() => void navigate({ search: app === 'messages' && thread ? { app: 'messages', thread: undefined } : { app: undefined, thread: undefined }, resetScroll: false })} onClose={() => void navigate({ to: "/tableau-de-bord" })} onNotifications={() => void open("notifications")}>
    {!current ? <PhoneHome open={open} /> : current.id === "notifications" ? <NotificationsApp /> : current.id === "messages" ? <MessagesApp threadId={thread} onThreadChange={id => void navigate({ search: { app: "messages", thread: id }, resetScroll: false })} /> : current.id === "social" ? <CiviApp /> : current.id === "profil" ? <ProfileApp /> : current.id === "banque" ? <BankApp /> : current.id === "contacts" ? <SocialContacts /> : current.id === "vie-sociale" ? <SocialHub open={open} /> : current.id === "reseau" ? <NetworkPanel /> : current.id === "politique" ? <PoliticsApp /> : current.id === "travail" ? <PhoneWork /> : current.id === "meteo" ? <PhoneWeather /> : <ExperienceState kind="info" title={COMING_SOON}><Button asChild variant="outline"><Link to="/telephone" search={{}}>Revenir au téléphone</Link></Button></ExperienceState>}
  </PhoneFrame></div>;
}
