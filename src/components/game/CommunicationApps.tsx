import { GameSelect } from "@/components/game/GameSelect";
import { PlayerFace } from '@/components/game/CivicProfileCard';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ChevronLeft, Heart, MapPin, Repeat2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  civiFeedQuery, civiPost, civiReact, communicationQuery, interactSocial, messageTemplatesQuery,
  messagesQuery, positionQuery, readThread, replyMessage, threadsQuery,
} from '@/services/game';
import { conversationMessages } from '@/game/phone-state';
import { ExperienceState } from './ExperienceState';
import { canPost, postsLeft } from '@/game/communication';

function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['communication'] }), qc.invalidateQueries({ queryKey: ['notifications'] })]);
}
const time = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export function MessagesApp({ threadId, onThreadChange }: { threadId?: string | undefined; onThreadChange?: (id?: string) => void } = {}) {
  useSuspenseQuery(communicationQuery);
  const { data: threads } = useSuspenseQuery(threadsQuery);
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const [open, setOpen] = useState<string | null>(null);
  const refresh = useRefresh();
  const read = useMutation({ mutationFn: readThread, onSuccess: refresh, onError: () => toast.error("La lecture n’a pas pu être enregistrée. Réessayez.") });
  const selected = threadId ?? open;
  const select = (id?: string) => { setOpen(id ?? null); onThreadChange?.(id); };
  const thread = threads.find((t) => t.id === selected);
  if (thread) return <Conversation thread={thread} onBack={() => select(undefined)} />;
  if (!threads.length) return <ExperienceState kind="empty" title="Aucune conversation pour le moment" description="Les messages enregistrés de vos rencontres apparaîtront ici." />;
  return (
    <ul className="space-y-2">
      {threads.map((t) => {
        const list = conversationMessages(messages, t.id);
        const last = list[list.length - 1];
        const unread = list.filter((m) => m.sender === 'npc' && !m.read_at).length;
        return (
          <li key={t.id}>
            <Button variant="ghost" onClick={() => { select(t.id); if (unread) read.mutate(t.id); }} className="flex h-auto min-h-20 w-full items-center justify-start gap-3 border-b border-border px-1 py-3 text-left">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary">{t.npc?.first_name[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline justify-between gap-1"><span className="font-semibold">{t.npc?.first_name} {t.npc?.last_name}</span><time className="text-[10px] font-normal text-muted-foreground">{time(last?.sent_at ?? t.last_message_at)}</time></span>
                <span className="line-clamp-2 block text-sm font-normal text-muted-foreground">{last?.body}</span>
              </span>
              {unread > 0 && <span aria-label={`${unread} non lus`} className="flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1 text-xs font-bold text-destructive-foreground">{unread}</span>}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function Conversation({ thread, onBack }: { thread: import('@/game/communication').Thread; onBack: () => void }) {
  const { data: messages } = useSuspenseQuery(messagesQuery);
  const { data: tpl } = useSuspenseQuery(messageTemplatesQuery);
  const { data: pos } = useSuspenseQuery(positionQuery);
  const refresh = useRefresh();
  const qc = useQueryClient();
  const reply = useMutation({ mutationFn: replyMessage, onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const invite = useMutation({
    mutationFn: () => interactSocial({ npcId: thread.npc_id, actionId: 'invite' }),
    onSuccess: () => { toast.success('Rendez-vous ajouté à votre agenda'); void qc.invalidateQueries(); },
    onError: (e) => toast.error(e.message),
  });
  const list = conversationMessages(messages, thread.id);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [thread.id, list.length]);
  const here = pos?.location_id && pos.location_id === thread.npc?.location_id;
  return (
    <div className="phone-conversation">
      <Button variant="ghost" onClick={onBack} className="mb-3 flex min-h-11 items-center justify-start gap-1 px-0 text-sm text-primary"><ChevronLeft className="h-4 w-4" />Conversations</Button>
      <h2 className="mb-4 border-b border-border pb-3 text-lg font-semibold">{thread.npc?.first_name} {thread.npc?.last_name}</h2>
      <div className="space-y-3">
        {list.map((m) => {
          const replies = tpl.messages.find((t) => t.id === m.template_id)?.replies ?? [];
          return (
            <div key={m.id} className={cn('flex flex-col', m.sender === 'player' ? 'items-end' : 'items-start')}>
              <p className={cn('max-w-[90%] break-words rounded-2xl px-3 py-2 text-sm leading-relaxed', m.sender === 'player' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>{m.body}</p>
              <span className="mt-1 text-[11px] text-muted-foreground">{time(m.sent_at)}{m.sender === 'player' ? ' · Envoyé' : m.read_at ? ' · Lu' : ''}</span>
              {m.sender === 'npc' && !m.replied_with && replies.length > 0 && (
                <div className="mt-2 flex w-full flex-col gap-2">
                  {replies.map((r) => (
                    <Button key={r.id} variant="outline" className="min-h-11 justify-start" disabled={reply.isPending} onClick={() => reply.mutate({ messageId: m.id, replyId: r.id })}>{r.label}</Button>
                  ))}
                </div>
              )}
              {m.template_id === 'invite_offer_1' && (here
                ? <Button className="mt-2 min-h-11" disabled={invite.isPending} onClick={() => invite.mutate()}>Proposer un rendez-vous</Button>
                : <Button asChild variant="secondary" className="mt-2 min-h-11"><Link to="/carte" search={{}}><MapPin />Rejoindre ce lieu pour proposer un rendez-vous</Link></Button>)}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {reply.isPending && <ExperienceState compact kind="loading" title="Envoi de votre réponse…" />}
      {reply.isError && <ExperienceState compact kind="error" title="Votre réponse n’a pas été envoyée" description="Vous pouvez sélectionner à nouveau votre réponse." />}
    </div>
  );
}

export function CiviApp() {
  const { data: s } = useSuspenseQuery(communicationQuery);
  const { data: feed } = useSuspenseQuery(civiFeedQuery);
  const { data: tpl } = useSuspenseQuery(messageTemplatesQuery);
  const [choice, setChoice] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const refresh = useRefresh();
  const post = useMutation({
    mutationFn: civiPost,
    onSuccess: async () => { setRequestId(crypto.randomUUID()); setChoice(''); await refresh(); toast.success('Publication partagée'); },
    onError: (e) => toast.error(e.message),
  });
  const react = useMutation({ mutationFn: civiReact, onSuccess: refresh, onError: (e) => toast.error(e.message) });
  const has = (id: string, kind: string) => feed.reactions.some((r) => r.post_id === id && r.kind === kind);
  return (
    <div className="space-y-4">
      <Link to="/civi" className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Ouvrir Civi : écrire librement, suivre, commenter</Link>
      <section className="rounded-xl border border-border bg-card p-3">
        <label htmlFor="civi-template" className="text-sm font-semibold">Publier</label>
        <GameSelect id="civi-template" value={choice} onChange={(e) => setChoice(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Choisir un message…</option>
          {tpl.posts.map((p) => <option key={p.id} value={p.id}>{p.body.replace('{city}', 'ma ville').replace('{place}', '')}</option>)}
        </GameSelect>
        <Button className="mt-2 min-h-12 w-full" disabled={!choice || !canPost(s) || post.isPending} onClick={() => post.mutate({ templateId: choice, requestId })}><Send />Publier</Button>
        <p className="mt-2 text-xs text-muted-foreground">{postsLeft(s)} publication(s) restante(s) aujourd’hui · purement sociale, sans gain</p>
      </section>
      <ul className="space-y-3">
        {feed.posts.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2"><PlayerFace id={p.character_id} name={p.character_id ? 'Vous' : p.author_label} size="h-9 w-9" /><p className="text-sm font-semibold">{p.character_id ? 'Vous' : p.author_label}</p></div>
            <p className="mt-1 text-sm">{p.body}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex-1">{time(p.posted_at)}</span>
              {p.news_id && <Link to="/actualites/$id" params={{ id: p.news_id }} className="text-primary">Lire</Link>}
              <Button variant="ghost" size="sm" className="min-h-10" aria-pressed={has(p.id, 'like')} aria-label="J’aime" onClick={() => react.mutate({ postId: p.id, kind: 'like', on: !has(p.id, 'like') })}><Heart className={cn(has(p.id, 'like') && 'fill-current text-primary')} /></Button>
              <Button variant="ghost" size="sm" className="min-h-10" aria-pressed={has(p.id, 'share')} aria-label="Partager" onClick={() => react.mutate({ postId: p.id, kind: 'share', on: !has(p.id, 'share') })}><Repeat2 className={cn(has(p.id, 'share') && 'text-primary')} /></Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
