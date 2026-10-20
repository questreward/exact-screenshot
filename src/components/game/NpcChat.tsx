import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare, Send, RotateCcw, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithNpc } from "@/lib/npc-chat.functions";
import { MAX_MESSAGE, MAX_TURNS, NPC_CHAT_STARTERS, type ChatTurn } from "@/game/npc-chat";

export function NpcChat({ npcId, name, here }: { npcId: string; name: string; here: boolean }) {
  return <NpcConversation key={npcId} npcId={npcId} name={name} here={here} />;
}

function NpcConversation({ npcId, name, here }: { npcId: string; name: string; here: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const end = useRef<HTMLDivElement>(null);
  const chat = useServerFn(chatWithNpc);
  const send = useMutation({
    mutationFn: (history: ChatTurn[]) => chat({ data: { npcId, history: history.slice(-MAX_TURNS) } }),
    onSuccess: r => setTurns(t => [...t, { role: "assistant", content: r.reply }]),
  });
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [turns, send.isPending, open]);
  const submit = (msg: string) => {
    const m = msg.trim();
    if (!here || !m || m.length > MAX_MESSAGE || send.isPending || send.isError) return;
    const next = [...turns, { role: "user" as const, content: m }];
    setTurns(next); setText(""); send.mutate(next);
  };
  if (!open) return <Button variant="outline" className="min-h-12 w-full justify-start" disabled={!here} onClick={() => setOpen(true)}><MessageSquare />{turns.length ? 'Reprendre la conversation' : 'Discuter'}</Button>;
  return <div className="space-y-3 border-t border-border py-3" aria-label={`Conversation avec ${name}`}>
    <div className="flex items-center justify-between gap-2"><p className="min-w-0 break-words font-semibold">{name}</p><div className="flex shrink-0 gap-1">
      <Button variant="ghost" size="icon" className="h-12 w-12" title="Recommencer la conversation" aria-label="Recommencer la conversation" disabled={send.isPending} onClick={() => { setTurns([]); setText(''); send.reset(); }}><RotateCcw /></Button>
      <Button variant="ghost" size="icon" className="h-12 w-12" title="Fermer la conversation" aria-label="Fermer la conversation" onClick={() => setOpen(false)}><X /></Button>
    </div></div>
    <p className="text-xs text-muted-foreground">Dialogue fictif · aucun effet sur le jeu · conservé uniquement tant que cette page reste ouverte.</p>
    {!here && <p role="status" className="text-sm text-muted-foreground">Rejoins {name} pour poursuivre l’échange.</p>}
    <div className="max-h-80 space-y-2 overflow-y-auto" role="log" aria-label="Messages" aria-live="polite">
      {turns.map((t, i) => <p key={i} className={`max-w-[90%] break-words rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{t.role === "assistant" && <span className="block text-xs font-semibold">{name}</span>}{t.content}</p>)}
      {send.isPending && <p className="text-sm text-muted-foreground">{name} réfléchit…</p>}
      {send.isError && <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{send.error instanceof Error ? send.error.message : 'La réponse est indisponible.'}</p><Button variant="outline" className="min-h-12" disabled={!here} onClick={() => send.mutate(turns)}><RefreshCw />Réessayer le même message</Button></div>}
      <div ref={end} />
    </div>
    {turns.length === 0 && <div className="flex flex-wrap gap-2">{NPC_CHAT_STARTERS.map(s => <Button key={s} variant="secondary" className="min-h-11" onClick={() => submit(s)}>{s}</Button>)}</div>}
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); submit(text); }}>
      <Textarea aria-label={`Message à ${name}`} value={text} maxLength={MAX_MESSAGE} disabled={!here || send.isPending || send.isError} onChange={e => setText(e.target.value)} rows={2} className="min-h-12 min-w-0 flex-1 text-base" placeholder="Écris ton message…" />
      <Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label="Envoyer" disabled={!here || !text.trim() || send.isPending || send.isError}><Send /></Button>
    </form>
  </div>;
}
