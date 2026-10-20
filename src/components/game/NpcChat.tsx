import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { chatWithNpc } from "@/lib/npc-chat.functions";
import { MAX_MESSAGE, MAX_TURNS, NPC_CHAT_STARTERS, type ChatTurn } from "@/game/npc-chat";

export function NpcChat({ npcId, name, here }: { npcId: string; name: string; here: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const chat = useServerFn(chatWithNpc);
  const send = useMutation({
    mutationFn: (history: ChatTurn[]) => chat({ data: { npcId, history: history.slice(-MAX_TURNS) } }),
    onSuccess: r => setTurns(t => [...t, { role: "assistant", content: r.reply }]),
  });
  const submit = (msg: string) => {
    const m = msg.trim();
    if (!m || m.length > MAX_MESSAGE || send.isPending) return;
    const next = [...turns, { role: "user" as const, content: m }];
    setTurns(next); setText(""); send.mutate(next);
  };
  if (!open) return <Button variant="outline" className="min-h-12 w-full justify-start" disabled={!here} onClick={() => setOpen(true)}><MessageSquare />Discuter</Button>;
  return <div className="space-y-3 rounded-xl border border-border bg-card p-3">
    <p className="text-xs text-muted-foreground">Conversation imaginée par l'IA de CIVITAS : elle ne change rien à ta relation ni au jeu, et n'est pas enregistrée.</p>
    <div className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
      {turns.map((t, i) => <p key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${t.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>{t.role === "assistant" && <span className="block text-xs font-semibold">{name}</span>}{t.content}</p>)}
      {send.isPending && <p className="text-sm text-muted-foreground">{name} réfléchit…</p>}
      {send.isError && <p className="text-sm text-destructive">{(send.error as Error).message}</p>}
    </div>
    {turns.length === 0 && <div className="flex flex-wrap gap-2">{NPC_CHAT_STARTERS.map(s => <Button key={s} variant="secondary" className="min-h-11" onClick={() => submit(s)}>{s}</Button>)}</div>}
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); submit(text); }}>
      <Textarea aria-label={`Message à ${name}`} value={text} maxLength={MAX_MESSAGE} onChange={e => setText(e.target.value)} rows={2} className="min-h-12 flex-1 text-base" placeholder="Écris ton message…" />
      <Button type="submit" size="icon" className="h-12 w-12 shrink-0" aria-label="Envoyer" disabled={!text.trim() || send.isPending}><Send /></Button>
    </form>
  </div>;
}
