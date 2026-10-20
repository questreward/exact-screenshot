import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanReply, npcSystemPrompt, validateChat } from "@/game/npc-chat";

// Narrative only: local VPS model (Ollama), never writes game state, no external fallback.
export const chatWithNpc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateChat)
  .handler(async ({ data, context }): Promise<{ reply: string }> => {
    const sb = context.supabase as any;
    const [{ data: social, error: e1 }, { data: life, error: e2 }] = await Promise.all([sb.rpc("social_state"), sb.rpc("daily_life_state")]);
    if (e1 || e2 || !social || !life) throw new Error("Habitant indisponible.");
    const npc = [...(social.nearby ?? []), ...(social.relations ?? []).map((r: any) => r.npc)].find((n: any) => n?.id === data.npcId);
    if (!npc) throw new Error("Habitant inconnu.");
    if (life.position?.location_id !== npc.location_id) throw new Error(`Rejoins ${npc.location?.name ?? "son lieu"} pour discuter.`);
    const rel = (social.relations ?? []).find((r: any) => r.npc_id === npc.id);
    const { data: events } = await sb.from("events").select("title").eq("city_id", npc.city_id ?? life.position?.city_id).lte("starts_at", social.world_now).gte("ends_at", social.world_now).limit(3);

    const url = process.env["OLLAMA_URL"];
    const model = process.env["OLLAMA_MODEL"] || "qwen2.5:3b";
    if (!url) throw new Error("La discussion n'est pas encore installée sur le serveur.");
    const hour = new Date(social.world_now).toISOString().slice(11, 16);
    const system = npcSystemPrompt({
      first_name: npc.first_name, last_name: npc.last_name, age: npc.age, profession: npc.profession ?? "habitant",
      description: npc.description ?? "", traits: Array.isArray(npc.traits) ? npc.traits : [], place: npc.location?.name ?? "la ville",
      city: npc.location?.city_name ?? npc.city_id ?? "la ville", relation: rel?.level ?? "Inconnu", hour,
      events: (events ?? []).map((e: { title: string }) => e.title),
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    const res = await fetch(`${url.replace(/\/$/, "")}/api/chat`, {
      method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, options: { temperature: 0.7, num_predict: 160 }, messages: [{ role: "system", content: system }, ...data.history] }),
    }).catch(() => null).finally(() => clearTimeout(timer));
    if (!res || !res.ok) throw new Error("L'habitant ne peut pas répondre pour le moment.");
    const body = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
    return { reply: cleanReply(body.message?.content) };
  });
