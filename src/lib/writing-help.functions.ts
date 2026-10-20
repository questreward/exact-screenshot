import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { cleanDraft, validateWriting, writingPrompt } from "@/game/writing-help";

// Draft only: local VPS model (Ollama), never publishes or writes game state, no external fallback.
export const draftWriting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateWriting)
  .handler(async ({ data, context }): Promise<{ draft: string }> => {
    const sb = context.supabase as any;
    const { data: ch } = await sb.from("characters").select("id").eq("user_id", context.userId).maybeSingle();
    if (!ch) throw new Error("Aucun personnage.");
    const url = process.env["OLLAMA_URL"];
    const model = process.env["OLLAMA_MODEL"] || "qwen2.5:3b";
    if (!url) throw new Error("L'aide à l'écriture n'est pas encore installée sur le serveur.");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(`${url.replace(/\/$/, "")}/api/chat`, {
      method: "POST", signal: ctrl.signal, headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, stream: false, options: { temperature: 0.6, num_predict: 450 }, messages: [
        { role: "system", content: writingPrompt(data.kind, data.tone) },
        { role: "user", content: `Sujet et idées du joueur :\n"""\n${data.ideas}\n"""` },
      ] }),
    }).catch(() => null).finally(() => clearTimeout(timer));
    if (!res || !res.ok) throw new Error("L'aide à l'écriture est indisponible pour le moment.");
    const body = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
    return { draft: cleanDraft(body.message?.content, data.max) };
  });
