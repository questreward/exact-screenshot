import { CharacterAvatar } from "./CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import type { IdentityCardData } from "@/services/game";

const SIG_STYLE: Record<string, React.CSSProperties> = {
  classique: { fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: "1.6rem" },
  penchee: { fontFamily: "'Segoe Script', 'Brush Script MT', cursive", fontStyle: "italic", transform: "skewX(-18deg)", fontSize: "1.4rem" },
  rapide: { fontFamily: "'Lucida Handwriting', cursive", fontSize: "1.2rem", letterSpacing: "-0.08em", transform: "rotate(-4deg)" },
  paraphe: { fontFamily: "'Brush Script MT', cursive", fontSize: "1.9rem", textDecoration: "underline wavy", textUnderlineOffset: "6px" },
};
export const SIGNATURE_LABELS: Record<string, string> = { classique: "Classique", penchee: "Penchée", rapide: "Rapide", paraphe: "Avec paraphe" };

/** Signature fictive CIVITAS, sans valeur juridique. */
export function FictionalSignature({ style, text, className }: { style: string | null; text: string | null; className?: string }) {
  if (!style || !text) return <span className={`text-xs italic text-muted-foreground ${className ?? ""}`}>Pas encore de signature</span>;
  return <span className={`inline-block text-foreground ${className ?? ""}`} style={SIG_STYLE[style]}>{text}</span>;
}

const d = (s: string) => new Date(s).toLocaleDateString("fr-FR");

/** Carte d'identité clairement fictive : identité CIVITAS, mention visible, aucun élément officiel. */
export function IdentityCard({ card }: { card: IdentityCardData }) {
  const mrz = `CIVITAS<<${card.last_name.toUpperCase()}<<${card.first_name.toUpperCase()}`.replace(/[^A-Z<]/g, "<").padEnd(36, "<").slice(0, 36);
  return <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-border bg-gradient-card shadow-card" style={{ aspectRatio: "1.586" }}>
    {/* filigrane */}
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <span className="rotate-[-18deg] whitespace-nowrap font-heading text-3xl font-black tracking-widest text-primary/10">DOCUMENT FICTIF — CIVITAS</span>
    </div>
    <div className="flex items-center justify-between bg-secondary px-3 py-1.5 text-secondary-foreground">
      <span className="font-heading text-[11px] font-bold tracking-wider">CIVITAS · CARTE D'IDENTITÉ DU JEU</span>
      <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">FICTIF</span>
    </div>
    <div className="relative grid grid-cols-[30%_1fr] gap-3 p-3">
      <div className="space-y-1">
        <div className="aspect-[3/4] overflow-hidden rounded-md border border-border bg-muted">
          <CharacterAvatar appearance={normalizeAppearance(card.appearance)} photo={card.use_photo ? card.photo : null} />
        </div>
        <p className="text-center text-[8px] text-muted-foreground">N° {card.doc_number}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] leading-tight sm:text-xs">
        <div className="col-span-2"><dt className="text-[8px] uppercase text-muted-foreground">Nom</dt><dd className="font-bold uppercase">{card.last_name}</dd></div>
        <div className="col-span-2"><dt className="text-[8px] uppercase text-muted-foreground">Prénom</dt><dd className="font-bold">{card.first_name}</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">Né(e) le</dt><dd className="font-semibold">{d(card.birth_date)}</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">Âge</dt><dd className="font-semibold">{card.age} ans</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">À</dt><dd className="font-semibold">{card.birth_city}</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">Réside à</dt><dd className="font-semibold">{card.city}</dd></div>
        <div className="col-span-2"><dt className="text-[8px] uppercase text-muted-foreground">Nationalité (jeu)</dt><dd className="font-semibold">{card.nationality}</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">Délivrée le</dt><dd className="font-semibold">{d(card.issued_at)}</dd></div>
        <div><dt className="text-[8px] uppercase text-muted-foreground">Expire le</dt><dd className={`font-semibold ${card.expired ? "text-destructive" : ""}`}>{d(card.expires_at)}</dd></div>
        <div className="col-span-2 border-t border-border pt-1"><dt className="text-[8px] uppercase text-muted-foreground">Signature (fictive)</dt>
          <dd className="h-7 overflow-hidden"><FictionalSignature style={card.signature_style} text={card.signature_text} /></dd></div>
      </dl>
    </div>
    <div className="absolute inset-x-0 bottom-0 bg-muted px-3 py-1 font-mono text-[9px] tracking-widest text-muted-foreground">
      <div>{mrz}</div><div>ID-CIVITAS {card.civitas_id} · DOCUMENT FICTIF</div>
    </div>
  </div>;
}
