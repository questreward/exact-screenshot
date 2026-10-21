import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/** Stylised facade by housing type (presentation only). */
export function Facade({ type, className = "" }: { type: string; className?: string }) {
  const house = type === "house";
  const floors = house ? 2 : type === "flat" ? 4 : 3;
  return <svg viewBox="0 0 200 120" className={`block w-full ${className}`} aria-hidden="true">
    <rect width="200" height="120" fill="var(--secondary)" />
    <rect y="100" width="200" height="20" fill="var(--muted)" />
    {house ? <>
      <path d="M50 55L100 22L150 55Z" fill="var(--primary)" />
      <rect x="58" y="55" width="84" height="45" fill="var(--card)" stroke="var(--border)" />
      <rect x="92" y="74" width="16" height="26" fill="var(--primary)" opacity=".8" />
      <rect x="66" y="64" width="16" height="14" fill="var(--chart-3)" opacity=".6" /><rect x="118" y="64" width="16" height="14" fill="var(--chart-3)" opacity=".6" />
      <circle cx="30" cy="85" r="14" fill="var(--success)" opacity=".6" />
    </> : <>
      <rect x="55" y={100 - floors * 20} width="90" height={floors * 20} fill="var(--card)" stroke="var(--border)" />
      {Array.from({ length: floors * 3 }, (_, i) => <rect key={i} x={63 + (i % 3) * 27} y={104 - floors * 20 + Math.floor(i / 3) * 20} width="18" height="11" fill="var(--chart-3)" opacity=".55" />)}
      <rect x="92" y="88" width="16" height="12" fill="var(--primary)" opacity=".8" />
    </>}
  </svg>;
}

type Listing = { title: string; type: string; type_id: string; surface: number; floor: number; dpe: string; monthly: number };
/** Visual visit of a listing before deciding. */
export function VisitSheet({ r, open, onOpenChange, action }: { r: Listing; open: boolean; onOpenChange: (o: boolean) => void; action: React.ReactNode }) {
  const rooms = Math.max(1, Math.round(r.surface / 18));
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
      <SheetHeader><SheetTitle>🏠 Visite : {r.title}</SheetTitle></SheetHeader>
      <div className="mt-3 space-y-3">
        <div className="overflow-hidden rounded-xl"><Facade type={r.type_id} /></div>
        <div className="flex flex-wrap gap-2 text-xs">{[r.type, `${r.surface} m²`, `environ ${rooms} pièce(s)`, `étage ${r.floor}`, `DPE ${r.dpe}`].map(t => <span key={t} className="rounded-full bg-muted px-3 py-1">{t}</span>)}</div>
        <div className="grid grid-cols-2 gap-2">{Array.from({ length: Math.min(rooms, 4) }, (_, i) => <div key={i} className="flex aspect-video items-center justify-center rounded-lg bg-surface text-2xl">{["🛋️", "🛏️", "🍳", "🚿"][i]}</div>)}</div>
        <p className="text-xs text-muted-foreground">Aperçu illustratif : le logement est livré vide, tu y installes tes propres meubles.</p>
        <p className="font-display text-xl font-bold">{r.monthly.toLocaleString("fr-FR")} € / mois</p>
        {action}
      </div>
    </SheetContent>
  </Sheet>;
}

/** Old home → moving → new home, then keys / welcome. */
export function MoveMoment({ kind, from, to, onClose }: { kind: "rent" | "own"; from: string | null; to: string; onClose: () => void }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => { const t = [setTimeout(() => setPhase(1), 900), setTimeout(() => setPhase(2), 2200)]; return () => t.forEach(clearTimeout); }, []);
  return <Sheet open onOpenChange={o => { if (!o) onClose(); }}>
    <SheetContent side="bottom" className="rounded-t-2xl">
      <SheetHeader><SheetTitle>{phase < 2 ? "🚚 Déménagement" : kind === "rent" ? "🔑 Tes nouvelles clés" : "🏠 Bienvenue chez toi"}</SheetTitle></SheetHeader>
      <div className="my-4 flex items-center justify-between gap-2 text-center text-sm">
        <div className={`flex-1 ${phase > 0 ? "opacity-40" : ""}`}><p className="text-3xl">🏚️</p><p>{from ?? "Ancien logement"}</p></div>
        <p className={`text-3xl transition-transform duration-1000 ${phase >= 1 ? "translate-x-4" : "-translate-x-4"}`}>🚚</p>
        <div className={`flex-1 ${phase >= 2 ? "" : "opacity-40"}`}><p className="text-3xl">🏡</p><p>{to}</p></div>
      </div>
      {phase >= 2 && <div className="space-y-3 animate-page">
        <p className="text-center text-sm">{kind === "rent" ? "Le bail est signé, les clés sont à toi." : "Tu habites maintenant ce logement dont tu es propriétaire."} Tes meubles te suivent selon les règles de l'aménagement.</p>
        <Button asChild className="min-h-14 w-full text-base"><Link to="/chez-moi">Entrer dans mon logement</Link></Button>
        <Button variant="ghost" className="min-h-12 w-full" onClick={onClose}>Plus tard</Button>
      </div>}
    </SheetContent>
  </Sheet>;
}
