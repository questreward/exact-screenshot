import { type Appearance, optionValue } from "@/game/appearance";
import type { Mood } from "@/game/character-look";
import { cn } from "@/lib/utils";

type Uniform = "pompiers" | "police" | "gendarmerie" | "samu" | "protection_civile";
const UNIFORM_COLOR: Record<Uniform, string> = {
  pompiers: "#1f2a44", police: "#1d3a6e", gendarmerie: "#14234a", samu: "#f4f4f4", protection_civile: "#f28c28",
};

// Simple layered SVG avatar. New appearance options plug in by id.
export type StyleLook = { cadre?: string; tenue?: string; fond?: string; badge?: string };
export function CharacterAvatar({ appearance, className, photo, mood = "neutre", uniform, look }: { appearance: Appearance; className?: string | undefined; photo?: string | null | undefined; mood?: Mood; uniform?: Uniform | null | undefined; look?: StyleLook | undefined }) {
  if (photo) return <img src={photo} alt="" className={cn("h-full w-full object-cover", className)} />;
  const skin = optionValue("skin", appearance.skin);
  const hair = optionValue("hairColor", appearance.hairColor);
  const styled = look?.tenue === "tenue-costume" ? "#26303f" : look?.tenue === "tenue-sport" ? "#c0392b" : look?.tenue === "tenue-soiree" ? "#111111" : null;
  const outfit = uniform ? UNIFORM_COLOR[uniform] : styled ?? optionValue("outfit", appearance.outfit);
  const shoulder = appearance.silhouette === "slim" ? 34 : appearance.silhouette === "broad" ? 46 : 40;

  return (
    <svg viewBox="0 0 120 140" className={cn("h-full w-full", className)} aria-hidden>
      <defs>
        <radialGradient id="av-bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--surface)" />
        </radialGradient>
      </defs>
      <rect width="120" height="140" rx="22" fill="url(#av-bg)" />
      <StyleBackground fond={look?.fond} />
      <g className="avatar-alive">
      {/* body */}
      <path d={`M${60 - shoulder} 140 Q${60 - shoulder} 98 60 96 Q${60 + shoulder} 98 ${60 + shoulder} 140 Z`} fill={outfit} />
      {appearance.style === "chic" && <path d="M54 97 L60 116 L66 97 Z" fill="var(--foreground)" opacity="0.85" />}
      {appearance.style === "sport" && <path d={`M${60 - shoulder + 6} 112 H${60 + shoulder - 6}`} stroke="var(--foreground)" strokeWidth="3" opacity="0.6" />}
      {/* neck + head */}
      <rect x="53" y="80" width="14" height="18" rx="6" fill={skin} />
      {appearance.hair === "long" && <path d="M34 56 Q34 24 60 24 Q86 24 86 56 L88 96 L32 96 Z" fill={hair} />}
      <ellipse cx="60" cy="58" rx="22" ry="26" fill={skin} />
      {/* hair */}
      {appearance.hair === "short" && <path d="M38 54 Q38 30 60 30 Q82 30 82 54 Q74 40 60 40 Q46 40 38 54 Z" fill={hair} />}
      {appearance.hair === "long" && <path d="M38 56 Q38 30 60 30 Q82 30 82 56 Q72 38 60 40 Q48 38 38 56 Z" fill={hair} />}
      {appearance.hair === "curly" && (
        <g fill={hair}>
          {[40, 48, 56, 64, 72, 80].map((x) => <circle key={x} cx={x} cy={38 + Math.abs(60 - x) / 4} r="8" />)}
        </g>
      )}
      {appearance.hair === "bun" && (
        <g fill={hair}>
          <circle cx="60" cy="24" r="9" />
          <path d="M38 54 Q38 32 60 32 Q82 32 82 54 Q72 42 60 42 Q48 42 38 54 Z" />
        </g>
      )}
      {/* face */}
      <g className="avatar-eyes"><circle cx="52" cy="60" r="2.2" fill="var(--background)" />
      <circle cx="68" cy="60" r="2.2" fill="var(--background)" /></g>
      <path d={mood === "joyeux" ? "M52 70 Q60 78 68 70" : mood === "fatigue" ? "M54 74 Q60 70 66 74" : "M54 71 Q60 74 66 71"} stroke="var(--background)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {mood === "fatigue" && <g stroke="var(--background)" strokeWidth="1.2" opacity="0.6"><path d="M48 65 H56" /><path d="M64 65 H72" /></g>}
      {/* tenue de service */}
      {uniform && (uniform === "protection_civile" || uniform === "samu" || uniform === "pompiers") && (
        <path d={`M${60 - shoulder + 4} 122 H${60 + shoulder - 4}`} stroke={uniform === "samu" ? "#d62828" : "#e8e8a0"} strokeWidth="4" />
      )}
      {uniform === "protection_civile" && <path d="M56 106 h8 v-4 h4 v8 h-4 v4 h-8 v-4 h-4 v-8 h4 z" fill="#1d3a6e" transform="translate(0 6)" />}
      {uniform === "pompiers" && <path d="M34 50 Q34 22 60 22 Q86 22 86 50 L90 52 H30 Z" fill="#d9d9d9" stroke="#999" />}
      {(uniform === "police" || uniform === "gendarmerie") && <path d="M36 44 Q36 30 60 28 Q84 30 84 44 Z M34 44 H86 V49 H34 Z" fill={UNIFORM_COLOR[uniform]} />}
      {/* accessory */}
      {(appearance.accessory === "glasses" || appearance.accessory === "sunglasses") && (
        <g stroke="var(--foreground)" strokeWidth="1.8" fill={appearance.accessory === "sunglasses" ? "var(--foreground)" : "none"}>
          <circle cx="52" cy="60" r="6" /><circle cx="68" cy="60" r="6" /><path d="M58 60 H62" fill="none" />
        </g>
      )}
      {appearance.accessory === "earrings" && <g fill="var(--primary)"><circle cx="37" cy="68" r="2.5" /><circle cx="83" cy="68" r="2.5" /></g>}
      {appearance.accessory === "cap" && <path d="M36 46 Q36 26 60 26 Q84 26 84 46 Z M80 44 H98 Q96 50 84 48 Z" fill="var(--primary)" />}
      {appearance.accessory === "scarf" && <path d="M44 92 Q60 102 76 92 L78 100 Q60 110 42 100 Z" fill="var(--primary)" />}
      {/* objets de style achetés */}
      {!uniform && look?.tenue === "tenue-costume" && <g><path d="M52 97 L60 120 L68 97 Z" fill="#f4f4f4" /><path d="M58 100 L60 118 L62 100 Z" fill="#8b1e2d" /></g>}
      {!uniform && look?.tenue === "tenue-sport" && <g stroke="#ffffff" strokeWidth="2.5"><path d={`M${60 - shoulder + 8} 108 L${60 - shoulder + 4} 140`} /><path d={`M${60 + shoulder - 8} 108 L${60 + shoulder - 4} 140`} /></g>}
      {!uniform && look?.tenue === "tenue-soiree" && <path d="M53 97 L60 101 L67 97 L67 105 L60 101 L53 105 Z" fill="#c9a227" />}
      </g>
      {look?.cadre === "cadre-or" && <rect x="2" y="2" width="116" height="136" rx="21" fill="none" stroke="#d4a72c" strokeWidth="4" />}
      {look?.cadre === "cadre-tricolore" && <g fill="none" strokeWidth="4"><path d="M23 2 H2 V138 H23" stroke="#1d3a8a" /><path d="M23 2 H97 M23 138 H97" stroke="#f4f4f4" /><path d="M97 2 H118 V138 H97" stroke="#d62828" /></g>}
      {look?.badge === "badge-pionnier" && <g transform="translate(100 20)"><circle r="11" fill="#d4a72c" /><path d="M0 -6 L2 -2 L6 -2 L3 1 L4 6 L0 3 L-4 6 L-3 1 L-6 -2 L-2 -2 Z" fill="#ffffff" /></g>}
    </svg>
  );
}

function StyleBackground({ fond }: { fond: string | undefined }) {
  if (fond === "fond-tour") return <g><rect width="120" height="140" rx="22" fill="#14213d" />
    {[[14, 20], [30, 12], [96, 16], [108, 34], [20, 44]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" fill="#ffffff" />)}
    <path d="M98 140 L104 90 L106 60 L108 90 L114 140 Z" fill="#e0b84a" opacity="0.8" /></g>;
  if (fond === "fond-mer") return <g><rect width="120" height="140" rx="22" fill="#7fc8d8" /><path d="M0 100 Q30 90 60 100 T120 100 V140 H0 Z" fill="#1f7a8c" /><path d="M0 60 L25 30 L45 60 Z M80 60 L105 25 L120 50 V60 Z" fill="#e8e1d0" /></g>;
  return null;
}
