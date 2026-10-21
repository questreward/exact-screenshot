import { useEffect, useState } from "react";
import { Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Lien d'invitation : page publique « Découvrir » avec le prénom du personnage. Aucune donnée privée, aucune récompense.
export function InviteFriends({ firstName }: { firstName: string }) {
  const [link, setLink] = useState("");
  useEffect(() => {
    const u = new URL("/decouvrir", window.location.origin);
    u.searchParams.set("ami", firstName);
    u.searchParams.set("utm_source", "invitation");
    setLink(u.toString());
  }, [firstName]);
  const text = "Viens jouer à CIVITAS avec moi : commence à 16 ans, finis à l'Élysée. C'est gratuit !";
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "CIVITAS", text, url: link }); } catch { /* annulé */ } return; }
    copy();
  }
  async function copy() {
    try { await navigator.clipboard.writeText(`${text} ${link}`); toast.success("Lien copié !"); } catch { toast.error("Copie impossible."); }
  }
  return <section className="space-y-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
    <p className="font-heading font-semibold">Invite tes amis</p>
    <p className="text-sm text-muted-foreground">Partage ton lien : tes amis découvrent le jeu avec ton prénom.</p>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="min-h-12 flex-1" disabled={!link} onClick={share}><Share2 className="mr-2 h-4 w-4" />Partager</Button>
      <Button variant="outline" className="min-h-12 flex-1" disabled={!link} onClick={copy}><Copy className="mr-2 h-4 w-4" />Copier le lien</Button>
    </div>
  </section>;
}
