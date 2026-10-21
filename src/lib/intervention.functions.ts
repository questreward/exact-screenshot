import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanReaction, interventionPrompt, validateIntervention } from "@/game/intervention";
import { CAB_HOTSPOTS } from "@/game/v2-scenes";
import { hasTruckKit } from "@/game/job-decor";

// Récit seulement : IA locale du VPS (Ollama). Ne modifie jamais la mission ni le jeu.
export const narrateIntervention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateIntervention)
  .handler(async ({ data, context }): Promise<{ reaction: string }> => {
    const sb = context.supabase as any;
    const { data: state, error } = await sb.rpc("job_mission_state", {});
    const m = state?.mission;
    if (error || !m || m.status !== "active" || !m.step) throw new Error("Aucune intervention en cours.");
    const cab = hasTruckKit(m.job);
    const kit = cab ? CAB_HOTSPOTS[cab].filter((h) => data.kit.includes(h.id)).map((h) => h.label) : [];

    const url = process.env["OLLAMA_URL"];
    const model = process.env["OLLAMA_MODEL"] || "qwen2.5:3b";
    if (!url) throw new Error("Le récit n'est pas encore installé sur le serveur.");
    const system = interventionPrompt({
      job: m.job, title: m.title, step: m.step.text, choices: (m.step.choices ?? []).map((c: { label: string }) => c.label),
      kit, city: m.city_id ?? "la ville",
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(`${url.replace(/\/$/, "")}/api/chat`, {
      method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, options: { temperature: 0.7, num_predict: 220 }, messages: [{ role: "system", content: system }, { role: "user", content: data.action }] }),
    }).catch(() => null).finally(() => clearTimeout(timer));
    if (!res || !res.ok) throw new Error("Le récit n'est pas disponible pour le moment.");
    const body = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
    return { reaction: cleanReaction(body.message?.content) };
  });
