import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { financialPrompt, validateFinancialQuestion } from '@/game/financial-adviser';

export const askFinancialAdviser = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateFinancialQuestion)
  .handler(async ({ data, context }) => {
    const url = process.env['OLLAMA_URL'];
    const model = process.env['OLLAMA_MODEL'] || 'qwen2.5:3b';
    if (!url) throw new Error('La conseillère IA locale n’est pas disponible dans cet aperçu.');
    const rpc = context.supabase.rpc as unknown as (name: string, args: object) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data: snapshot, error } = await rpc('financial_adviser_snapshot', {});
    if (error) throw new Error('Votre situation financière n’est pas disponible. Vérifiez l’installation de la conseillère sur le serveur.');
    const response = await fetch(`${url.replace(/\/$/, '')}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(45000),
      body: JSON.stringify({ model, stream: false, format: 'json', options: { temperature: 0.3, num_predict: 700 },
        messages: [{ role: 'system', content: financialPrompt(snapshot) }, { role: 'user', content: data.question }] }),
    }).catch(() => null);
    if (!response?.ok) throw new Error('Votre conseillère ne peut pas répondre pour le moment. Aucun argent n’a été déplacé.');
    const body = await response.json() as { message?: { content?: string } };
    let parsed: { reply?: unknown };
    try { parsed = JSON.parse(body.message?.content ?? '{}'); } catch { throw new Error('La réponse de la conseillère est incomplète.'); }
    const reply = typeof parsed.reply === 'string' ? parsed.reply.replace(/<[^>]*>/g, '').trim().slice(0, 2400) : '';
    if (!reply) throw new Error('La conseillère n’a pas fourni d’explication.');
    return { reply };
  });