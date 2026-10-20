import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Flag, Heart, ImageIcon, MessageCircle, Repeat2, Send, ShieldCheck, Trash2, UserPlus, UserMinus, Ban, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  civiAct, civiDetailQuery, civiModerate, civiModerationQuery, civiNetworkQuery, civiProfileQuery, civiPublish,
  type CiviPhoto, type CiviPost, type CiviTab,
} from '@/services/game';
import ville from '@/assets/city-hero.jpg';
import place from '@/assets/world-square.jpg';
import transport from '@/assets/news-transport.jpg';
import culture from '@/assets/news-culture.jpg';
import politique from '@/assets/learn-politics.jpg';
import societe from '@/assets/learn-society.jpg';

const PHOTOS: Record<CiviPhoto, { src: string; label: string }> = {
  ville: { src: ville, label: 'Ma ville' }, place: { src: place, label: 'Place publique' }, transport: { src: transport, label: 'Transports' },
  culture: { src: culture, label: 'Culture' }, politique: { src: politique, label: 'Politique' }, societe: { src: societe, label: 'Société' },
};
const TABS: { id: CiviTab; label: string }[] = [{ id: 'pour_toi', label: 'Pour toi' }, { id: 'abonnements', label: 'Abonnements' }, { id: 'ville', label: 'Ma ville' }];
const REASONS = [['insulte', 'Insulte'], ['haine', 'Haine'], ['spam', 'Spam'], ['fausse_info', 'Fausse information'], ['autre', 'Autre']] as const;
const when = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function useCivi() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['civi'] });
  return { refresh, act: useMutation({ mutationFn: civiAct, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) }) };
}

export function CiviNetwork() {
  const [tab, setTab] = useState<CiviTab>('pour_toi');
  const { data: feed } = useSuspenseQuery(civiNetworkQuery(tab));
  const [composer, setComposer] = useState<{ repost: CiviPost | null } | null>(null);
  const [openPost, setOpenPost] = useState<string | null>(null);
  const [openProfile, setOpenProfile] = useState<string | null>(null);
  const left = Math.max(0, feed.posts_per_day - feed.posts_today);
  return (
    <div className="space-y-4 pb-24">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{left} publication(s) restante(s) aujourd’hui</span><span aria-hidden>·</span>
        <span>Buzz cette semaine : {feed.buzz_week}/{feed.buzz_week_cap} (une publication à {feed.buzz_likes} « J’aime » donne +1 influence et +1 réputation)</span>
      </div>
      <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn('min-h-12 rounded-lg text-sm font-semibold', tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{t.label}</button>
        ))}
      </div>
      {feed.moderator && <Moderation />}
      {feed.posts.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Rien pour l’instant. Abonne-toi à des joueurs ou publie le premier message.</p>}
      <ul className="space-y-3">
        {feed.posts.map((p) => <PostCard key={p.id} post={p} onOpen={() => setOpenPost(p.id)} onProfile={setOpenProfile} onRepost={() => setComposer({ repost: p })} />)}
      </ul>
      <Button className="fixed bottom-20 right-4 z-30 min-h-14 rounded-full px-6 shadow-lg md:bottom-6" onClick={() => setComposer({ repost: null })} disabled={left === 0}>
        <Send />Publier
      </Button>
      {composer && <Composer limit={feed.body_limit} repost={composer.repost} onClose={() => setComposer(null)} />}
      {openPost && <PostDetail id={openPost} limit={feed.body_limit} onClose={() => setOpenPost(null)} onProfile={(id) => { setOpenPost(null); setOpenProfile(id); }} />}
      {openProfile && <Profile id={openProfile} onClose={() => setOpenProfile(null)} onOpen={(id) => { setOpenProfile(null); setOpenPost(id); }} />}
    </div>
  );
}

