import { createFileRoute } from "@tanstack/react-router";

// Relais vers le serveur de carte installé sur le VPS (conteneur civitas-tiles).
// Données publiques (fonds de carte) uniquement ; chemin limité au dossier de cartes.
export const Route = createFileRoute("/tiles/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const origin = process.env["TILES_ORIGIN"];
        const path = String(params._splat ?? "");
        if (!origin || !/^[\w\-./ ,%]+$/.test(path) || path.includes("..")) return new Response("Carte non installée", { status: 404 });
        const headers = new Headers();
        const range = request.headers.get("range");
        if (range) headers.set("range", range);
        const res = await fetch(`${origin.replace(/\/$/, "")}/${path}`, { headers }).catch(() => null);
        if (!res) return new Response("Carte indisponible", { status: 502 });
        const out = new Headers();
        for (const h of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
          const v = res.headers.get(h); if (v) out.set(h, v);
        }
        out.set("cache-control", "public, max-age=86400");
        return new Response(res.body, { status: res.status, headers: out });
      },
    },
  },
});
