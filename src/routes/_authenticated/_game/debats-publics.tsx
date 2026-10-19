import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, LoaderCircle, MessagesSquare, Plus, ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { forumAction, forumsQuery, type Forum, type ForumPost } from "@/services/game";
import { gameMeta } from "@/game/metadata";
import { POST_LABELS, TOPIC_LABELS, threadPosts } from "@/game/opinion";
import { PlayerFace } from "@/components/game/CivicProfileCard";

export const Route = createFileRoute("/_authenticated/_game/debats-publics")({
  head: () => ({ meta: gameMeta("Débats publics", "Débattez d'une loi, d'un projet, d'une crise ou d'une élection avec les joueurs de votre ville.") }),
  component: ForumsPage,
});

const refresh = (qc: ReturnType<typeof useQueryClient>) => qc.invalidateQueries({ queryKey: ["forums"] });

function ForumsPage() {
  const { data, isLoading, isError } = useQuery(forumsQuery(null));
  const [open, setOpen] = useState<Forum | null>(null);
  const [creating, setCreating] = useState(false);
  if (open) return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24"><ForumView forum={open} onBack={() => setOpen(null)} /></div>;
  return <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24">
    <header className="flex items-center gap-3"><MessagesSquare className="h-8 w-8 text-primary" />
      <div><h1 className="font-heading text-2xl font-bold">Débats publics</h1><p className="text-sm text-muted-foreground">Chacun donne sa position. Personne n'arbitre qui a raison.</p></div></header>
    {isLoading && <LoaderCircle className="mx-auto animate-spin text-primary" />}
    {isError && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Débats publics : Disponible dans une prochaine étape.</p>}
    {data && (creating ? <NewForum onDone={() => setCreating(false)} /> : <Button className="h-12 w-full" onClick={() => setCreating(true)}><Plus /> Ouvrir un débat</Button>)}
    {data && (data.forums.length === 0 ? <p className="text-sm text-muted-foreground">Aucun débat dans ta ville. Lance le premier !</p>
      : data.forums.map(f => <button key={f.id} type="button" onClick={() => setOpen(f)} className="w-full rounded-xl border border-border bg-card p-3 text-left">
        <p className="text-xs text-muted-foreground">{TOPIC_LABELS[f.topic_kind]} · par {f.author} · {f.open ? "ouvert" : "clos"}</p>
        <p className="font-semibold">{f.title}</p><p className="text-xs text-muted-foreground">{f.posts} intervention(s)</p>
      </button>))}
  </div>;
}

function NewForum({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("projet");
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const send = async () => {
    try { await forumAction("create", { topic_kind: kind, title, context }); await refresh(qc); toast.success("Débat ouvert"); onDone(); }
    catch (e) { toast.error((e as Error).message); }
  };
  return <div className="space-y-3 rounded-xl border border-border bg-card p-4">
    <div className="grid grid-cols-2 gap-2">{Object.entries(TOPIC_LABELS).map(([k, l]) => <Button key={k} className="h-11" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{l}</Button>)}</div>
    <Input className="h-11 text-base" maxLength={140} placeholder="Sujet du débat (10 caractères minimum)" value={title} onChange={e => setTitle(e.target.value)} />
    <Textarea maxLength={600} placeholder="Contexte (facultatif)" value={context} onChange={e => setContext(e.target.value)} />
    <Button className="h-12 w-full" disabled={title.trim().length < 10} onClick={send}>Ouvrir le débat</Button>
  </div>;
}

function Post({ p, forum, onReply }: { p: ForumPost; forum: Forum; onReply?: () => void }) {
  const qc = useQueryClient();
  const react = async (kind: string) => {
    try { await forumAction("react", { post_id: p.id, kind: p.my_reaction === kind ? "" : kind }); await refresh(qc); } catch (e) { toast.error((e as Error).message); }
  };
  return <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center gap-2"><PlayerFace id={p.author_id} name={p.author} size="h-8 w-8" />
      <p className="text-sm font-semibold">{p.mine ? "Vous" : p.author}</p><span className="rounded-full bg-muted px-2 text-[11px]">{POST_LABELS[p.kind]}</span></div>
    <p className="mt-2 whitespace-pre-wrap text-sm">{p.body}</p>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button size="sm" variant={p.my_reaction === "soutien" ? "default" : "outline"} className="h-10" disabled={p.mine || !forum.open} onClick={() => react("soutien")}><ThumbsUp className="h-4 w-4" /> Soutenir {p.soutiens}</Button>
      <Button size="sm" variant={p.my_reaction === "critique" ? "default" : "outline"} className="h-10" disabled={p.mine || !forum.open} onClick={() => react("critique")}><ThumbsDown className="h-4 w-4" /> Critiquer {p.critiques}</Button>
      {onReply && forum.open && <Button size="sm" variant="ghost" className="h-10" onClick={onReply}>Répondre</Button>}
    </div>
  </div>;
}

function ForumView({ forum, onBack }: { forum: Forum; onBack: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ ...forumsQuery(forum.id), refetchInterval: 15_000 });
  const [kind, setKind] = useState<"position" | "question">("position");
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ForumPost | null>(null);
  const send = async () => {
    try { await forumAction("post", { forum_id: forum.id, kind: replyTo ? "reponse" : kind, parent_id: replyTo?.id, body }); setBody(""); setReplyTo(null); await refresh(qc); }
    catch (e) { toast.error((e as Error).message); }
  };
  return <div className="space-y-3">
    <Button variant="ghost" className="h-11" onClick={onBack}><ChevronLeft className="h-5 w-5" /> Retour</Button>
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{TOPIC_LABELS[forum.topic_kind]} · {forum.open ? `ouvert jusqu'au ${new Date(forum.closes_at).toLocaleDateString("fr-FR")}` : "clos"}</p>
      <h2 className="font-heading text-lg font-bold">{forum.title}</h2>{forum.context && <p className="mt-1 text-sm">{forum.context}</p>}
    </div>
    {!data?.posts ? <LoaderCircle className="mx-auto animate-spin text-primary" /> : data.posts.length === 0 ? <p className="text-sm text-muted-foreground">Aucune intervention. Donne la première position !</p>
      : threadPosts(data.posts).map(({ post, replies }) => <div key={post.id} className="space-y-2">
        <Post p={post} forum={forum} onReply={() => setReplyTo(post)} />
        {replies.length > 0 && <div className="ml-6 space-y-2 border-l-2 border-border pl-3">{replies.map(r => <Post key={r.id} p={r} forum={forum} />)}</div>}
      </div>)}
    {forum.open && <div className="sticky bottom-20 space-y-2 rounded-xl border border-border bg-card p-3 shadow-card">
      {replyTo ? <p className="flex items-center justify-between text-sm">Réponse à {replyTo.author}<Button size="sm" variant="ghost" className="h-9" onClick={() => setReplyTo(null)}>Annuler</Button></p>
        : <div className="grid grid-cols-2 gap-2">{(["position", "question"] as const).map(k => <Button key={k} className="h-10" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>{k === "position" ? "Ma position" : "Poser une question"}</Button>)}</div>}
      <Textarea maxLength={600} placeholder="Ton intervention (10 caractères minimum)" value={body} onChange={e => setBody(e.target.value)} />
      <Button className="h-12 w-full" disabled={body.trim().length < 10} onClick={send}>Publier</Button>
    </div>}
  </div>;
}
