import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { gameMeta } from '@/game/metadata';
import { postQuery, postAction, networkQuery } from '@/services/game';
import { postageLabel } from '@/game/post';

export const Route = createFileRoute('/_authenticated/_game/la-poste')({
  head: () => ({ meta: gameMeta('La Poste — FICTIF', 'Votre boîte aux lettres et vos recommandés dans CIVITAS.') }),
  loader: async ({ context: { queryClient: q } }) => { await Promise.all([q.ensureQueryData(postQuery), q.ensureQueryData(networkQuery)]); },
  component: PostPage,
});
function PostPage() {
  const { data } = useSuspenseQuery(postQuery);
  const { data: network } = useSuspenseQuery(networkQuery);
  const q = useQueryClient();
  const [tab, setTab] = useState('inbox'); const [target, setTarget] = useState('');
  const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [request, setRequest] = useState(() => crypto.randomUUID());
  async function act(fn: 'post_send' | 'post_update', args: Record<string, unknown>) {
    setBusy(true); setMessage('');
    try { const next = await postAction(fn, args); q.setQueryData(postQuery.queryKey, next); if (fn === 'post_send') { setSubject(''); setBody(''); setRequest(crypto.randomUUID()); setMessage('Courrier envoyé.'); await q.invalidateQueries({ queryKey: ['character'] }); } }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Opération impossible.'); } finally { setBusy(false); }
  }
  const button = 'min-h-11 rounded-md border border-border bg-background px-4 py-2 text-foreground disabled:opacity-50';
  return <div className="-mx-4 -mt-4 min-h-screen bg-background pb-24 sm:mx-0 sm:mt-0">
    <header className="border-b-4 border-primary bg-secondary px-4 py-5 text-secondary-foreground"><div className="mx-auto max-w-3xl"><h1 className="font-heading text-2xl font-bold">La Poste</h1><p className="text-sm">Mon espace courrier · FICTIF · Aucun service postal réel</p>
      <nav aria-label="Courrier" className="mt-4 flex flex-wrap gap-2">{[['inbox','Boîte aux lettres'],['archive','Archives'],['send','Écrire']].map(([id,label]) => <button className={button} key={id} aria-pressed={tab===id} onClick={() => setTab(id)}>{label}</button>)}</nav></div></header>
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-5"><p className="text-sm text-muted-foreground">Recommandés : retrait sous 15 jours du jeu. La première présentation vaut réception, même sans retrait.</p>
      <p role="status" className="text-sm">{message}</p>
      {tab==='send' ? <form className="space-y-4 rounded-xl border border-border bg-card p-4 text-card-foreground" onSubmit={e => { e.preventDefault(); void act('post_send', { _target: target, _subject: subject, _body: body, _registered: registered, _request_id: request }); }}>
        <h2 className="text-lg font-semibold">Envoyer un courrier</h2><label className="block">Contact<select required value={target} onChange={e=>setTarget(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-input bg-background p-2"><option value="">Choisir un contact</option>{network.contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="block">Objet<input required maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-input bg-background p-2" /></label>
        <label className="block">Message<textarea required maxLength={4000} value={body} onChange={e=>setBody(e.target.value)} className="mt-1 min-h-40 w-full rounded border border-input bg-background p-2" /></label>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={registered} onChange={e=>setRegistered(e.target.checked)} />Recommandé</label>
        <p>{registered ? 'Recommandé' : 'Lettre verte'} : {postageLabel(registered)} · 10 envois par jour maximum.</p><p className="text-sm text-muted-foreground">Le jeu débite des euros entiers : le total cumulé est arrondi au supérieur et les centimes prépayés sont conservés pour les prochains envois.</p>
        <button disabled={busy || !target} className={button}>Payer et envoyer</button>
      </form> : <>{data.letters.filter(l=>l.archived===(tab==='archive')).length===0 && <p>Aucun courrier ici.</p>}{data.letters.filter(l=>l.archived===(tab==='archive')).map(l=><article key={l.id} className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground"><p className="text-sm text-muted-foreground">{l.sender} · {new Date(l.presented_at).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}</p><h2 className={`text-lg ${l.read_at ? '' : 'font-bold'}`}>{l.subject}{!l.read_at && ' · Non lu'}</h2><p>{l.status}</p><p className="whitespace-pre-wrap break-words">{l.body}</p><div className="flex flex-wrap gap-2">{l.status==='à retirer' && <button disabled={busy} className={button} onClick={()=>void act('post_update',{_id:l.id,_action:'collect'})}>Retirer le recommandé</button>}<button disabled={busy} className={button} onClick={()=>void act('post_update',{_id:l.id,_action:l.read_at?'unread':'read'})}>{l.read_at?'Marquer non lu':'Marquer lu'}</button><button disabled={busy} className={button} onClick={()=>void act('post_update',{_id:l.id,_action:l.archived?'restore':'archive'})}>{l.archived?'Restaurer':'Archiver'}</button></div></article>)}</>}
    </main></div>;
}
