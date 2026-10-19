import { type Appearance, optionValue } from "@/game/appearance";
import { cn } from "@/lib/utils";

// Simple layered SVG avatar. New appearance options plug in by id.
export function CharacterAvatar({ appearance, className, photo }: { appearance: Appearance; className?: string | undefined; photo?: string | null | undefined }) {
  if (photo) return <img src={photo} alt="" className={cn("h-full w-full object-cover", className)} />;
  const skin = optionValue("skin", appearance.skin);
  const hair = optionValue("hairColor", appearance.hairColor);
  const outfit = optionValue("outfit", appearance.outfit);
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
      <circle cx="52" cy="60" r="2.2" fill="var(--background)" />
      <circle cx="68" cy="60" r="2.2" fill="var(--background)" />
      <path d="M54 71 Q60 75 66 71" stroke="var(--background)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* accessory */}
      {(appearance.accessory === "glasses" || appearance.accessory === "sunglasses") && (
        <g stroke="var(--foreground)" strokeWidth="1.8" fill={appearance.accessory === "sunglasses" ? "var(--foreground)" : "none"}>
          <circle cx="52" cy="60" r="6" /><circle cx="68" cy="60" r="6" /><path d="M58 60 H62" fill="none" />
        </g>
      )}
      {appearance.accessory === "earrings" && <g fill="var(--primary)"><circle cx="37" cy="68" r="2.5" /><circle cx="83" cy="68" r="2.5" /></g>}
      {appearance.accessory === "cap" && <path d="M36 46 Q36 26 60 26 Q84 26 84 46 Z M80 44 H98 Q96 50 84 48 Z" fill="var(--primary)" />}
      {appearance.accessory === "scarf" && <path d="M44 92 Q60 102 76 92 L78 100 Q60 110 42 100 Z" fill="var(--primary)" />}
    </svg>
  );
}
