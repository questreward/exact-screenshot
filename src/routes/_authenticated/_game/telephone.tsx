import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMyUniform } from "@/hooks/use-my-uniform";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeft, Lock } from "lucide-react";
import { PHONE_APPS, COMING_SOON } from "@/game/navigation";
import { BankLoans } from "@/components/game/BankLoans";
import { InsuranceCard } from "@/components/game/InsuranceCard";
import { CharacterAvatar } from "@/components/game/CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import { notificationsQuery, clockQuery, bankQuery, characterQuery, formatMoney, lifeQuery, socialQuery, newsQuery, civicQuery } from "@/services/game";
import { CivicSummary } from '@/components/game/CivicSummary';
import { SocialContacts } from "@/components/game/SocialContacts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { gameMeta } from "@/game/metadata";
import { NetworkPanel } from '@/components/game/NetworkPanel';
import { GovernanceLink } from '@/components/game/GovernancePage';
import { governanceQuery } from '@/services/game';
import { economyQuery } from '@/services/game';
import { EconomyBankLinks } from '@/components/game/EconomyPage';
import { MessagesApp, CiviApp } from '@/components/game/CommunicationApps';
import { communicationQuery, threadsQuery, messagesQuery, messageTemplatesQuery, civiFeedQuery, positionQuery } from '@/services/game';
import { PhoneHome } from '@/components/game/PhoneHome';

export const Route = createFileRoute("/_authenticated/_game/telephone")({
  validateSearch: (s: Record<string, unknown>): { app?: string | undefined } => ({ app: typeof s["app"] === "string" ? s["app"] : undefined }),
  head: () => ({ meta: gameMeta("Téléphone", "Votre profil, votre banque et votre carte dans CIVITAS.") }),
  loader: async ({ context: { queryClient: q } }) => { await q.fetchQuery(lifeQuery); await Promise.all([q.fetchQuery(characterQuery), q.fetchQuery(bankQuery), q.ensureQueryData(economyQuery), q.ensureQueryData(socialQuery), q.ensureQueryData(newsQuery), q.ensureQueryData(civicQuery),q.ensureQueryData(governanceQuery), q.ensureQueryData(positionQuery), q.ensureQueryData(notificationsQuery), q.ensureQueryData(clockQuery)]); await q.fetchQuery(communicationQuery); await Promise.all([q.ensureQueryData(threadsQuery), q.ensureQueryData(messagesQuery), q.ensureQueryData(messageTemplatesQuery), q.ensureQueryData(civiFeedQuery)]); },
  component: PhonePage,
});

function PhonePage() {
  const { app } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: news } = useSuspenseQuery(newsQuery);
  const { data: comm } = useSuspenseQuery(communicationQuery);
  const open = (id?: string) => id === "politique" ? navigate({ to: "/politique" }) : id === "ma-ville" ? navigate({to:'/ma-ville'}) : id === "actualites" ? navigate({ to: "/actualites" }) : id === "jt" ? navigate({ to: "/jt", search: {} }) : id === "organisations" ? navigate({ to: "/organisations" }) : id === "carte" ? navigate({ to: "/carte", search: {} }) : id === "agenda" ? navigate({ to: "/agenda" }) : id === "vie" ? navigate({ to: "/vie" }) : id === "demarches" ? navigate({ to: "/demarches" }) : id === "evenements" ? navigate({ to: "/evenements" }) : navigate({ search: { app: id } });
  const current = PHONE_APPS.find((a) => a.id === app);

  return (
    <div className="flex justify-center animate-rise">
      <div className="relative w-full max-w-sm rounded-[2.75rem] border-8 border-secondary bg-surface p-3 shadow-card">
        <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-background" />
        <div className="min-h-[560px] rounded-[2rem] bg-background p-4">
          {!current ? (
            <><PhoneHome open={open} /><div className="mt-5 border-t border-border pt-4"><GovernanceLink/></div></>
          ) : (
            <div>
              <button onClick={() => open(undefined)} className="mb-4 flex h-10 items-center gap-1 text-sm text-primary">
                <ChevronLeft className="h-4 w-4" /> Accueil
              </button>
              <h1 className="mb-4 text-2xl font-bold">{current.label}</h1>
              {current.id === "profil" ? <ProfileApp /> : current.id === "banque" ? <BankApp /> : current.id === "contacts" ? <SocialContacts /> : current.id === "messages" ? <MessagesApp /> : current.id === "social" ? <CiviApp /> : current.id === "reseau" ? <NetworkPanel /> : (
                <div className="mt-10 flex flex-col items-center text-center">
                  <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-muted"><current.icon className="h-9 w-9 text-muted-foreground" /></span>
                  <p className="mt-6 font-semibold">{COMING_SOON}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Cette application sera débloquée prochainement.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileApp() {
  const { data: c } = useSuspenseQuery(characterQuery);
  const uniform = useMyUniform();
  if (!c) return null;
  return (
    <div className="text-center">
      <div className="mx-auto h-32 w-28 overflow-hidden rounded-3xl border border-border"><CharacterAvatar appearance={normalizeAppearance(c.appearance)} uniform={uniform} /></div>
      <p className="mt-3 text-xl font-bold">{c.first_name} {c.last_name}</p>
      <p className="text-sm text-muted-foreground">{c.age} ans · {c.city?.name}</p>
      <p className="mt-4 rounded-2xl bg-accent/60 p-3 text-sm">{c.path?.name} — {c.situation}</p>
      <div className="mt-4 text-left"><CivicSummary profile/></div>
    </div>
  );
}

function BankApp() {
  const { data: bank } = useSuspenseQuery(bankQuery);
  if (!bank) return <p className="text-sm text-muted-foreground">Aucun compte.</p>;
  return (
    <div>
      <div className="rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
        <p className="text-sm opacity-80">{bank.label}</p>
        <p className="mt-1 font-display text-3xl font-bold">{formatMoney(bank.balance)}</p>
      </div>
      <div className="mt-4"><EconomyBankLinks/></div>
      <div className="mt-4"><BankLoans compact /></div>
      <div className="mt-4"><InsuranceCard compact /></div>
      <h2 className="mt-5 mb-2 text-sm font-semibold text-muted-foreground">Historique</h2>
      <ul className="space-y-2">
        {bank.transactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded-2xl bg-accent/60 p-3">
            <div>
              <p className="text-sm font-semibold">{t.label}</p>
              <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
            <span className={cn("font-semibold", t.amount >= 0 ? "text-success" : "text-destructive")}>
              {t.amount >= 0 ? "+" : ""}{formatMoney(t.amount)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
