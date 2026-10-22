import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { ExperienceLoading } from "@/components/game/ExperienceState";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { forgetLocalSession, isExpiredSessionError, recoverExpiredSession } from "@/lib/session-recovery";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">Cette page n'existe pas ou a été déplacée.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  const expired = isExpiredSessionError(error);
  const [recovering, setRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  async function retryPage() {
    if (recovering) return;
    setRecovering(true);
    setRecoveryFailed(false);
    try {
      if (expired) {
        await queryClient.cancelQueries();
        const renewed = await recoverExpiredSession();
        queryClient.clear();
        if (!renewed) {
          await router.navigate({ to: '/auth', replace: true });
          return;
        }
      }
      await router.invalidate();
      reset();
    } catch {
      setRecoveryFailed(true);
    } finally {
      setRecovering(false);
    }
  }
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">{expired ? 'Votre connexion a expiré' : "Cette page n'a pas pu se charger"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{expired ? 'Renouvelez votre connexion pour retrouver votre personnage.' : "Une erreur est survenue. Réessayez ou revenez à l'accueil."}</p>
        {recoveryFailed && <p role="alert" className="mt-2 text-sm text-muted-foreground">La connexion n’a pas pu être rétablie. Vérifiez votre accès à Internet ou reconnectez-vous.</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={retryPage}
            disabled={recovering}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            {recovering ? 'Patientez…' : expired ? 'Renouveler ma connexion' : 'Réessayer'}
          </Button>
          {(expired || recoveryFailed) && (
            <Button
              variant="outline"
              disabled={recovering}
              onClick={async () => {
                await queryClient.cancelQueries();
                queryClient.clear();
                await forgetLocalSession();
                await router.navigate({ to: '/auth', replace: true });
              }}
              className="h-11 rounded-xl px-5 text-sm font-semibold"
            >
              Me reconnecter
            </Button>
          )}
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-xl border border-input px-5 text-sm font-semibold text-foreground">
            Accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CIVITAS — Votre vie. Votre ville. Votre histoire." },
      { name: "description", content: "CIVITAS, le jeu de simulation politique et sociale où chaque choix façonne votre vie." },
      { property: "og:title", content: "CIVITAS — Votre vie. Votre ville. Votre histoire." },
      { property: "og:description", content: "Le jeu de simulation politique et sociale où chaque choix façonne votre vie." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#1b2130" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
  pendingComponent: ExperienceLoading,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Réagit seulement quand la personne connectée change réellement : iOS renvoie
    // « SIGNED_IN » à chaque retour sur l'onglet, ce qui rechargeait tout et
    // annulait la navigation juste après « Se connecter ».
    let currentUser: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? null;
      if (currentUser === undefined) { currentUser = next; return; }
      if (next === currentUser && event !== "USER_UPDATED") return;
      currentUser = next;
      if (window.location.pathname === "/auth" && next) return; // la page de connexion navigue elle-même
      router.invalidate();
      if (next) queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster theme="dark" position="top-center" />
    </QueryClientProvider>
  );
}