function PostCard({ post: p, onOpen, onProfile, onRepost }: { post: CiviPost; onOpen: () => void; onProfile: (id: string) => void; onRepost: () => void }) {
  const { act } = useCivi();
  const [reporting, setReporting] = useState(false);
  const isRepost = !!p.repost;
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-2">
        <button className="min-h-11 flex-1 text-left" disabled={!p.character_id} onClick={() => p.character_id && onProfile(p.character_id)}>
          <span className="font-semibold">{p.mine ? `${p.author_label} (vous)` : p.author_label}</span>
          {p.badge && <span className="ml-2 rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">{p.badge}</span>}
          <span className="block text-xs text-muted-foreground">{isRepost ? 'a republié · ' : ''}{when(p.posted_at)}</span>
        </button>
        {p.mine && <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Supprimer" onClick={() => window.confirm('Supprimer cette publication ?') && act.mutate({ command: 'delete', post: p.id })}><Trash2 /></Button>}
      </div>
      {p.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.body}</p>}
      {p.photo && <img src={PHOTOS[p.photo].src} alt={PHOTOS[p.photo].label} loading="lazy" className="mt-2 aspect-video w-full rounded-lg object-cover" />}
      {p.repost && (
        <div className="mt-2 rounded-lg border border-border p-2 text-sm">
          <p className="font-semibold">{p.repost.author_label}</p>
          <p className="whitespace-pre-wrap break-words">{p.repost.body}</p>
          {p.repost.photo && <img src={PHOTOS[p.repost.photo].src} alt={PHOTOS[p.repost.photo].label} loading="lazy" className="mt-2 aspect-video w-full rounded-lg object-cover" />}
        </div>
      )}
      {p.news_id && <Link to="/actualites/$id" params={{ id: p.news_id }} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary">Lire l’article</Link>}
      <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
        <Button variant="ghost" className="min-h-11 gap-1" aria-pressed={p.liked} aria-label="J’aime" onClick={() => act.mutate({ command: p.liked ? 'unlike' : 'like', post: p.id })}>
          <Heart className={cn(p.liked && 'fill-current text-primary')} />{p.likes}
        </Button>
        <Button variant="ghost" className="min-h-11 gap-1" aria-label="Commentaires" onClick={onOpen}><MessageCircle />{p.comments}</Button>
        <Button variant="ghost" className="min-h-11 gap-1" aria-label="Republier" disabled={p.mine || p.reposted || isRepost} onClick={onRepost}>
          <Repeat2 className={cn(p.reposted && 'text-primary')} />{p.reposts}
        </Button>
        <span className="flex-1" />
        {p.character_id && !p.mine && <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Signaler" onClick={() => setReporting(true)}><Flag /></Button>}
      </div>
      {reporting && (
        <Dialog open onOpenChange={(o) => !o && setReporting(false)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Signaler cette publication</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Après 3 signalements, la publication est masquée en attendant une vérification.</p>
            <div className="grid gap-2">
              {REASONS.map(([id, label]) => (
                <Button key={id} variant="outline" className="min-h-12" onClick={() => { act.mutate({ command: 'report', post: p.id, reason: id }); setReporting(false); toast.success('Signalement envoyé'); }}>{label}</Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </li>
  );
}

function Composer({ limit, repost, onClose }: { limit: number; repost: CiviPost | null; onClose: () => void }) {
  const { refresh } = useCivi();
  const [body, setBody] = useState('');
  const [photo, setPhoto] = useState<CiviPhoto | null>(null);
  const [request] = useState(() => crypto.randomUUID());
  const publish = useMutation({
    mutationFn: civiPublish,
    onSuccess: async () => { await refresh(); toast.success(repost ? 'Publication republiée' : 'Publication partagée'); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{repost ? 'Republier' : 'Nouvelle publication'}</DialogTitle></DialogHeader>
        <label className="block text-sm font-semibold" htmlFor="civi-body">{repost ? 'Ajouter un commentaire (facultatif)' : 'Ton message'}</label>
        <textarea id="civi-body" value={body} maxLength={limit} onChange={(e) => setBody(e.target.value)} rows={4}
          className="w-full rounded-md border border-input bg-background p-3 text-base" placeholder="Quoi de neuf dans ta ville ?" />
        <p className="text-right text-xs text-muted-foreground">{body.length}/{limit}</p>
        {repost ? (
          <div className="rounded-lg border border-border p-2 text-sm"><p className="font-semibold">{repost.author_label}</p><p className="break-words">{repost.body}</p></div>
        ) : (
          <div>
            <p className="mb-2 flex items-center gap-1 text-sm font-semibold"><ImageIcon className="h-4 w-4" />Photo du jeu (facultatif)</p>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PHOTOS) as CiviPhoto[]).map((k) => (
                <button key={k} type="button" aria-pressed={photo === k} onClick={() => setPhoto(photo === k ? null : k)}
                  className={cn('overflow-hidden rounded-lg border-2', photo === k ? 'border-primary' : 'border-transparent')}>
                  <img src={PHOTOS[k].src} alt="" className="aspect-square w-full object-cover" /><span className="block py-1 text-xs">{PHOTOS[k].label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Button className="min-h-12 w-full" disabled={publish.isPending || (!repost && !body.trim())}
          onClick={() => publish.mutate({ body, photo: repost ? null : photo, repost: repost?.id ?? null, request })}><Send />Publier</Button>
      </DialogContent>
    </Dialog>
  );
}

function PostDetail({ id, limit, onClose, onProfile }: { id: string; limit: number; onClose: () => void; onProfile: (id: string) => void }) {
  const { data, error } = useQuery(civiDetailQuery(id));
  const { act } = useCivi();
  const [body, setBody] = useState('');
  const [request, setRequest] = useState(() => crypto.randomUUID());
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Commentaires</DialogTitle></DialogHeader>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && <>
          <p className="whitespace-pre-wrap break-words text-sm"><strong>{data.post.author_label}</strong> — {data.post.body}</p>
          <ul className="space-y-2">
            {data.comments.length === 0 && <li className="text-sm text-muted-foreground">Aucun commentaire.</li>}
            {data.comments.map((c) => (
              <li key={c.id} className="rounded-lg bg-muted p-2 text-sm">
                <div className="flex items-center gap-2">
                  <button className="min-h-10 flex-1 text-left font-semibold" onClick={() => onProfile(c.character_id)}>{c.mine ? `${c.author_label} (vous)` : c.author_label}</button>
                  {c.mine && <Button variant="ghost" size="icon" className="h-10 w-10" aria-label="Supprimer le commentaire" onClick={() => act.mutate({ command: 'delete_comment', target: c.id })}><X /></Button>}
                </div>
                <p className="whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
          <textarea value={body} maxLength={limit} onChange={(e) => setBody(e.target.value)} rows={2} aria-label="Ton commentaire"
            className="w-full rounded-md border border-input bg-background p-3 text-base" placeholder="Répondre…" />
          <Button className="min-h-12 w-full" disabled={!body.trim() || act.isPending} onClick={() => act.mutate({ command: 'comment', post: id, body, request }, { onSuccess: () => { setBody(''); setRequest(crypto.randomUUID()); } })}>Commenter</Button>
        </>}
      </DialogContent>
    </Dialog>
  );
}

function Profile({ id, onClose, onOpen }: { id: string; onClose: () => void; onOpen: (post: string) => void }) {
  const { data, error } = useQuery(civiProfileQuery(id));
  const { act } = useCivi();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{data?.name ?? 'Profil'}</DialogTitle></DialogHeader>
        {error && <p className="text-sm text-destructive">{error.message}</p>}
        {data && <>
          <p className="text-sm text-muted-foreground"><strong className="text-foreground">{data.followers}</strong> abonné(s) · <strong className="text-foreground">{data.following_count}</strong> abonnement(s)</p>
          {!data.mine && (
            <div className="grid grid-cols-2 gap-2">
              <Button className="min-h-12" variant={data.following ? 'outline' : 'default'} disabled={data.blocked} onClick={() => act.mutate({ command: data.following ? 'unfollow' : 'follow', target: id })}>
                {data.following ? <><UserMinus />Ne plus suivre</> : <><UserPlus />Suivre</>}
              </Button>
              <Button className="min-h-12" variant="outline" onClick={() => (data.blocked || window.confirm('Bloquer ce joueur ? Vous ne verrez plus ses publications.')) && act.mutate({ command: data.blocked ? 'unblock' : 'block', target: id })}>
                <Ban />{data.blocked ? 'Débloquer' : 'Bloquer'}
              </Button>
            </div>
          )}
          <ul className="space-y-2">
            {data.posts.length === 0 && <li className="text-sm text-muted-foreground">Aucune publication.</li>}
            {data.posts.map((p) => (
              <li key={p.id}><button className="min-h-11 w-full rounded-lg bg-muted p-2 text-left text-sm" onClick={() => onOpen(p.id)}>
                <span className="block text-xs text-muted-foreground">{when(p.posted_at)} · {p.likes} J’aime · {p.comments} commentaire(s)</span>
                <span className="line-clamp-3 break-words">{p.body || p.repost?.body}</span>
              </button></li>
            ))}
          </ul>
        </>}
      </DialogContent>
    </Dialog>
  );
}

function Moderation() {
  const { data = [] } = useQuery(civiModerationQuery);
  const { refresh } = useCivi();
  const mod = useMutation({ mutationFn: civiModerate, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  return (
    <section className="rounded-xl border border-primary/40 bg-card p-3">
      <h2 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" />Modération ({data.length})</h2>
      {data.length === 0 && <p className="text-sm text-muted-foreground">Aucune publication masquée.</p>}
      <ul className="mt-2 space-y-2">
        {data.map((p) => (
          <li key={p.id} className="rounded-lg bg-muted p-2 text-sm">
            <p><strong>{p.author_label}</strong> — {p.body}</p>
            <p className="text-xs text-muted-foreground">Motifs : {(p.reports ?? []).join(', ')}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button className="min-h-11" variant="outline" onClick={() => mod.mutate({ post: p.id, decision: 'retablir' })}>Rétablir</Button>
              <Button className="min-h-11" variant="destructive" onClick={() => mod.mutate({ post: p.id, decision: 'supprimer' })}>Supprimer</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
