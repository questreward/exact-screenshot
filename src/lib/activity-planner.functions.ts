import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Conseil seulement : l'IA locale (Ollama) propose un itinéraire parmi les vrais lieux de la ville.
// Elle n'écrit rien dans le jeu ; le joueur se déplace lui-même ensuite.
export type PlanStep = { locationId: string; name: string; kind: string; district: string | null; activity: string };

export const planActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { wish: string }) => {
    const wish = typeof i?.wish === "string" ? i.wish.trim() : "";
    if (wish.length < 3) throw new Error("Décris un peu plus ce que tu veux faire.");
    if (wish.length > 400) throw new Error("400 caractères maximum.");
    return { wish };
  })
  .handler(async ({ data, context }): Promise<{ intro: string; steps: PlanStep[] }> => {
    const sb = context.supabase as any;
    const { data: ch } = await sb.from("characters").select("city_id, age").eq("user_id", context.userId).maybeSingle();
    if (!ch) throw new Error("Crée d'abord ton personnage.");
    const { data: places } = await sb.from("locations").select("id, name, kind, description, opening_hours, accessible, district:districts(name)").eq("city_id", ch.city_id).eq("accessible", true).limit(150);
    const list = (places ?? []) as any[];
    if (!list.length) throw new Error("Aucun lieu disponible dans ta ville.");
    const url = process.env["OLLAMA_URL"];
    const model = process.env["OLLAMA_MODEL"] || "qwen2.5:3b";
    if (!url) throw new Error("Le guide n'est pas encore installé sur le serveur.");
    const catalog = list.map((p, n) => `${n + 1}. ${p.name} (${p.kind}${p.district?.name ? `, ${p.district.name}` : ""})${p.opening_hours ? ` — ${p.opening_hours}` : ""}`).join("\n");
    const system = `Tu es un guide de la ville dans le jeu CIVITAS. Le joueur a ${ch.age} ans. Propose 2 à 4 étapes dans l'ordre, UNIQUEMENT parmi les lieux numérotés ci-dessous. N'invente aucun lieu, prix, récompense ni résultat. Réponds en français, seulement en JSON : {"intro":"une phrase","steps":[{"n":numéro du lieu,"activity":"ce que le joueur peut y faire, une phrase"}]}\n\nLieux :\n${catalog}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(`${url.replace(/\/$/, "")}/api/chat`, {
      method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, format: "json", options: { temperature: 0.5, num_predict: 400 }, messages: [{ role: "system", content: system }, { role: "user", content: data.wish }] }),
    }).catch(() => null).finally(() => clearTimeout(timer));
    if (!res || !res.ok) throw new Error("Le guide ne peut pas répondre pour le moment.");
    const body = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
    let parsed: { intro?: unknown; steps?: unknown } = {};
    try { parsed = JSON.parse(body.message?.content ?? "{}"); } catch { /* ignoré */ }
    const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
    const seen = new Set<string>();
    const steps: PlanStep[] = [];
    for (const s of Array.isArray(parsed.steps) ? parsed.steps.slice(0, 4) : []) {
      const p = list[Number((s as any)?.n) - 1];
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      steps.push({ locationId: p.id, name: p.name, kind: p.kind, district: p.district?.name ?? null, activity: clean((s as any)?.activity, 200) || "Une étape possible pour ton envie." });
    }
    if (!steps.length) throw new Error("Le guide n'a pas trouvé d'itinéraire. Essaie une autre envie.");
    return { intro: clean(parsed.intro, 240) || "Voici un itinéraire possible :", steps };
  });
